// Rendu de la VSL : la chronologie est calculée depuis la voix (un fichier et un minutage des mots
// par segment), la page `film.html` est photographiée image par image (30 images/s) et ffmpeg encode.
// Usage : tsx scripts/vsl/film/rendre.ts            film muet complet → .vsl/film/image.mp4
//         tsx scripts/vsl/film/rendre.ts --planche  une image par plan → .vsl/film/planches/
//         tsx scripts/vsl/film/rendre.ts --de 10 --a 20   extrait
//         options : --sans-st (sans sous-titres incrustés), --voix <dossier> (défaut .vsl/voix)
// ffmpeg : variable FFMPEG ou PATH.
import { chromium } from '@playwright/test';
import { spawn, spawnSync } from 'node:child_process';
import {
  createReadStream,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, resolve } from 'node:path';

const racine = resolve(__dirname, '../../..');
const sortie = join(racine, '.vsl/film');
const ffmpeg = process.env.FFMPEG ?? 'ffmpeg';
const IPS = 30;
const arg = (nom: string) => {
  const i = process.argv.indexOf(nom);
  return i < 0 ? undefined : process.argv[i + 1];
};
const drapeau = (nom: string) => process.argv.includes(nom);

interface Mot {
  mot: string;
  t: number;
  d: number;
}
interface Segment {
  id: string;
  texte: string;
  debut: number;
  duree: number;
  voix: number;
  mots: Mot[];
}

/** Silence avant la voix et respiration après, par segment (secondes) ; le reste suit la voix. */
const AVANT: Record<string, number> = { p01: 0.9 };
const APRES: Record<string, number> = {
  p12: 1.3,
  p15: 1.3,
  p17: 1.3,
  p06: 0.7,
  p10b: 0.8,
  p13: 0.9,
  p14: 0.7,
  p22g: 1.0,
  p24: 0.8,
  p28: 3.2,
};

/** Chronologie : chaque segment dure sa voix, arrondie au temps de la musique (120 bpm = 0,5 s). */
export function chronologie(
  dossierVoix: string,
  script = join(__dirname, 'script.json'),
): { duree: number; segments: Segment[] } {
  // Une version courte apporte son propre script (segments gardés, silences, pas de la grille).
  const { segments, avant, apres, pas } = JSON.parse(readFileSync(script, 'utf8')) as {
    segments: { id: string; texte: string }[];
    avant?: Record<string, number>;
    apres?: Record<string, number>;
    pas?: number;
  };
  const [AV, AP, PAS] = [{ ...AVANT, ...avant }, { ...APRES, ...apres }, pas ?? 0.5];
  const mots = JSON.parse(readFileSync(join(dossierVoix, 'mots.json'), 'utf8')) as Record<
    string,
    Mot[]
  >;
  let t = 0;
  const liste = segments.map((s) => {
    const m = mots[s.id];
    if (!m?.length) throw new Error(`Voix sans minutage pour ${s.id}`);
    const voix = AV[s.id] ?? 0.3;
    const fin = m.at(-1)!.t + m.at(-1)!.d;
    const duree = Math.ceil((voix + fin + (AP[s.id] ?? 0.45)) / PAS - 1e-6) * PAS;
    const seg = {
      ...s,
      debut: t,
      duree,
      voix: t + voix,
      mots: m.map((w) => ({ ...w, t: t + voix + w.t })),
    };
    t += duree;
    return seg;
  });
  return { duree: t, segments: liste };
}

/** Captures du site converties en suites d'images (30 images/s), une fois. */
function captures(noms: string[]): Record<string, number> {
  const images: Record<string, number> = {};
  for (const nom of noms) {
    const dossier = join(sortie, 'cap', nom);
    if (!existsSync(dossier) || !readdirSync(dossier).length) {
      mkdirSync(dossier, { recursive: true });
      const largeur = nom.endsWith('-mobile') ? 780 : 1280;
      const r = spawnSync(ffmpeg, [
        ...['-y', '-loglevel', 'error', '-i', join(racine, '.vsl/video', `${nom}.mp4`)],
        ...['-vf', `fps=${IPS},scale=${largeur}:-2`, '-q:v', '3', join(dossier, '%05d.jpg')],
      ]);
      if (r.status !== 0) throw new Error(`Capture ${nom} : ${String(r.stderr)}`);
    }
    images[nom] = readdirSync(dossier).length;
  }
  return images;
}

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
};

