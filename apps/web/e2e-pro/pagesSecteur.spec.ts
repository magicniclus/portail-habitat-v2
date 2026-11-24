import { collections } from '@ph/firebase/chemins';
import { expect, test, type Page } from '@playwright/test';
import { admin } from './outils';

/**
 * Pages de secteur « métier à une commune » (SEO local, décision du 24/11/2026) : indexée
 * seulement si la page est au registre, indexable, avec au moins un artisan affiché ; annuaire
 * complet (filtres, tri, résultats) ; texte IA contrôlé avec ses sources ; liens vers les seules
 * pages indexées. Le registre est écrit ici comme le feraient le déclencheur et l'IA.
 */
const COMMUNES = {
  cenon: { nom: 'Cenon', codePostal: '33150', population: 24_000, lat: 44.8571, lon: -0.5312 },
  lormont: { nom: 'Lormont', codePostal: '33310', population: 23_000, lat: 44.8792, lon: -0.5217 },
  floirac: { nom: 'Floirac', codePostal: '33270', population: 18_000, lat: 44.8361, lon: -0.5278 },
};
const INSEE = 'https://www.insee.fr/fr/statistiques/2011101?geo=COM-33119';

async function page(slug: keyof typeof COMMUNES, o: { indexable: boolean; texte?: boolean }) {
  const { db, Timestamp } = await admin();
  const c = COMMUNES[slug];
  const t = Timestamp.fromDate(new Date('2026-11-24T10:00:00Z'));
  await db.doc(`${collections.pagesSecteur}/plombier__${slug}`).set({
    schemaVersion: 1,
    metier: 'plombier',
    commune: {
      nom: c.nom,
      slug,
      codePostal: c.codePostal,
      departement: '33',
      population: c.population,
      centre: { latitude: c.lat, longitude: c.lon },
    },
    geohash: 'ezzz',
    nbArtisans: o.indexable ? 3 : 0,
    indexable: o.indexable,
    bloquee: false,
    texteEtat: o.texte ? 'pret' : 'absent',
    texteEssais: 0,
    creeeLe: t,
    majLe: t,
    ...(o.texte
      ? {
          texteModele: 'claude-sonnet-5-5',
          texteGenereLe: t,
          texte: {
            intro: `Vous cherchez un plombier à ${c.nom} ? Maisons de ville anciennes et résidences récentes s’y côtoient : rénovation de salle de bains, remplacement de chauffe-eau, dépannages.`,
            sections: [
              {
                titre: `Les travaux de plomberie fréquents à ${c.nom}`,
                paragraphes: [
                  'Dans les maisons anciennes, les canalisations en plomb ou en acier galvanisé sont souvent à remplacer ; les appartements récents demandent surtout des dépannages.',
                ],
              },
              {
                titre: 'Bien choisir son plombier',
                paragraphes: [
                  'Comparez les fiches, les réalisations et les avis vérifiés, puis demandez au moins deux devis détaillés pour le même projet.',
                ],
              },
              {
                titre: 'Le parc de logements de la commune',
                paragraphes: [
                  'Une part importante des logements date d’avant 1975, selon les données publiques de l’Insee.',
                ],
              },
            ],
            faq: [
              {
                q: `Comment trouver un plombier à ${c.nom} ?`,
                r: 'Comparez les fiches des plombiers du secteur et contactez-les gratuitement.',
              },
              {
                q: 'Faut-il plusieurs devis ?',
                r: 'Oui, comparer au moins deux devis détaillés aide à choisir au juste prix.',
              },
              {
                q: 'Les artisans sont-ils vérifiés ?',
                r: 'Oui, leur SIRET est contrôlé et les avis affichés sont vérifiés.',
              },
              {
                q: 'Le contact est-il gratuit ?',
                r: 'Oui, contacter un artisan ou demander un devis est gratuit et sans engagement.',
              },
            ],
            faits: [
              {
                texte: `Une part importante des logements de ${c.nom} date d’avant 1975.`,
                source: INSEE,
              },
            ],
          },
        }
      : {}),
  });
}

/** Contenu de la balise robots, `''` si la page n'en a pas (indexable). */
async function robots(p: Page): Promise<string> {
  const m = p.locator('meta[name="robots"]');
  return (await m.count()) ? ((await m.first().getAttribute('content')) ?? '') : '';
}

test.describe('Pages de secteur métier × commune', () => {
  // Premier rendu de la page (communes, annuaire, registre) : plus lent que les suivants (cache).
  test.setTimeout(90_000);
  test.beforeAll(async () => {
    await page('cenon', { indexable: true, texte: true });
    await page('floirac', { indexable: false });
  });

  test('au registre, indexable, avec artisans : indexée ; annuaire complet ; texte IA et sources', async ({
    page: p,
  }) => {
    await p.goto('/metiers/plombier/cenon');
    await expect(p.locator('h1')).toHaveText('Plombier à Cenon');
    expect((await robots(p)) ?? '').not.toMatch(/noindex/);
    await expect(p.getByText(/Maisons de ville anciennes et résidences récentes/)).toBeVisible();
    await expect(
      p.getByRole('complementary', { name: 'Sources' }).getByRole('link'),
    ).toHaveAttribute('href', INSEE);
    // L'annuaire : nombre de résultats, tri et filtres (colonne sur ordinateur, feuille sur téléphone).
    const annuaire = p.getByRole('region', { name: /les artisans vérifiés du secteur/ });
    await expect(annuaire.getByText(/artisans? correspond/)).toBeVisible();
    const colonne = annuaire.getByRole('form', { name: 'Filtres' });
    if (await colonne.first().isVisible()) await expect(colonne.first()).toBeVisible();
    else await expect(annuaire.getByRole('button', { name: /Filtres/ }).first()).toBeVisible();
    // Liens « près de » : seulement les pages indexées du registre (Floirac est désindexée).
    const pres = p.getByRole('navigation', { name: 'Plombier près de Cenon' });
    await expect(pres.getByRole('link', { name: 'Plombier à Floirac' })).toHaveCount(0);
    const ld = await p.locator('script[type="application/ld+json"]').allTextContents();
    expect(ld.join(' ')).toContain('"ItemList"');
    expect(ld.join(' ')).toContain('"FAQPage"');
  });

  test('absente du registre ou désindexée : consultable mais « noindex, follow »', async ({
    page: p,
  }) => {
    for (const url of ['/metiers/plombier/lormont', '/metiers/plombier/floirac']) {
      const r = await p.goto(url);
      expect(r?.status()).toBe(200);
      expect(await robots(p)).toMatch(/noindex/);
      expect(await robots(p)).toMatch(/follow/);
      await expect(p.locator('h1')).toBeVisible();
    }
  });
});
