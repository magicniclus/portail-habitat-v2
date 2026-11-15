// Bande son de la VSL : voix posée segment par segment, musique et bruitages fabriqués ici par
// synthèse (aucun enregistrement tiers, donc libres de droits), mixage à -14 LUFS.
// La musique est à 120 battements par minute (un temps = 0,5 s, calé sur les coupes de la
// chronologie) et son énergie suit les actes : pleine, creusée, relancée, régulière, en montée…
// Usage : tsx scripts/vsl/film/son.ts [--voix <dossier>]   → .vsl/film/son.wav (+ pistes séparées)
// À lancer après `rendre.ts` (qui écrit chronologie.json et bruitages.json).
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const racine = resolve(__dirname, '../../..');
const film = join(racine, '.vsl/film');
const ffmpeg = process.env.FFMPEG ?? 'ffmpeg';
const i = process.argv.indexOf('--voix');
const dossierVoix = resolve(racine, i < 0 ? '.vsl/voix' : process.argv[i + 1]!);
const FE = 44100;
const TAU = Math.PI * 2;

interface Segment {
  id: string;
  acte: number;
  debut: number;
  duree: number;
  voix: number;
}
const chrono = JSON.parse(readFileSync(join(film, 'chronologie.json'), 'utf8')) as {
  duree: number;
  segments: Segment[];
};
const bruitages = JSON.parse(readFileSync(join(film, 'bruitages.json'), 'utf8')) as {
  t: number;
  nom: string;
}[];
const N = Math.ceil((chrono.duree + 0.5) * FE);

class Piste {
  g = new Float32Array(N);
  d = new Float32Array(N);
  /** Ajoute un son : `f(k, t)` donne l'échantillon à l'instant local `t` (s) ; `pan` de -1 à 1. */
  son(t0: number, duree: number, f: (t: number, k: number) => number, pan = 0) {
    const a = Math.max(0, Math.round(t0 * FE));
    const n = Math.min(N - a, Math.round(duree * FE));
    const [gg, gd] = [Math.cos(((pan + 1) * Math.PI) / 4), Math.sin(((pan + 1) * Math.PI) / 4)];
    for (let k = 0; k < n; k++) {
      const v = f(k / FE, k);
      this.g[a + k]! += v * gg;
      this.d[a + k]! += v * gd;
    }
  }
  ecrire(fichier: string) {
    const brut = new Float32Array(N * 2);
    for (let k = 0; k < N; k++) {
      brut[2 * k] = this.g[k]!;
      brut[2 * k + 1] = this.d[k]!;
    }
    const r = spawnSync(
      ffmpeg,
      [
        '-y',
        '-loglevel',
        'error',
        '-f',
        'f32le',
        '-ar',
        String(FE),
        '-ac',
        '2',
        '-i',
        'pipe:0',
        '-c:a',
        'pcm_s16le',
        fichier,
      ],
      { input: Buffer.from(brut.buffer), maxBuffer: 1 << 30 },
    );
    if (r.status !== 0) throw new Error(String(r.stderr));
  }
}

