// Repérage : le site publié de démonstration en pleine page (ordinateur et téléphone).
// Usage : tsx scripts/vsl/site-vue.ts [chemin]
import { join } from 'node:path';
import { plateau, SORTIE } from './tournage';

async function main() {
  const chemin = process.argv[2] ?? '/';
  for (const format of ['bureau', 'mobile'] as const) {
    const { navigateur, page } = await plateau(format);
    await page.goto(`http://bertrand-renovation.localhost:3200${chemin}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await page.screenshot({
      path: join(SORTIE, 'reperage', `site-vue-${format}.jpg`),
      fullPage: true,
      type: 'jpeg',
      quality: 70,
    });
    await navigateur.close();
  }
}
main()
  .then(() => process.exit(0))
  .catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  });
