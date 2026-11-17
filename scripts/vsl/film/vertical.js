// Recomposition verticale (1080 × 1920) de la VSL. La page reste celle du 16:9 : en format vertical,
// chaque plan est redistribué par zones (un groupe d'éléments du 16:9 est déplacé et mis à l'échelle)
// et par retouches de style ; les captures du site passent sur leurs prises mobiles, dans un cadre
// de téléphone. Rien ne change quand le film est rendu en paysage.
/* global document, window */
/* eslint-disable no-restricted-syntax */
(() => {
  if (window.__FORMAT !== 'vertical') return;

  // Par plan : `styles` [sélecteur, css | [css par rang]] appliqués d'abord ; `hors` : éléments
  // laissés hors zone ; `zones` : { rect: [x, y, l, h] | sel: [...] , vers: [X, Y, échelle] } ;
  // `centre` : [X, Y, échelle] des textes centrés (`.centre`) ; `reste` : tout ce qui n'est pas pris.
  const PLEIN = [0, 0, 1];
  const PLANS = {
    p01: { reste: [-516, 266, 1.1] },
    p02: { reste: [-516, 266, 1.1] },
    p03: {
      zones: [
        { rect: [0, 300, 720, 300], vers: [-82, -200, 1.45] },
        { rect: [720, 0, 1200, 650], vers: [-685, 480, 1] },
      ],
      centre: [0, 480, 1],
    },
    p04: { centre: [0, 420, 0.8], reste: [-228, 420, 0.8] },
    'p05a p05b p05c': {
      styles: [[':scope > .gros', 'text-align:center']],
      zones: [
        { rect: [1200, 200, 720, 520], vers: [-1449, -65, 1.3] },
        { rect: [0, 200, 1200, 520], vers: [-77.5, 625, 0.95] },
        { rect: [0, 740, 1200, 200], vers: [-43, 442, 1.1] },
      ],
    },
    p06: { reste: [-420, 400, 1] },
    p07: { centre: [0, 400, 1], reste: [-420, 400, 1] },
    p08: {
      styles: [
        [':scope > .creme', 'left:0;top:0;width:1080px;height:800px'],
        [':scope > [data-fn="crepuscule"]', 'left:0;top:0;width:1080px;height:800px'],
        [':scope > .nuit', 'left:0;top:800px;width:1080px;height:1120px'],
        [':scope > [data-fn="reveil"]', 'left:0;top:800px;width:1080px;height:1120px'],
      ],
      hors: [
        ':scope > .creme',
        ':scope > .nuit',
        ':scope > [data-fn="crepuscule"]',
        ':scope > [data-fn="reveil"]',
      ],
      zones: [
        {
          sel: ['svg[viewBox="960 0 960 1080"]', 'svg[width="1920"]'],
          vers: [-612, 704, 0.8],
        },
      ],
      reste: [156, 80, 0.8],
    },
    p09: {
      styles: [
        [':scope > .ticket', 'left:90px;top:190px;width:900px;padding:36px 54px 30px'],
        ['.rang-prix', 'padding:20px 0'],
        [':scope > .gratuit', 'left:160px;top:940px;width:760px;height:560px'],
        ['.gratuit .chiffre', 'font-size:210px;margin-top:6px'],
        ['.gratuit .plus', 'margin-top:22px'],
      ],
      reste: PLEIN,
    },
    p10: { reste: [-420, 140, 1] },
    p10b: { centre: [0, 330, 1] },
    p11: {
      zones: [
        { rect: [0, 0, 760, 1080], vers: [232, 155, 0.75] },
        { rect: [780, 60, 1140, 150], vers: [-695, 776, 0.95] },
      ],
      reste: [-658, 744, 0.9],
    },
    p12: { centre: [0, 580, 0.64] },
    p13: {
      styles: [
        [':scope > div[style*="perspective"]', 'left:290px;top:220px;width:500px;transform:none'],
        ['.nav', 'height:940px'],
        [':scope > .etq', 'left:600px;top:290px'],
        [
          ':scope > .badge',
          ['left:770px;top:420px', 'left:810px;top:600px', 'left:770px;top:780px'],
        ],
      ],
      centre: [0, 330, 1],
      reste: PLEIN,
    },
    p14: {
      styles: [
        [':scope > .chiffre', ['left:0;top:330px;width:1080px', 'left:0;top:800px;width:1080px']],
        [':scope > .filet', 'display:none'],
        [':scope > .moyen', 'left:0;top:1110px;width:1080px'],
      ],
      reste: PLEIN,
    },
    p15: { centre: [0, 580, 0.66] },
    p16: {
      styles: [
        [':scope > div[style*="perspective"]', 'left:60px;top:230px;width:470px;transform:none'],
        ['.nav', 'height:1000px'],
        ['.nav img', 'width:100%;margin:0'],
      ],
      zones: [{ rect: [1200, 0, 720, 1080], vers: [-491, 237, 0.85] }],
      reste: PLEIN,
    },
    p17: { centre: [0, 590, 0.6] },
    p19: {
      styles: [
        [':scope > div[style*="perspective"]', 'left:270px;top:215px;width:540px;transform:none'],
        ['.nav', 'height:1080px'],
        [':scope > .abs', 'display:none'],
        [':scope > .etq', 'left:540px;translate:-50% 0;top:1340px'],
      ],
      reste: PLEIN,
    },
    p20: {
      styles: [[':scope > .moyen', 'padding:0 70px']],
      centre: [0, 330, 1],
      reste: [-420, 330, 1],
    },
    p21: {
      styles: [
        [':scope > .outil', grille()],
        [':scope > .apercu', 'left:290px;top:640px;width:500px;height:860px'],
      ],
      reste: PLEIN,
    },
    'p22a p22b p22c p22d p22e p22f p22g': {
      styles: [
        [':scope > .outil', grille()],
        [':scope > .apercu', 'left:290px;top:640px;width:500px;height:860px'],
        [':scope > .nav', 'left:290px;top:640px;width:500px;height:860px'],
        [':scope > .centre', 'top:1000px'],
        ['.tampon', 'font-size:84px'],
      ],
      centre: PLEIN,
      reste: PLEIN,
    },
    p23: { centre: [0, 500, 0.85] },
    p24: {
      styles: [
        [':scope > [data-fn="grandit"]', 'left:110px;top:240px'],
        [':scope > .filet', 'display:none'],
        [':scope > [data-fn="efface"]', 'left:110px;top:1000px'],
      ],
      reste: PLEIN,
    },
    p25: { reste: [-390, 420, 1] },
    p26: {
      styles: [
        [':scope > svg', 'left:435px;top:560px'],
        [':scope > .sur.abs', 'left:0;width:1080px;text-align:center;top:810px'],
        [
          ':scope > div.abs[style*="flex"]',
          'left:0;width:1080px;top:850px;flex-direction:column;align-items:center;gap:0',
        ],
      ],
      zones: [{ sel: ['.carte'], vers: [0, 150, 1] }],
      centre: [0, 470, 1],
      reste: PLEIN,
    },
    p27: {
      styles: [
        [':scope > svg.picto', 'left:440px;top:330px'],
        [':scope > .carte', 'left:60px;top:780px'],
      ],
      reste: PLEIN,
    },
    p28: {
      styles: [
        [
          ':scope > .centre',
          ['top:400px', 'top:540px;font-size:104px', 'top:860px', 'top:1230px;font-size:36px'],
        ],
        ['.btn', 'font-size:46px;padding:32px 56px'],
        [':scope > svg', 'left:495px;top:1040px'],
      ],
      centre: PLEIN,
      reste: PLEIN,
    },
  };
  // Film « site internet » : l'écran d'ordinateur en haut (pleine largeur), la colonne de texte dessous.
  Object.assign(PLANS, {
    's01 s02': { centre: [0, 330, 0.9], reste: [-420, 300, 1] },
    s02b: {
      styles: [[':scope > .abs.chiffre', 'left:1140px;top:800px']],
      centre: [0, 130, 1],
      reste: [-180, 200, 0.75],
    },
    s03: { centre: [0, 420, 0.8], reste: [-228, 420, 0.8] },
    's04 s05': PLANS['p05a p05b p05c'],
    's06 s07': {
      styles: [
        [':scope > div[style*="perspective"]', 'left:40px;top:200px;width:1000px;transform:none'],
      ],
      zones: [{ rect: [1300, 0, 620, 1080], vers: [-1306.5, 700, 1.05] }],
      reste: PLEIN,
    },
    s08: {
      styles: [
        [':scope > div[style*="perspective"]', 'left:40px;top:200px;width:1000px;transform:none'],
      ],
      zones: [{ rect: [1300, 0, 620, 1080], vers: [-1306.5, 700, 1.05] }],
      reste: PLEIN,
    },
    s09: {
      styles: [
        [':scope > div[style*="perspective"]', 'left:40px;top:200px;width:1000px;transform:none'],
        [':scope > .pose', 'left:150px;top:560px'],
        [':scope > .nav.tel', 'left:350px;top:930px;width:380px;height:580px'],
      ],
      reste: PLEIN,
    },
    s10: {
      styles: [
        [':scope > div[style*="perspective"]', 'left:40px;top:200px;width:1000px;transform:none'],
      ],
      zones: [{ rect: [1300, 0, 620, 1080], vers: [-1240, 705, 1] }],
      reste: PLEIN,
    },
    s09b: {
      styles: [
        [':scope > div[style*="perspective"]', 'left:40px;top:200px;width:1000px;transform:none'],
      ],
      zones: [{ rect: [1300, 0, 620, 1080], vers: [-1306.5, 700, 1.05] }],
      reste: PLEIN,
    },
    s11: PLANS.p23,
    s12: PLANS.p24,
    s13: { reste: [-390, 420, 1] },
    s13b: {
      styles: [
        [
          ':scope > .outil',
          [0, 1, 2, 3, 4, 5].map(
            (n) =>
              `left:${n % 2 ? 548 : 12}px;top:${470 + Math.floor(n / 2) * 170}px;font-size:30px;padding:0 20px;gap:16px`,
          ),
        ],
        [':scope > .centre', ['top:330px', 'top:1040px']],
        ['.tampon', 'font-size:78px'],
      ],
      centre: PLEIN,
      reste: PLEIN,
    },
    s14: {
      ...PLANS.p28,
      styles: [...PLANS.p28.styles, [':scope > .titre', 'font-size:96px']],
    },
  });
  // Film « devis et factures » : mêmes dispositions que le film du site.
  const ECRAN = PLANS.s08;
  Object.assign(PLANS, {
    d01: { centre: [0, 200, 0.9], reste: [-420, 330, 1] },
    d02: {
      styles: [[':scope > .oui', ['left:560px;top:760px', 'left:1250px;top:760px']]],
      reste: [-180, 420, 0.75],
    },
    d03: { centre: [0, 420, 0.8], reste: [-228, 420, 0.8] },
    'd04 d05': {
      ...PLANS['p05a p05b p05c'],
      // Les deux pastilles l'une sous l'autre (elles sont trop larges pour tenir côte à côte).
      styles: [
        ...PLANS['p05a p05b p05c'].styles,
        [':scope > .oui', ['left:150px;top:760px', 'left:150px;top:870px']],
      ],
    },
    d06: ECRAN,
    d07: ECRAN,
    d08: {
      styles: [...ECRAN.styles, [':scope > .etat', 'left:150px;top:720px;font-size:52px']],
      zones: ECRAN.zones,
      reste: PLEIN,
    },
    d09: {
      styles: [...ECRAN.styles, [':scope > .pose', 'left:150px;top:640px']],
      zones: ECRAN.zones,
      reste: PLEIN,
    },
    d10: ECRAN,
    d10b: {
      styles: [
        [':scope > div[style*="perspective"]', 'left:40px;top:200px;width:1000px;transform:none'],
        [':scope > .nav.tel', 'left:350px;top:900px;width:380px;height:610px'],
      ],
      reste: PLEIN,
    },
    d11: PLANS.p23,
    d12: {
      styles: [
        [':scope > div', ['left:110px;top:230px', '', 'left:110px;top:1000px']],
        [':scope > .filet', 'display:none'],
      ],
      reste: PLEIN,
    },
    d13: { reste: [-390, 420, 1] },
    d13b: PLANS.s13b,
    d14: {
      ...PLANS.p28,
      styles: [
        ...PLANS.p28.styles,
        [':scope > .titre', 'font-size:82px'],
        ['.btn', 'font-size:40px;padding:30px 40px'],
      ],
    },
  });
  // Films courts des outils (fiche, avis, suivi) : l'écran en haut, la colonne de texte dessous.
  const TEXTE = { centre: [0, 380, 0.68], reste: [-112.8, 380, 0.68] };
  const FIN_COURT = {
    ...PLANS.p28,
    styles: [
      ...PLANS.p28.styles,
      [':scope > .titre', 'font-size:88px'],
      ['.btn', 'font-size:40px;padding:30px 40px'],
    ],
  };
  Object.assign(PLANS, {
    f01: PLANS.s08,
    f02: TEXTE,
    f03: PLANS.s08,
    f04: PLANS.s08,
    f05: FIN_COURT,
    a01: TEXTE,
    a02: TEXTE,
    a03: PLANS.s08,
    a04: {
      ...PLANS.s08,
      styles: [...PLANS.s08.styles, [':scope > .pose', 'left:150px;top:560px']],
    },
    a05: FIN_COURT,
    u01: { reste: [-70, 420, 0.72] },
    u02: TEXTE,
    u03: PLANS.s08,
    u04: PLANS.s08,
    u05: FIN_COURT,
  });
  /** Les six cartes d'outils sur deux colonnes. */
  function grille() {
    return [0, 1, 2, 3, 4, 5].map(
      (n) => `left:${n % 2 ? 560 : 40}px;top:${230 + Math.floor(n / 2) * 118}px`,
    );
  }

  const zone = ([x, y, s], largeur) => {
    const z = document.createElement('div');
    z.className = 'zone';
    z.style.cssText = `position:absolute;left:0;top:0;width:${largeur}px;height:1080px;transform-origin:0 0;transform:translate(${x}px,${y}px) scale(${s})`;
    return z;
  };

  for (const section of document.querySelectorAll('section[data-scene]')) {
    const plan = PLANS[section.dataset.scene];
    if (!plan) throw new Error(`Plan sans recomposition verticale : ${section.dataset.scene}`);
    for (const [sel, css] of plan.styles ?? [])
      section.querySelectorAll(sel).forEach((el, n) => {
        el.style.cssText += `;${Array.isArray(css) ? (css[n] ?? '') : css}`;
      });
    // Mesure dans la mise en page du 16:9, avant tout déplacement.
    section.style.display = 'block';
    const origine = section.getBoundingClientRect();
    const hors = new Set((plan.hors ?? []).flatMap((s) => [...section.querySelectorAll(s)]));
    const groupes = new Map();
    const ranger = (cle, el, creer) => {
      if (!groupes.has(cle)) groupes.set(cle, { membres: [], creer });
      groupes.get(cle).membres.push(el);
    };
    for (const el of [...section.children]) {
      if (hors.has(el)) continue;
      if (el.classList.contains('centre')) {
        if (plan.centre) ranger('centre', el, () => zone(plan.centre, 1080 / plan.centre[2]));
        else throw new Error(`Texte centré sans zone : ${section.dataset.scene}`);
        continue;
      }
      const r = el.getBoundingClientRect();
      const [cx, cy] = [r.left + r.width / 2 - origine.left, r.top + r.height / 2 - origine.top];
      const n = (plan.zones ?? []).findIndex((z) =>
        z.sel
          ? z.sel.some((s) => el.matches(s))
          : cx >= z.rect[0] &&
            cx < z.rect[0] + z.rect[2] &&
            cy >= z.rect[1] &&
            cy < z.rect[1] + z.rect[3],
      );
      if (n >= 0) ranger(n, el, () => zone(plan.zones[n].vers, 1920));
      else ranger('reste', el, () => zone(plan.reste ?? [-420, 420, 1], 1920));
    }
    for (const { membres, creer } of groupes.values()) {
      const z = creer();
      membres[0].before(z);
      z.append(...membres);
    }
    section.style.display = '';
  }

  // Captures : prises mobiles, dans un cadre de téléphone.
  // (un écran d'ordinateur, `.nav.ordi`, garde sa prise de bureau).
  for (const img of document.querySelectorAll('img[data-cap]'))
    if (!img.closest('.ordi')) img.dataset.cap = img.dataset.cap.replace('-bureau', '-mobile');
  const style = document.createElement('style');
  style.textContent = `
    #scene { width: 1080px; height: 1920px; }
    .zone > * { position: absolute; }
    .nav:not(.ordi), .nuit .nav:not(.ordi) { border: 10px solid #201e1d; border-radius: 48px; background: #fff; }
    .nav:not(.ordi) .barre { display: none; }
    #st { font-size: 56px; }
  `;
  document.head.appendChild(style);
})();
