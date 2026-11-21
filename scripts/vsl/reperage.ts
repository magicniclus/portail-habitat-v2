// Repérage : une image fixe de chaque écran candidat, pour préparer le tournage.
// Usage : tsx scripts/vsl/reperage.ts /pro/demandes /pro/fiche …  (préfixe `m:` = téléphone)
import { join } from 'node:path';
import { connecter, plateau, SORTIE } from './tournage';
import { mkdirSync } from 'node:fs';

async function main() {
  mkdirSync(join(SORTIE, 'reperage'), { recursive: true });
  const routes = process.argv.slice(2);
  for (const format of ['bureau', 'mobile'] as const) {
    const lot = routes.filter((r) => r.startsWith('m:') === (format === 'mobile'));
    if (!lot.length) continue;
    const { navigateur, page } = await plateau(format);
    if (lot.some((r) => r.includes('/pro/') && !r.includes('trouver-des-chantiers')))
      await connecter(page);
    for (const brut of lot) {
      const route = brut.replace(/^m:/, '');
      await page.goto(route);
      await page.waitForLoadState('load');
      await page.waitForTimeout(1200);
      const nom = route
        .replace(/^https?:\/\//, '')
        .replace(/[^a-z0-9]+/gi, '-')
        .replace(/^-|-$/g, '');
      await page.screenshot({ path: join(SORTIE, 'reperage', `${nom}-${format}.png`) });
      console.log(`✓ ${nom}-${format}`);
    }
    await navigateur.close();
  }
}

main()
  .then(() => process.exit(0))
  .catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  });
