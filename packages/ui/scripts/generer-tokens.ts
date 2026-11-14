import { writeFileSync } from 'node:fs';
import { genererAmbianceCss, genererThemeTailwind, genererThemesCss } from '../src/tokens/css.ts';

const dossier = new URL('../src/styles/', import.meta.url);
writeFileSync(new URL('themes.css', dossier), genererThemesCss());
writeFileSync(new URL('theme.css', dossier), genererThemeTailwind());
writeFileSync(new URL('ambiance.css', dossier), genererAmbianceCss());
console.log(
  'Tokens régénérés : src/styles/themes.css, src/styles/theme.css, src/styles/ambiance.css',
);
