import { writeFileSync } from 'node:fs';
import { genererThemeTailwind, genererThemesCss } from '../src/tokens/css.ts';

const dossier = new URL('../src/styles/', import.meta.url);
writeFileSync(new URL('themes.css', dossier), genererThemesCss());
writeFileSync(new URL('theme.css', dossier), genererThemeTailwind());
console.log('Tokens régénérés : src/styles/themes.css, src/styles/theme.css');
