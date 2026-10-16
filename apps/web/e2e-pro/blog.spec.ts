import { readFile } from 'node:fs/promises';
import { chemins } from '@ph/firebase/chemins';
import { expect, test, type Page } from '@playwright/test';
import { admin, COMPTES, connecter, entrepriseDe } from './outils';

// docs/BLOG.md §8 : BLOG-01, BLOG-04, BLOG-08 à l'écran (05, 06, 07, 09 : tests/blog.test.ts).
const PARAMS = {
  raisonSociale: 'Proprio E2E SARL',
  adresseSiege: '1 rue du Test, 33000 Bordeaux',
  siret: '73282932000074',
  franchiseTva: false,
  tvaSurDebits: false,
  assuranceDecennale: { assureur: 'SMABTP', contrat: 'E2E-1', zone: 'France' },
  mediateur: { nom: 'Médiateur du bâtiment', adresse: 'Paris' },
  delaiPaiementJours: 30,
};
const META =
  'Combien coûte une pompe à chaleur à Bordeaux ? Prix posés, aides et conseils pour choisir votre installateur. Devis gratuit et rapide.';
const TITRE = 'Pompe à chaleur à Bordeaux : prix et aides e2e';

/** Site du compte (créé par l'écran s'il n'existe pas) et paramètres de facturation complets. */
async function preparer(page: Page): Promise<() => Promise<void>> {
  const { db } = await admin();
  const id = await entrepriseDe(COMPTES.proprio);
  const ref = db.doc(chemins.parametresFacturation(id));
  const avant = (await ref.get()).data();
  await ref.set(PARAMS);
  await db.recursiveDelete(db.doc(chemins.articleBlog(id, '_')).parent);
  await db.recursiveDelete(db.doc(chemins.categorieBlog(id, '_')).parent);
  await connecter(page, COMPTES.proprio, '/pro/site?onglet=blog');
  if (!(await db.doc(chemins.site(id)).get()).exists) {
    await page.getByLabel(/^Adresse de votre site/).fill('proprio-e2e-blog');
    await page.getByRole('button', { name: 'Créer mon site' }).click();
    await expect(page.getByRole('link', { name: 'Pages' })).toBeVisible();
    await page.goto('/pro/site?onglet=blog');
  }
  return async () => {
    if (avant) await ref.set(avant);
    else await ref.delete();
  };
}

