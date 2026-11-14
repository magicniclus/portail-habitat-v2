import {
  THEMES,
  actions,
  couleurs,
  montage,
  neutres,
  ombres,
  rampes,
  rayons,
  trait,
  type Palier,
} from './index.ts';

const PALIERS: Palier[] = [100, 200, 300, 400, 500, 600, 700, 800, 900];
const ENTETE =
  '/* Fichier généré par `pnpm --filter @ph/ui tokens` depuis src/tokens/index.ts : ne pas modifier. */\n';

/** `[data-theme="…"]` : variables d'accent de chaque espace, et l'orange pro toujours disponible. */
export function genererThemesCss(): string {
  const blocs = THEMES.map((theme) => {
    const r = rampes[theme];
    const lignes = [
      `  --accent: ${r.base};`,
      `  --accent-action: ${actions[theme]};`,
      ...PALIERS.map((p) => `  --accent-${p}: ${r[p]};`),
    ];
    const selecteur =
      theme === 'particulier' ? `:root,\n[data-theme='particulier']` : `[data-theme='${theme}']`;
    return `${selecteur} {\n${lignes.join('\n')}\n}`;
  });
  const pro = rampes.pro;
  const commun = `:root {\n  --pro: ${pro.base};\n  --pro-100: ${pro[100]};\n  --pro-700: ${pro[700]};\n}`;
  return `${ENTETE}\n${[commun, ...blocs].join('\n\n')}\n`;
}

/**
 * Ambiance sombre (`data-ambiance="sombre"`, éditeur de montage) : les composants clairs de
 * @ph/ui gardent leurs classes ; ces règles hors couche passent devant les utilitaires.
 */
export function genererAmbianceCss(): string {
  const m = montage;
  const s = "[data-ambiance='sombre']";
  const regles: [string, string][] = [
    [s, `color-scheme: dark; background-color: ${m.fond}; color: ${m.texte};`],
    [`${s} :is(.bg-blanc, .bg-fond, .bg-surface)`, `background-color: ${m.panneau};`],
    [`${s} :is(.bg-neutre-100, .hover\\:bg-neutre-100:hover)`, `background-color: ${m.surface};`],
    [`${s} :is(.bg-neutre-200, .hover\\:bg-neutre-200:hover)`, `background-color: ${m.survol};`],
    [`${s} :is(.text-texte, .text-neutre-900, .text-neutre-800)`, `color: ${m.texte};`],
    [`${s} :is(.text-neutre-700, .text-neutre-600)`, `color: ${m.texteDoux};`],
    [
      `${s} :is(.border-trait, .border-neutre-200, .border-neutre-300)`,
      `border-color: ${m.trait};`,
    ],
    [
      `${s} :is(input:not([type='range'], [type='checkbox'], [type='radio']), select, textarea)`,
      `background-color: ${m.surface}; color: ${m.texte}; border-color: ${m.trait};`,
    ],
  ];
  return `${ENTETE}
${regles.map(([sel, decl]) => `${sel} {\n  ${decl}\n}`).join('\n\n')}\n`;
}

/** Thème Tailwind 4 : utilitaires `bg-accent`, `text-neutre-700`, `rounded-control`… */
export function genererThemeTailwind(): string {
  const l: string[] = [
    '@theme inline {',
    '  --color-*: initial;',
    '  --color-transparent: transparent;',
    '  --color-current: currentColor;',
  ];
  l.push('  --color-accent: var(--accent);', '  --color-accent-action: var(--accent-action);');
  for (const p of PALIERS) l.push(`  --color-accent-${p}: var(--accent-${p});`);
  l.push(
    '  --color-pro: var(--pro);',
    '  --color-pro-100: var(--pro-100);',
    '  --color-pro-700: var(--pro-700);',
  );
  for (const p of PALIERS) l.push(`  --color-neutre-${p}: ${neutres[p]};`);
  const noms: Record<keyof typeof couleurs, string> = {
    texte: 'texte',
    fond: 'fond',
    surface: 'surface',
    blanc: 'blanc',
    premium: 'premium',
    premiumTexte: 'premium-texte',
    premiumFond: 'premium-fond',
    etoile: 'etoile',
    succes: 'succes',
    succesFond: 'succes-fond',
    attention: 'attention',
    attentionVif: 'attention-vif',
    attentionFond: 'attention-fond',
    danger: 'danger',
    dangerFond: 'danger-fond',
    info: 'info',
    infoFond: 'info-fond',
    nuit: 'nuit',
  };
  for (const [cle, nom] of Object.entries(noms))
    l.push(`  --color-${nom}: ${couleurs[cle as keyof typeof couleurs]};`);
  l.push(`  --color-trait: ${trait};`);
  for (const [cle, v] of Object.entries(montage))
    l.push(`  --color-montage-${cle.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}: ${v};`);
  for (const [nom, v] of Object.entries(rayons)) l.push(`  --radius-${nom}: ${v}px;`);
  for (const [nom, v] of Object.entries(ombres)) l.push(`  --shadow-${nom}: ${v};`);
  l.push(
    '  --font-sans: var(--police-sans, "Source Sans 3"), system-ui, sans-serif;',
    '  --font-serif: var(--police-serif, "Source Serif 4"), Georgia, serif;',
    '  --spacing-page: clamp(16px, 4vw, 48px);',
    '  --container-contenu: 1240px;',
  );
  l.push('}');
  return `${ENTETE}\n${l.join('\n')}\n`;
}
