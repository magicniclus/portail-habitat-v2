import { couleurs, rampes } from '@ph/ui/tokens';
import type { Locator, Page } from '@playwright/test';

/**
 * Gestes « humains » pour les captures : curseur visible, frappe lente, défilement doux. Tout est
 * volontairement posé (public : des artisans) : `CALME` allonge les mouvements et les pauses.
 */
const CALME = 1.8;
/** Pause après un geste, le temps de lire ce qui vient de changer. */
const LECTURE_MS = 900;

export const CURSEUR = `
addEventListener('DOMContentLoaded', () => {
  const c = document.createElement('div');
  c.style.cssText = 'position:fixed;left:0;top:0;width:26px;height:26px;margin:-13px 0 0 -13px;border-radius:50%;background:${rampes.pro.base}8c;border:3px solid ${couleurs.blanc};box-shadow:0 2px 10px rgba(0,0,0,.3);z-index:2147483647;pointer-events:none;transition:transform .12s;transform:translate(-200px,-200px)';
  document.documentElement.appendChild(c);
  let x = -200, y = -200;
  const pos = (k) => { c.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + k + ')'; };
  addEventListener('mousemove', (e) => { x = e.clientX; y = e.clientY; pos(1); }, true);
  addEventListener('mousedown', () => pos(.65), true);
  addEventListener('mouseup', () => pos(1), true);
});`;

export async function viser(page: Page, cible: Locator) {
  await cible.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
  const b = await cible.boundingBox();
  if (b) await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 60 });
  await page.waitForTimeout(500);
}

export async function cliquer(page: Page, cible: Locator) {
  await viser(page, cible);
  await cible.click();
  await page.waitForTimeout(LECTURE_MS);
}

export async function taper(page: Page, cible: Locator, texte: string, delai = 40) {
  await cliquer(page, cible);
  await cible.pressSequentially(texte, { delay: Math.round(delai * CALME) });
  await page.waitForTimeout(LECTURE_MS / 2);
}

export async function defiler(page: Page, px: number, duree = 2500) {
  const ms = Math.round(duree * CALME);
  // Code en texte : rien d'injecté par la compilation dans la page.
  await page.evaluate(`new Promise((ok) => {
    const y0 = scrollY, t0 = performance.now();
    const pas = (t) => {
      const k = Math.min(1, (t - t0) / ${ms});
      scrollTo(0, y0 + ${px} * (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2));
      if (k < 1) requestAnimationFrame(pas); else ok();
    };
    requestAnimationFrame(pas);
  })`);
  await page.waitForTimeout(LECTURE_MS);
}

/** Carte de la zone : tuiles chargées (sinon on continue sans elle). */
export async function carteChargee(page: Page) {
  await page
    .waitForFunction(
      () => {
        const t = [
          ...document.querySelectorAll<HTMLImageElement>('img[src*="tile.openstreetmap"]'),
        ];
        return t.length > 0 && t.every((i) => i.complete && i.naturalWidth > 0);
      },
      null,
      { timeout: 8_000 },
    )
    .catch(() => undefined);
}