test.describe('Blog des artisans', () => {
  test.describe.configure({ mode: 'serial', timeout: 120_000 });

  test('BLOG-04 : méta vide → Publier refusé, onglet SEO ; BLOG-08 : export CSV', async ({
    page,
  }) => {
    const restaurer = await preparer(page);
    try {
      await page.getByRole('link', { name: 'Catégories et tags' }).click();
      await page.getByLabel('Nouvelle catégorie').fill('Chauffage');
      await page.getByRole('button', { name: 'Ajouter' }).first().click();
      await expect(page.getByLabel('Nom de la catégorie Chauffage')).toBeVisible();

      await page.goto('/pro/site/blog/nouveau');
      await page.getByLabel('Titre', { exact: true }).fill(TITRE);
      await page.getByLabel('Texte alternatif').fill('Pompe à chaleur posée à Bordeaux');
      await page.getByRole('textbox', { name: 'Texte de l’article' }).click();
      await page.keyboard.type('La pompe à chaleur chauffe toute la maison. Voici nos repères.');
      await page.getByRole('button', { name: 'Mots-clés' }).click();
      await page.getByLabel('Mot-clé principal').fill('pompe à chaleur');

      // Méta-description vide : publication refusée, l'onglet SEO montre le point bloquant.
      await page.getByRole('button', { name: 'Publier', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Obligatoire pour publier' })).toBeVisible();
      await expect(page.getByText('Méta-description de 120 à 160 caractères')).toBeVisible();
      const { db } = await admin();
      const id = await entrepriseDe(COMPTES.proprio);
      expect((await db.doc(chemins.articleBlog(id, '_')).parent.get()).size).toBe(0);

      await page.getByLabel('Méta-description').fill(META);
      await expect(page.getByText('Prêt à être publié')).toBeVisible();
      await page.getByRole('button', { name: 'Publier', exact: true }).click();
      await expect(page.getByText('Article publié : il apparaît sur votre site.')).toBeVisible();
      await expect(page).toHaveURL(/\/pro\/site\/blog\/[A-Za-z0-9]+$/);

      await page.getByRole('link', { name: '← Blog' }).click();
      const ligne = page.getByRole('list', { name: 'Articles' }).getByRole('listitem');
      await expect(ligne).toHaveCount(1);
      await expect(ligne).toContainText(TITRE);
      await expect(ligne).toContainText('Publié');

      const telechargement = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Export CSV' }).click();
      const csv = await readFile((await (await telechargement).path())!, 'utf8');
      const lignes = csv.split('\r\n');
      expect(lignes[0]).toBe(
        '﻿Titre;Adresse;Statut;Catégorie;Tags;Date;Vues;Auteur;Rédigé avec l’IA',
      );
      expect(lignes[1]).toContain(`${TITRE};`);
      expect(lignes[1]).toContain(';Publié;Chauffage;');

      // Sur le site de l'artisan : page de l'article, mentions lues en direct (BLOG-05), RSS.
      const site = db.doc(chemins.site(id));
      if (!(await site.get()).get('versionPubliee'))
        expect(
          await page.evaluate(() =>
            fetch('/api/pro/site/publier', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: '{}',
            }).then((r) => r.status),
          ),
        ).toBe(200);
      const hote = `http://${(await site.get()).get('sousDomaine') as string}.localhost:3200`;
      const slug = (await db.doc(chemins.articleBlog(id, '_')).parent.get()).docs[0]!.get('slug');
      await expect(async () => {
        const r = await page.goto(`${hote}/blog/${slug}`);
        expect(r?.status()).toBe(200);
        await expect(page.getByRole('heading', { name: TITRE })).toBeVisible({ timeout: 1000 });
      }).toPass({ timeout: 60_000 });
      await expect(page.getByText('SMABTP, contrat E2E-1, France')).toBeVisible();
      await db
        .doc(chemins.parametresFacturation(id))
        .update({ 'assuranceDecennale.contrat': 'E2E-2' });
      await page.reload();
      await expect(page.getByText('SMABTP, contrat E2E-2, France')).toBeVisible();
      expect(await page.locator('script[type="application/ld+json"]').textContent()).toContain(
        '"@type":"BlogPosting"',
      );
      await expect(async () => {
        await page.goto(`${hote}/blog`);
        await expect(page.getByRole('link', { name: new RegExp(TITRE) })).toBeVisible({
          timeout: 1000,
        });
      }).toPass({ timeout: 60_000 });
      // Même origine que le site (Node ne résout pas *.localhost).
      const rss = await page.evaluate(() =>
        fetch('/blog/rss.xml').then(async (r) => ({
          type: r.headers.get('content-type') ?? '',
          texte: await r.text(),
        })),
      );
      expect(rss.type).toContain('application/rss+xml');
      expect(rss.texte).toContain(`/blog/${slug}</link>`);
    } finally {
      await restaurer();
    }
  });

  test('BLOG-01 : sans Site Pro, « Écrire un article » ouvre la fenêtre d’offre, rien n’est créé', async ({
    page,
  }) => {
    const { db } = await admin();
    const id = await entrepriseDe(COMPTES.proprio);
    const artisan = db.doc(chemins.artisan(id));
    const droits = (await artisan.get()).get('droits') as Record<string, unknown>;
    await artisan.update({ 'droits.formule': 'fiche_pro', 'droits.sitePro': false });
    try {
      await connecter(page, COMPTES.proprio, '/pro/site?onglet=blog');
      await expect(page.getByText('Le blog est inclus dans Site Pro et Tout inclus')).toBeVisible();
      await page.getByRole('button', { name: 'Écrire un article' }).click();
      await expect(page.getByRole('dialog')).toContainText('Site Pro');
      await page.getByRole('button', { name: 'Plus tard' }).click();
      // Accès direct à l'éditeur : retour à l'onglet Blog.
      await page.goto('/pro/site/blog/nouveau');
      await expect(page).toHaveURL(/onglet=blog/);
    } finally {
      await artisan.update({ droits });
    }
  });
});
