// Prépare le site de démonstration du film « site internet » : applique un modèle de l'éditeur à
// tout le site (comme le ferait l'artisan), enregistre et publie. Émulateurs seulement.
// Usage : tsx scripts/vsl/site-modele.ts ["Premium photo"] [--voir]  (--voir : images de repérage seulement)
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { connecter, plateau, SORTIE } from './tournage';

const modele =
  process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'Premium photo';
const voir = process.argv.includes('--voir');

async function main() {
  const dossier = join(SORTIE, 'reperage');
  mkdirSync(dossier, { recursive: true });
  const { navigateur, page } = await plateau('bureau');
  const photo = (nom: string) => page.screenshot({ path: join(dossier, `site-modele-${nom}.png`) });
  await connecter(page);
  await page.goto('/pro/site/editeur?panneau=modeles');
  await page.waitForLoadState('load');
  await page.waitForTimeout(1500);
  await page.getByText(modele, { exact: true }).first().click();
  await page.waitForTimeout(800);
  await photo('1-choix');
  if (!voir) {
    await page.getByRole('button', { name: /Appliquer à tout le site/ }).click();
    await page.waitForTimeout(1500);
    await photo('2-applique');
    await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
    await page.waitForTimeout(1500);
    await page.getByRole('button', { name: 'Publier', exact: true }).click();
    await page.waitForTimeout(1500);
    await photo('3-publier');
  }
  await navigateur.close();
}

main()
  .then(() => process.exit(0))
  .catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  });
