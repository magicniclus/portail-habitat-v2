import type { Page } from '@playwright/test';

export interface CibleTropPetite {
  element: string;
  largeur: number;
  hauteur: number;
}

/** Mesure les éléments interactifs visibles : 44 × 44 px minimum (MOBILE.md §4). */
export function ciblesTropPetites(page: Page, racine = 'body'): Promise<CibleTropPetite[]> {
  return page.evaluate((selecteurRacine) => {
    const SELECTEUR =
      'a[href], button, input, select, textarea, [role="button"], [role="option"], [role="combobox"]';
    const resultats: { element: string; largeur: number; hauteur: number }[] = [];
    for (const el of document.querySelectorAll<HTMLElement>(`${selecteurRacine} ${SELECTEUR}`)) {
      const style = getComputedStyle(el);
      if (
        style.visibility === 'hidden' ||
        style.display === 'none' ||
        el.closest('[hidden], [aria-hidden="true"]')
      )
        continue;
      const boite = el.getBoundingClientRect();
      if (boite.width === 0 && boite.height === 0) continue;
      if (boite.width <= 1 && boite.height <= 1) continue; // sr-only
      // Exception WCAG 2.5.8 : lien dans une phrase (inline, entouré de texte).
      if (
        el.tagName === 'A' &&
        style.display === 'inline' &&
        [...(el.parentElement?.childNodes ?? [])].some(
          (n) => n !== el && n.nodeType === Node.TEXT_NODE && n.textContent!.trim().length > 1,
        )
      )
        continue;
      // Case et bouton radio : la cible est leur <label> englobant.
      const cible =
        (el as HTMLInputElement).type === 'checkbox' || (el as HTMLInputElement).type === 'radio'
          ? (el.closest('label') ?? el)
          : el;
      const b = cible.getBoundingClientRect();
      if (Math.round(b.height) < 44 || Math.round(b.width) < 44) {
        resultats.push({
          element: cible.outerHTML.slice(0, 120),
          largeur: Math.round(b.width),
          hauteur: Math.round(b.height),
        });
      }
    }
    return resultats;
  }, racine);
}

export function defileHorizontalement(page: Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
}

/** Champs sous 16 px : Safari iOS zoome à la saisie (MOB-03). */
export function champsTropPetits(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    [
      ...document.querySelectorAll<HTMLElement>(
        'input:not([type=checkbox]):not([type=radio]), select, textarea',
      ),
    ]
      .filter((el) => parseFloat(getComputedStyle(el).fontSize) < 16)
      .map((el) => el.outerHTML.slice(0, 120)),
  );
}
