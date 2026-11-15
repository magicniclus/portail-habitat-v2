// Décors dessinés de la VSL (plans 8 et 9) : le chantier de jour et le bureau du soir. Construits ici
// plutôt qu'à la main dans la page : les rangs de briques et le bureau servent à plusieurs plans.
// Deux couleurs seulement (bleu nuit, orange) et leurs teintes ; aucun personnage.
/* global document */
/* eslint-disable no-restricted-syntax */
(() => {
  const NUIT = '#173a55';
  const ORANGE = '#e05a10';
  const CLAIR = '#ff9857';

  /** Mur en construction : sept rangs de briques qui montent un à un, porte et fenêtre réservées. */
  function mur() {
    let svg = '';
    for (let i = 0; i < 7; i++) {
      const y = 800 - 40 * (i + 1);
      let rang = '';
      for (let x = 200 - (i % 2 ? 40 : 0); x < 620; x += 80) {
        const [a, b] = [Math.max(200, x), Math.min(620, x + 76)];
        if (b - a < 20) continue;
        if (i < 5 && b > 372 && a < 448) continue; // porte
        if (i > 1 && i < 5 && b > 500 && a < 580) continue; // fenêtre
        rang += `<rect x="${a}" y="${y}" width="${b - a}" height="34" rx="5" fill="${i % 3 === 1 ? '#ffe0cd' : '#fff'}" stroke="${NUIT}" stroke-width="6"/>`;
      }
      svg += `<g data-in="haut" data-t="${(0.2 + i * 0.2).toFixed(2)}">${rang}</g>`;
    }
    return svg;
  }

  /** Bureau du soir : lampe, cône de lumière, pile de devis, devis en cours, tasse qui fume. */
  function bureau(dx, anime) {
    const t = (expr) => (anime ? ` data-in="tombe" data-t="${expr}"` : '');
    const f = (expr) => (anime ? ` data-in="fondu" data-t="${expr}"` : '');
    const feuilles = [0, 1, 2, 3]
      .map(
        (i) =>
          `<g${t(`@soir+${(0.5 + i * 0.4).toFixed(1)}`)}><rect x="${1420 + (i % 2 ? 10 : -6)}" y="${746 - i * 30}" width="250" height="24" rx="6" fill="#fff"/><rect x="${1420 + (i % 2 ? 10 : -6)}" y="${746 - i * 30}" width="34" height="24" rx="6" fill="${CLAIR}"/></g>`,
      )
      .join('');
    return `<svg class="abs" style="left:${dx}px;top:0" width="1920" height="1080" viewBox="0 0 1920 1080" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="1272,528 1348,566 1600,774 1215,774" fill="rgba(255,193,156,.26)"${f('@soir')}/>
      <path d="M1040 780h800M1090 780v120M1790 780v120" stroke="#fff" stroke-width="12"/>
      <path d="M1158 772h96" stroke="#fff" stroke-width="14"/>
      <path d="M1206 770V600L1316 506" stroke="#fff" stroke-width="10"/>
      <circle cx="1206" cy="600" r="11" fill="${NUIT}" stroke="#fff" stroke-width="7"/>
      <polygon points="1296,462 1380,504 1348,566 1264,524" fill="${ORANGE}" stroke="${ORANGE}" stroke-width="10"/>
      ${feuilles}
      <g${f('@soir+0.3')}><g transform="rotate(5 1790 660)">
        <rect x="1700" y="540" width="180" height="232" rx="14" fill="#fff"/>
        <rect x="1722" y="566" width="84" height="16" rx="8" fill="${ORANGE}"/>
        <path d="M1724 616h132M1724 650h132M1724 684h96" stroke="#d7d3d3" stroke-width="10"/>
        <path d="M1796 730h60" stroke="${ORANGE}" stroke-width="10"/>
      </g></g>
      <g stroke="#fff" stroke-width="8"><path d="M1076 716v44a12 12 0 0 0 12 12h30a12 12 0 0 0 12-12v-44z"/><path d="M1130 728h10a10 10 0 0 1 0 22h-10"/></g>
      <path d="M1092 696c-8-12 8-18 0-32M1114 696c-8-12 8-18 0-32" stroke="${CLAIR}" stroke-width="6" data-fn="vapeur"/>
    </svg>`;
  }

  for (const el of document.querySelectorAll('[data-decor]')) {
    const [nom, dx] = el.dataset.decor.split(':');
    if (nom === 'mur') el.innerHTML = mur();
    else el.outerHTML = bureau(Number(dx ?? 0), nom === 'bureau-anime');
  }
})();