// Bruit reproductible (même mixage à chaque rendu).
let graine = 20261115;
const hasard = () => ((graine = (graine * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
const BRUIT = Float32Array.from({ length: FE * 4 }, hasard);
const bruit = (k: number) => BRUIT[k % BRUIT.length]!;
const sin = (f: number, t: number) => Math.sin(TAU * f * t);
const note = (demiTons: number) => 261.63 * 2 ** (demiTons / 12); // do4 = 0

// ---------- Musique ----------
/** Énergie de 0 à 1 selon l'acte (section 7 du découpage). */
const relance = bruitages.find((b) => b.nom === 'relance')?.t ?? 0;
const acte8 = chrono.segments.filter((s) => s.acte === 8);
function energie(t: number): number {
  const s =
    chrono.segments.find((x) => t >= x.debut && t < x.debut + x.duree) ?? chrono.segments.at(-1)!;
  if (s.acte === 1) return 1;
  if (s.acte === 2) return 0.3;
  if (s.acte === 3) return t >= relance ? 0.9 : 0.3;
  if (s.acte <= 6) return 0.6;
  if (s.acte === 7) return 0.7;
  if (s.acte === 8)
    return 0.75 + 0.25 * ((t - acte8[0]!.debut) / (acte8.at(-1)!.debut - acte8[0]!.debut + 0.01));
  if (s.acte === 9) return 0.12;
  if (s.acte === 10) return 0.55;
  return 1;
}
const ACCORDS = [
  [0, 4, 7], // do
  [-5, -1, 2], // sol
  [-3, 0, 4], // la mineur
  [-7, -3, 0], // fa
];
function musique(): Piste {
  const p = new Piste();
  const depart = 0.5; // sur le « ding » du plan 1
  const fin = chrono.duree - 3.6; // l'accord final prend le relais
  for (let mesure = 0; depart + mesure * 2 < fin; mesure++) {
    const t0 = depart + mesure * 2;
    const e = energie(t0 + 0.01);
    const acc = ACCORDS[mesure % 4]!;
    // Nappe : toujours là, c'est elle qui tient les passages creusés.
    for (const [n, dt] of acc.map((x, j) => [x, j] as const))
      p.son(
        t0,
        2.3,
        (t) =>
          Math.min(1, t / 0.35) *
          Math.min(1, (2.3 - t) / 0.4) *
          0.05 *
          (sin(note(n), t) + 0.5 * sin(note(n) * 1.004, t) + 0.25 * sin(note(n + 12), t)),
        (dt - 1) * 0.5,
      );
    // Basse sur les temps 1 et 3.
    for (const b of [0, 1])
      p.son(t0 + b, 0.9, (t) => Math.exp(-t * 3) * (0.1 + 0.08 * e) * sin(note(acc[0]! - 24), t));
    // Arpège en croches, plus présent quand l'énergie monte.
    for (let c = 0; c < 8; c++) {
      if (e < 0.25 && c % 2) continue;
      const n = acc[[0, 1, 2, 1, 0, 2, 1, 2][c]!]! + (c > 3 && e > 0.7 ? 24 : 12);
      p.son(
        t0 + c * 0.25,
        0.5,
        (t) =>
          Math.exp(-t * 9) * (0.035 + 0.075 * e) * (sin(note(n), t) + 0.3 * sin(note(n) * 2, t)),
        c % 2 ? 0.45 : -0.45,
      );
    }
    if (e > 0.45) {
      const g = (e - 0.35) * 0.5;
      for (let b = 0; b < 4; b++) {
        // Grosse caisse sur chaque temps, contretemps au charleston, claquement sur 2 et 4.
        p.son(
          t0 + b * 0.5,
          0.22,
          (t) =>
            Math.exp(-t * 16) *
            g *
            1.1 *
            Math.sin(TAU * (48 * t + (70 / 30) * (1 - Math.exp(-t * 30)))),
        );
        p.son(
          t0 + b * 0.5 + 0.25,
          0.06,
          (t, k) => Math.exp(-t * 70) * g * 0.22 * (bruit(k) - bruit(k + 1)),
          0.3,
        );
        if (b % 2)
          p.son(
            t0 + b * 0.5,
            0.14,
            (t, k) => Math.exp(-t * 28) * g * 0.3 * (bruit(k * 3) - 0.6 * bruit(k * 3 + 2)),
            -0.2,
          );
      }
    }
  }
  return p;
}

// ---------- Bruitages ----------
const cloche = (p: Piste, t: number, gain: number, sourd = false) => {
  for (const [f, a, d] of sourd
    ? [
        [659, 1, 5],
        [988, 0.3, 7],
      ]
    : [
        [1318.5, 1, 4.5],
        [1976, 0.55, 6],
        [2637, 0.3, 8],
        [3951, 0.12, 11],
      ])
    p.son(
      t,
      sourd ? 0.9 : 1.3,
      (x) => Math.min(1, x / (sourd ? 0.03 : 0.002)) * Math.exp(-x * d!) * gain * a! * sin(f!, x),
    );
};
const SONS: Record<string, (p: Piste, t: number, rang: number) => void> = {
  ding: (p, t) => cloche(p, t, 0.34),
  sourd: (p, t, r) => cloche(p, t, 0.16 * 0.75 ** r, true),
  tic: (p, t) =>
    p.son(t, 0.05, (x, k) => Math.exp(-x * 90) * 0.16 * (sin(1900, x) + 0.5 * bruit(k))),
  impact: (p, t) => {
    p.son(
      t,
      0.5,
      (x) =>
        Math.exp(-x * 9) * 0.5 * Math.sin(TAU * (42 * x + (60 / 22) * (1 - Math.exp(-x * 22)))),
    );
    p.son(
      t,
      0.12,
      (x, k) => Math.exp(-x * 40) * 0.12 * (bruit(k) + bruit(k + 1) + bruit(k + 2)) * 0.5,
    );
  },
  whoosh: (p, t) => {
    let etat = 0;
    p.son(t - 0.15, 0.7, (x, k) => {
      const env = Math.sin((Math.PI * x) / 0.7) ** 2;
      etat += (0.04 + 0.5 * env) * (bruit(k) - etat);
      return etat * env * 0.3;
    });
  },
  rature: (p, t) =>
    p.son(
      t,
      0.24,
      (x, k) =>
        Math.sin((Math.PI * x) / 0.24) * 0.2 * (bruit(k) - bruit(k + 1)) * (0.6 + 0.4 * sin(34, x)),
    ),
  montee: (p, t) =>
    p.son(
      t,
      1.3,
      (x, k) =>
        (x / 1.3) ** 2 *
        0.1 *
        (Math.sin(TAU * (220 * x + 170 * x * x)) + 0.5 * (bruit(k) - bruit(k + 1))),
    ),
  relance: (p, t) => {
    SONS.impact!(p, t, 0);
    p.son(t, 1.6, (x, k) => Math.exp(-x * 2.6) * 0.14 * (bruit(k) - bruit(k + 1)));
  },
  clavier: (p, t) => {
    for (let n = 0; n < 16; n++)
      p.son(
        t + n * 0.16 + 0.04 * hasard(),
        0.03,
        (x, k) => Math.exp(-x * 160) * 0.09 * (bruit(k * 2) + 0.6 * sin(2400 + 300 * hasard(), x)),
      );
  },
  glisse: (p, t) =>
    p.son(
      t,
      0.6,
      (x) => Math.sin((Math.PI * x) / 0.6) * 0.09 * Math.sin(TAU * (380 * x + 180 * x * x)),
    ),
  note: (p, t) => {
    for (const n of [0, 7, 16])
      p.son(t, 3, (x) => Math.min(1, x / 0.3) * Math.exp(-x * 0.9) * 0.07 * sin(note(n), x));
  },
  accord: (p, t) => {
    for (const n of [-24, -12, 0, 4, 7, 12, 16])
      p.son(
        t,
        3.5,
        (x) =>
          Math.min(1, x / 0.01) *
          Math.exp(-x * 1.1) *
          0.11 *
          (sin(note(n), x) + 0.3 * sin(note(n) * 2, x)),
        (n % 5) / 5 - 0.4,
      );
    SONS.impact!(p, t, 0);
  },
};
[0, 2, 4, 7, 9, 12].forEach((n, r) => {
  // Six notes montantes, une par outil (plan 22).
  SONS[`n${r + 1}`] = (p, t) =>
    p.son(
      t,
      0.9,
      (x) => Math.exp(-x * 5) * 0.17 * (sin(note(n + 12), x) + 0.35 * sin(note(n + 24), x)),
    );
});

function lufs(fichier: string): number {
  const r = spawnSync(
    ffmpeg,
    ['-hide_banner', '-nostats', '-i', fichier, '-af', 'ebur128', '-f', 'null', '-'],
    { encoding: 'utf8' },
  );
  const m = [...r.stderr.matchAll(/I:\s+(-?[\d.]+) LUFS/g)].at(-1);
  if (!m) throw new Error(`Mesure impossible : ${fichier}`);
  return Number(m[1]);
}
function lancer(args: string[]) {
  const r = spawnSync(ffmpeg, ['-y', '-loglevel', 'error', ...args], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(r.stderr);
}

function main() {
  const fx = new Piste();
  const rangs: Record<string, number> = {};
  for (const b of bruitages) {
    const f = SONS[b.nom];
    if (!f) throw new Error(`Bruitage inconnu : ${b.nom}`);
    f(fx, b.t, (rangs[b.nom] = (rangs[b.nom] ?? -1) + 1));
  }
  fx.ecrire(join(film, 'bruitages.wav'));
  musique().ecrire(join(film, 'musique.wav'));

  // Voix : chaque segment posé à son instant (fichier unique `voix.wav` accepté à la place plus tard).
  const entrees = chrono.segments.flatMap((s) => ['-i', join(dossierVoix, `${s.id}.mp3`)]);
  const filtres = chrono.segments.map(
    (s, n) => `[${n}:a]aresample=${FE},adelay=${Math.round(s.voix * 1000)}:all=1[v${n}]`,
  );
  lancer([
    ...entrees,
    '-filter_complex',
    `${filtres.join(';')};${chrono.segments.map((_, n) => `[v${n}]`).join('')}amix=inputs=${chrono.segments.length}:normalize=0,apad=whole_dur=${chrono.duree}[a]`,
    ...['-map', '[a]', '-ac', '2', '-c:a', 'pcm_s16le', join(film, 'voix.wav')],
  ]);

  // Musique 18 dB sous la voix (en niveau perçu), bruitages un peu en retrait, puis -14 LUFS.
  const [lv, lm] = [lufs(join(film, 'voix.wav')), lufs(join(film, 'musique.wav'))];
  const gainMusique = lv - 18 - lm;
  lancer([
    ...[
      '-i',
      join(film, 'voix.wav'),
      '-i',
      join(film, 'musique.wav'),
      '-i',
      join(film, 'bruitages.wav'),
    ],
    '-filter_complex',
    `[1:a]volume=${gainMusique.toFixed(2)}dB[m];[2:a]volume=-5dB[b];[0:a][m][b]amix=inputs=3:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[a]`,
    ...['-map', '[a]', '-t', String(chrono.duree), '-c:a', 'pcm_s16le', join(film, 'son-brut.wav')],
  ]);
  // Une voix très dynamique laisse loudnorm sous la cible : on rattrape l'écart, crêtes limitées à -1,5 dB.
  let rattrapage = 0;
  for (let passe = 0; passe < 3; passe++) {
    lancer([
      ...['-i', join(film, 'son-brut.wav')],
      ...[
        '-af',
        `volume=${rattrapage.toFixed(2)}dB,alimiter=limit=0.84:level=disabled:attack=3:release=60`,
      ],
      ...['-ar', '48000', '-c:a', 'pcm_s16le', join(film, 'son.wav')],
    ]);
    const ecart = -14 - lufs(join(film, 'son.wav'));
    if (Math.abs(ecart) < 0.3) break;
    rattrapage += ecart;
  }
  writeFileSync(
    join(film, 'mixage.txt'),
    `voix ${lv} LUFS · musique ${lm} LUFS (gain ${gainMusique.toFixed(1)} dB) · final ${lufs(join(film, 'son.wav'))} LUFS\n`,
  );
  console.log(readFileSync(join(film, 'mixage.txt'), 'utf8').trim());
}
main();
