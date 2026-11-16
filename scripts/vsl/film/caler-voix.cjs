// Cale une voix enregistrée d'une seule traite sur le script : aligne la transcription minutée
// (mots reconnus) sur les mots du script, coupe la voix dans les silences entre segments et écrit
// un dossier de voix au format attendu par rendre.ts et son.ts (un mp3 par segment + mots.json).
//
// Usage : node scripts/vsl/film/caler-voix.cjs <audio> <transcription.json> <dossier de sortie>
//   transcription.json : { chunks: [{ text, timestamp: [début, fin] }] } (Whisper, minutage par mot)
//   Les mots de référence (découpage identique aux repères du film) viennent de .vsl/voix/mots.json.
/* eslint-disable @typescript-eslint/no-require-imports */
const { readFileSync, writeFileSync, mkdirSync } = require('node:fs');
const { spawnSync } = require('node:child_process');
const { join } = require('node:path');

const [audio, transcription, sortie] = process.argv.slice(2);
const FFMPEG = process.env.FFMPEG ?? 'ffmpeg';
const script = JSON.parse(readFileSync('scripts/vsl/film/script.json', 'utf8'));
const reference = JSON.parse(readFileSync('.vsl/voix/mots.json', 'utf8'));
const norme = (s) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');

// Mots du script, dans l'ordre du film.
const cible = [];
for (const s of script.segments)
  for (const m of reference[s.id]) cible.push({ seg: s.id, mot: m.mot, n: norme(m.mot) });
// Mots reconnus.
const dits = JSON.parse(readFileSync(transcription, 'utf8'))
  .chunks.map((c) => ({ n: norme(c.text), t: c.timestamp[0], f: c.timestamp[1] ?? c.timestamp[0] }))
  .filter((c) => c.n);

// Alignement global (distance d'édition, mots proches acceptés).
const proche = (a, b) => {
  if (a === b) return 0;
  if (
    a.length > 2 &&
    b.length > 2 &&
    (a.startsWith(b) || b.startsWith(a) || a.endsWith(b) || b.endsWith(a))
  )
    return 0.4;
  return 1.2;
};
const [A, B] = [cible.length, dits.length];
const cout = Array.from({ length: A + 1 }, () => new Float32Array(B + 1));
for (let i = 1; i <= A; i++) cout[i][0] = i;
for (let j = 1; j <= B; j++) cout[0][j] = j;
for (let i = 1; i <= A; i++)
  for (let j = 1; j <= B; j++)
    cout[i][j] = Math.min(
      cout[i - 1][j - 1] + proche(cible[i - 1].n, dits[j - 1].n),
      cout[i - 1][j] + 1,
      cout[i][j - 1] + 1,
    );
let [i, j] = [A, B];
let exacts = 0;
while (i > 0 && j > 0) {
  const p = proche(cible[i - 1].n, dits[j - 1].n);
  if (Math.abs(cout[i][j] - (cout[i - 1][j - 1] + p)) < 1e-4) {
    if (p < 1) {
      Object.assign(cible[i - 1], { t: dits[j - 1].t, f: dits[j - 1].f });
      exacts++;
    }
    i--;
    j--;
  } else if (Math.abs(cout[i][j] - (cout[i - 1][j] + 1)) < 1e-4) i--;
  else j--;
}
// Mots sans correspondance : répartis entre leurs voisins, au prorata de leur longueur.
for (let a = 0; a < A; a++) {
  if (cible[a].t !== undefined) continue;
  let b = a;
  while (b < A && cible[b].t === undefined) b++;
  const debut = a > 0 ? cible[a - 1].f : 0;
  const fin = b < A ? cible[b].t : dits[B - 1].f;
  const total = cible.slice(a, b).reduce((s, m) => s + m.n.length + 1, 0);
  let t = debut;
  for (let k = a; k < b; k++) {
    const d = ((fin - debut) * (cible[k].n.length + 1)) / total;
    Object.assign(cible[k], { t, f: t + d * 0.92, devine: true });
    t += d;
  }
  a = b - 1;
}

// Silences de la voix : les coupes entre segments se font dedans.
const log = spawnSync(
  FFMPEG,
  ['-hide_banner', '-i', audio, '-af', 'silencedetect=noise=-40dB:d=0.12', '-f', 'null', '-'],
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
const duree = Number(
  log
    .match(/Duration: (\d+):(\d+):([\d.]+)/)
    .slice(1)
    .reduce((s, x) => s * 60 + Number(x), 0),
);

const segs = script.segments.map((s) => {
  const m = cible.filter((c) => c.seg === s.id);
  return { id: s.id, mots: m, t: m[0].t, f: m[m.length - 1].f };
});
// Frontière entre deux segments : le plus long silence autour de la jonction.
const coupes = [];
for (let k = 0; k < segs.length - 1; k++) {
  const [a, b] = [segs[k].f - 0.35, segs[k + 1].t + 0.35];
  const candidats = silences.filter(([d, f]) => f > a && d < b);
  const s = candidats.sort((x, y) => y[1] - y[0] - (x[1] - x[0]))[0];
  coupes.push(s ?? [(segs[k].f + segs[k + 1].t) / 2, (segs[k].f + segs[k + 1].t) / 2]);
  if (!s) console.log(`! pas de silence entre ${segs[k].id} et ${segs[k + 1].id}`);
}
mkdirSync(sortie, { recursive: true });
const mots = {};
segs.forEach((s, k) => {
  const avant = k === 0 ? [0, Math.max(0, s.t - 0.1)] : coupes[k - 1];
  const apres = k === segs.length - 1 ? [Math.min(duree, s.f + 0.4), duree] : coupes[k];
  const debut = Math.max(0, avant[1] - Math.min(0.1, (avant[1] - avant[0]) / 2));
  const fin = apres[0] + Math.min(0.2, (apres[1] - apres[0]) / 2);
  const r = spawnSync(FFMPEG, [
    // Coupe à la lecture (avant -i) : les fondus comptent alors depuis le début du segment.
    ...['-y', '-loglevel', 'error', '-ss', debut.toFixed(3), '-to', fin.toFixed(3), '-i', audio],
    ...['-af', `afade=t=in:d=0.02,afade=t=out:st=${(fin - debut - 0.03).toFixed(3)}:d=0.03`],
    ...['-c:a', 'libmp3lame', '-b:a', '192k', join(sortie, `${s.id}.mp3`)],
  ]);
  if (r.status !== 0) throw new Error(`${s.id} : ${r.stderr}`);
  mots[s.id] = s.mots.map((m) => ({
    mot: m.mot,
    t: Math.max(0, Number((m.t - debut).toFixed(3))),
    d: Number(Math.max(0.04, m.f - m.t).toFixed(3)),
  }));
  const devines = s.mots.filter((m) => m.devine).map((m) => m.mot);
  console.log(
    `${s.id.padEnd(5)} ${debut.toFixed(2).padStart(7)} → ${fin.toFixed(2).padStart(7)}  (${(fin - debut).toFixed(1)} s, pause ${(apres[1] - apres[0]).toFixed(2)})` +
      (devines.length ? `  estimés : ${devines.join(' ')}` : ''),
  );
});
writeFileSync(join(sortie, 'mots.json'), JSON.stringify(mots));
console.log(`${exacts}/${A} mots retrouvés · ${segs.length} segments → ${sortie}`);
