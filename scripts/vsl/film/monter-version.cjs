// Prépare la voix d'une version courte de la VSL : garde les segments listés dans `versions.json`,
// coupe au besoin une phrase entre deux mots (dans le silence le plus proche) et écrit un dossier
// de voix complet (mp3 par segment, mots.json, script.json) que rendre.ts et son.ts savent lire.
//
// Usage : node scripts/vsl/film/monter-version.cjs <version> <dossier de voix> <dossier de sortie>
/* eslint-disable @typescript-eslint/no-require-imports */
const { readFileSync, writeFileSync, mkdirSync, copyFileSync } = require('node:fs');
const { spawnSync } = require('node:child_process');
const { join } = require('node:path');

const [nom, source, sortie] = process.argv.slice(2);
const FFMPEG = process.env.FFMPEG ?? 'ffmpeg';
const version = JSON.parse(readFileSync(join(__dirname, 'versions.json'), 'utf8'))[nom];
if (!version) throw new Error(`Version inconnue : ${nom}`);
const script = JSON.parse(readFileSync(join(__dirname, 'script.json'), 'utf8'));
const mots = JSON.parse(readFileSync(join(source, 'mots.json'), 'utf8'));

/** Silences d'un fichier (début, fin) et sa durée. */
function ecoute(fichier) {
  const log = spawnSync(
    FFMPEG,
    ['-hide_banner', '-i', fichier, '-af', 'silencedetect=noise=-35dB:d=0.04', '-f', 'null', '-'],
    { encoding: 'utf8' },
  ).stderr;
  const silences = [];
  let ouvert = null;
  for (const l of log.split('\n')) {
    const d = l.match(/silence_start: ([\d.]+)/);
    const f = l.match(/silence_end: ([\d.]+)/);
    if (d) ouvert = Number(d[1]);
    if (f && ouvert !== null) silences.push([ouvert, Number(f[1])]);
  }
  const duree = log
    .match(/Duration: (\d+):(\d+):([\d.]+)/)
    .slice(1)
    .reduce((s, x) => s * 60 + Number(x), 0);
  return { silences, duree };
}

mkdirSync(sortie, { recursive: true });
const sortieMots = {};
const segments = [];
for (const choix of version.segments) {
  const ligne = script.segments.find((s) => s.id === choix.id);
  const m = mots[choix.id];
  const [a, b] = choix.mots ?? [0, m.length - 1];
  const fichier = join(source, `${choix.id}.mp3`);
  if (a === 0 && b === m.length - 1) {
    copyFileSync(fichier, join(sortie, `${choix.id}.mp3`));
    sortieMots[choix.id] = m;
    segments.push({ id: ligne.id, acte: ligne.acte, texte: ligne.texte });
    continue;
  }
  if (!choix.texte) throw new Error(`${choix.id} : une phrase coupée demande son « texte »`);
  const { silences, duree } = ecoute(fichier);
  // Coupe entre deux mots : au milieu du plus long silence autour de la jonction, sinon à mi-chemin.
  const coupe = (x, y) => {
    const s = silences
      .filter(([d, f]) => f > x - 0.15 && d < y + 0.15)
      .sort((p, q) => q[1] - q[0] - (p[1] - p[0]))[0];
    return s ? (s[0] + s[1]) / 2 : (x + y) / 2;
  };
  const debut = a === 0 ? 0 : Math.max(coupe(m[a - 1].t + m[a - 1].d, m[a].t), m[a].t - 0.15);
  const fin =
    b === m.length - 1
      ? duree
      : Math.min(coupe(m[b].t + m[b].d, m[b + 1].t), m[b].t + m[b].d + 0.35);
  const r = spawnSync(FFMPEG, [
    ...['-y', '-loglevel', 'error', '-ss', debut.toFixed(3), '-to', fin.toFixed(3), '-i', fichier],
    ...['-af', `afade=t=in:d=0.02,afade=t=out:st=${(fin - debut - 0.05).toFixed(3)}:d=0.05`],
    ...['-c:a', 'libmp3lame', '-b:a', '192k', join(sortie, `${choix.id}.mp3`)],
  ]);
  if (r.status !== 0) throw new Error(`${choix.id} : ${r.stderr}`);
  sortieMots[choix.id] = m
    .slice(a, b + 1)
    .map((w) => ({ ...w, t: Math.max(0, Number((w.t - debut).toFixed(3))) }));
  segments.push({ id: ligne.id, acte: ligne.acte, texte: choix.texte });
  console.log(
    `${choix.id.padEnd(5)} ${debut.toFixed(2)} → ${fin.toFixed(2)} s sur ${duree.toFixed(2)}  « ${choix.texte.slice(0, 50)} »`,
  );
}
writeFileSync(join(sortie, 'mots.json'), JSON.stringify(sortieMots));
writeFileSync(
  join(sortie, 'script.json'),
  JSON.stringify(
    { segments, avant: version.avant, apres: version.apres, pas: version.pas },
    null,
    2,
  ),
);
console.log(`✓ ${nom} : ${segments.length} segments → ${sortie}`);
