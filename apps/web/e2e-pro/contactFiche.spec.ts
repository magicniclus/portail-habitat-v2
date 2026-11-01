import { chemins } from '@ph/firebase/chemins';
import { expect, test } from '@playwright/test';
import { admin, COMPTES, entrepriseDe } from './outils';

// Fiche publique : coordonnées laissées directement à l'artisan → demande attribuée, gratuite.
test('fiche publique : mise en page de Ma fiche, carte, formulaire de contact direct', async ({
  page,
}, info) => {
  const { db } = await admin();
  const id = await entrepriseDe(COMPTES.proprio);
  const slug = (await db.doc(chemins.artisanPublic(id)).get()).get('slug') as string;
  await page.goto(`/artisans/${slug}`);
  await expect(page.getByRole('region', { name: 'En-tête de la fiche' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Zone d’intervention' })).toBeVisible();
  // Bloc de référencement rédigé depuis les données de la fiche.
  await expect(
    page.getByRole('heading', { name: /^Lisez les avis de particuliers à / }),
  ).toBeVisible();

  const email = `contact-fiche-${info.project.name.replace(/\W/g, '')}-${Date.now()}@test.local`;
  const f = page.getByRole('complementary', { name: 'Demander un devis' });
  await f.getByLabel(/^Prénom/).fill('Claire');
  await f.getByLabel(/^Nom/).fill('Martin');
  await f.getByLabel(/^Email/).fill(email);
  await f.getByLabel(/^Téléphone/).fill('06 12 34 56 78');
  await f.getByLabel(/^Code postal/).fill('33360');
  await f.getByLabel(/^Description/).fill('Isolation des combles.');
  await f.getByRole('checkbox', { name: /transmises/ }).check();
  await f.getByRole('button', { name: 'Envoyer ma demande' }).click();
  await expect(page.getByRole('heading', { name: 'Demande envoyée' })).toBeVisible({
    timeout: 15_000,
  });
  const d = await db.doc(chemins.demande('_')).parent.where('contact.email', '==', email).get();
  expect(d.size).toBe(1);
  expect(d.docs[0]!.data()).toMatchObject({
    source: 'fiche_artisan',
    statut: 'attribuee',
    artisanCibleId: id,
  });
});
