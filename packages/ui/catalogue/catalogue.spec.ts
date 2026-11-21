import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import {
  champsTropPetits,
  ciblesTropPetites,
  defileHorizontalement,
} from '@ph/config/playwright/mesures';

interface Entree {
  id: string;
  type: 'story' | 'docs';
  title: string;
  name: string;
}

const index = JSON.parse(
  readFileSync(new URL('../storybook-static/index.json', import.meta.url), 'utf8'),
) as {
  entries: Record<string, Entree>;
};
const stories = Object.values(index.entries).filter((e) => e.type === 'story');

for (const story of stories) {
  test(`${story.title} › ${story.name}`, async ({ page }) => {
    await page.goto(`/iframe.html?id=${story.id}&viewMode=story&globals=theme:tous`);
    await page.locator('#storybook-root > *').first().waitFor();
    await page.evaluate(() => document.fonts.ready);

    expect(await defileHorizontalement(page), 'défilement horizontal à 320 px').toBe(false);
    expect(await ciblesTropPetites(page), 'cibles tactiles < 44 px').toEqual([]);
    expect(await champsTropPetits(page), 'champs < 16 px').toEqual([]);

    const { violations } = await new AxeBuilder({ page })
      .include('#storybook-root')
      // Les logos sont dispensés de contraste (WCAG 1.4.3, « logotypes »).
      .exclude('[data-logo]')
      // La story est répétée dans les 4 thèmes : ses repères (nav, main) le sont aussi.
      .disableRules(['landmark-unique', 'landmark-no-duplicate-main', 'landmark-main-is-top-level'])
      .analyze();
    expect(
      violations.map((v) => `${v.id} : ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`),
    ).toEqual([]);
  });
}