async function main() {
  mkdirSync(sortie, { recursive: true });
  const dossierVoix = resolve(racine, arg('--voix') ?? '.vsl/voix');
  const scriptVersion = join(dossierVoix, 'script.json');
  const chrono = chronologie(dossierVoix, existsSync(scriptVersion) ? scriptVersion : undefined);
  const vertical = arg('--format') === 'vertical';
  const [largeur, hauteur] = vertical ? [1080, 1920] : [1920, 1080];
  writeFileSync(join(sortie, 'chronologie.json'), JSON.stringify(chrono, null, 1));
  const html = readFileSync(join(__dirname, 'film.html'), 'utf8');
  const images = captures([
    ...new Set(
      [...html.matchAll(/data-cap="([^"]+)"/g)]
        .map((m) => m[1]!)
        // Format vertical : les prises mobiles remplacent celles du bureau.
        .flatMap((nom) => (vertical ? [nom, nom.replace('-bureau', '-mobile')] : [nom])),
    ),
  ]);

  // Petit serveur local : polices du site, page du film et images des captures.
  const serveur = createServer((req, res) => {
    const chemin = join(racine, decodeURIComponent((req.url ?? '/').split('?')[0]!));
    if (!chemin.startsWith(racine) || !existsSync(chemin)) return void res.writeHead(404).end();
    res.writeHead(200, { 'content-type': TYPES[extname(chemin)] ?? 'application/octet-stream' });
    createReadStream(chemin).pipe(res);
  });
  await new Promise<void>((ok) => serveur.listen(0, '127.0.0.1', ok));
  const port = (serveur.address() as { port: number }).port;

  const navigateur = await chromium.launch({
    args: [`--window-size=${largeur},${hauteur}`, '--force-device-scale-factor=1'],
  });
  const page = await (await navigateur.newContext({ viewport: null })).newPage();
  page.on('pageerror', (e) => console.error('[page]', e.message));
  await page.addInitScript(
    ([c, cap, sansSt, format, souple]) =>
      Object.assign(window, {
        __CHRONO: c,
        __CAPTURES: cap,
        __SANS_ST: sansSt,
        __FORMAT: format,
        __SOUPLE: souple,
      }),
    [
      chrono,
      { base: '/.vsl/film/cap', images },
      drapeau('--sans-st'),
      vertical ? 'vertical' : 'paysage',
      existsSync(scriptVersion),
    ] as const,
  );
  await page.goto(`http://127.0.0.1:${port}/scripts/vsl/film/film.html`);
  // Les polices ne se chargent qu'à leur premier emploi : on les demande avant la première image.
  await page.evaluate(() =>
    Promise.all([
      document.fonts.load('800 40px "Source Sans 3"'),
      document.fonts.load('italic 600 40px "Source Serif 4"'),
    ]).then(() => document.fonts.ready),
  );
  const aller = (n: number) =>
    page.evaluate(
      (i) => (window as unknown as { allerA: (i: number) => Promise<number> }).allerA(i),
      n,
    );
  const cdp = await page.context().newCDPSession(page);
  const photo = async (qualite: number) =>
    Buffer.from(
      (await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: qualite })).data,
      'base64',
    );

  const extras = await page.evaluate(() => {
    const w = window as unknown as { bruitages: () => unknown; lignesSousTitres: () => unknown };
    return { bruitages: w.bruitages(), sousTitres: w.lignesSousTitres() };
  });
  writeFileSync(join(sortie, 'bruitages.json'), JSON.stringify(extras.bruitages, null, 1));
  writeFileSync(join(sortie, 'sous-titres.json'), JSON.stringify(extras.sousTitres, null, 1));

  if (drapeau('--planche')) {
    // Une image par plan, prise aux trois quarts du plan (animations posées), plus des instants libres.
    mkdirSync(join(sortie, 'planches'), { recursive: true });
    const instants = arg('--instants')?.split(',').map(Number);
    const cibles = instants
      ? instants.map((t) => ({ nom: `t${t.toFixed(1).padStart(6, '0')}`, t }))
      : drapeau('--revue')
        ? // Revue complète : chaque segment au milieu et juste avant sa fin (`r-NN-id-a|b`).
          chrono.segments.flatMap((s, n) =>
            (arg('--seul') ? arg('--seul')!.split(',').includes(s.id) : true)
              ? [
                  { nom: `r-${String(n).padStart(2, '0')}-${s.id}-a`, t: s.debut + s.duree * 0.45 },
                  { nom: `r-${String(n).padStart(2, '0')}-${s.id}-b`, t: s.debut + s.duree - 0.2 },
                ]
              : [],
          )
        : chrono.segments.map((s) => ({ nom: s.id, t: s.debut + s.duree * 0.78 }));
    for (const c of cibles) {
      await aller(Math.round(c.t * IPS));
      writeFileSync(join(sortie, 'planches', `${c.nom}.jpg`), await photo(88));
    }
    console.log(
      `✓ ${cibles.length} images dans .vsl/film/planches (durée du film : ${chrono.duree} s)`,
    );
  } else {
    const de = Math.round(Number(arg('--de') ?? 0) * IPS);
    const a = Math.round(Number(arg('--a') ?? chrono.duree) * IPS);
    const fichier = join(sortie, arg('--sortie') ?? 'image.mp4');
    const enc = spawn(
      ffmpeg,
      [
        ...[
          '-y',
          '-loglevel',
          'error',
          '-f',
          'image2pipe',
          '-c:v',
          'mjpeg',
          '-framerate',
          String(IPS),
          '-i',
          'pipe:0',
        ],
        ...[
          '-c:v',
          'libx264',
          '-crf',
          '17',
          '-preset',
          'medium',
          '-pix_fmt',
          'yuv420p',
          '-movflags',
          '+faststart',
          fichier,
        ],
      ],
      { stdio: ['pipe', 'inherit', 'inherit'] },
    );
    const debut = Date.now();
    for (let n = de; n < a; n++) {
      await aller(n);
      if (!enc.stdin.write(await photo(93))) await new Promise((ok) => enc.stdin.once('drain', ok));
      if ((n - de) % 300 === 0)
        console.log(`  ${((n - de) / IPS).toFixed(0)} s / ${((a - de) / IPS).toFixed(0)} s`);
    }
    enc.stdin.end();
    await new Promise((ok) => enc.on('close', ok));
    console.log(
      `✓ ${fichier} (${((a - de) / IPS).toFixed(1)} s, rendu en ${Math.round((Date.now() - debut) / 1000)} s)`,
    );
  }
  await navigateur.close();
  serveur.close();
}

if (require.main === module)
  main()
    .then(() => process.exit(0))
    .catch((e: unknown) => {
      console.error(e);
      process.exit(1);
    });
