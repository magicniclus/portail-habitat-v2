// Textes livrés avec la VSL : `sous-titres.srt` et `voix-off.txt` minutés, à partir de la chronologie
// du dernier rendu (`.vsl/film/chronologie.json` et `sous-titres.json`).
// Usage : tsx scripts/vsl/film/textes.ts   → .vsl/livrables/
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const film = resolve(__dirname, '../../../.vsl/film');
const sortie = resolve(__dirname, '../../../.vsl/livrables');
const lire = <T>(f: string) => JSON.parse(readFileSync(join(film, f), 'utf8')) as T;

const deux = (n: number) => String(Math.floor(n)).padStart(2, '0');
const srt = (t: number) =>
  `${deux(t / 3600)}:${deux((t / 60) % 60)}:${deux(t % 60)},${String(Math.round((t % 1) * 1000) % 1000).padStart(3, '0')}`;
const minSec = (t: number) => `${Math.floor(t / 60)}:${deux(t % 60)}`;

mkdirSync(sortie, { recursive: true });
const lignes = lire<{ debut: number; fin: number; texte: string }[]>('sous-titres.json');
writeFileSync(
  join(sortie, 'sous-titres.srt'),
  lignes
    .map(
      (l, i) =>
        `${i + 1}\n${srt(l.debut)} --> ${srt(Math.min(l.fin, lignes[i + 1]?.debut ?? l.fin))}\n${l.texte}\n`,
    )
    .join('\n'),
);
const chrono = lire<{
  duree: number;
  segments: { id: string; acte: number; debut: number; duree: number; texte: string }[];
}>('chronologie.json');
let acte = 0;
writeFileSync(
  join(sortie, 'voix-off.txt'),
  `VSL longue Portail Travaux Pro — voix off minutée (durée ${minSec(chrono.duree)})\n` +
    chrono.segments
      .map(
        (s) =>
          `${s.acte !== acte ? `\n— Acte ${(acte = s.acte)} —\n` : ''}[${minSec(s.debut)} → ${minSec(s.debut + s.duree)}] ${s.id.replace(/^p0?/, 'plan ')} : ${s.texte}`,
      )
      .join('\n') +
    '\n',
);
console.log(`✓ sous-titres.srt (${lignes.length} lignes) et voix-off.txt`);
