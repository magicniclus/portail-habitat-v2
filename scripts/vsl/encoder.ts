// Encode les prises de la VSL : images horodatées (`.vsl/captures/{prise}/images.ffconcat`) →
// `.vsl/video/{prise}.mp4` à 60 images/s (H.264, qualité de travail), plus une planche de contrôle
// (une image par seconde) `.vsl/video/planches/{prise}.jpg`.
// Usage : tsx scripts/vsl/encoder.ts [prise …]   (sans argument : toutes). ffmpeg : variable FFMPEG ou PATH.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const captures = resolve(__dirname, '../../.vsl/captures');
const video = resolve(__dirname, '../../.vsl/video');
const ffmpeg = process.env.FFMPEG ?? 'ffmpeg';

function lancer(args: string[], cwd?: string) {
  const r = spawnSync(ffmpeg, ['-y', '-loglevel', 'error', ...args], { cwd, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(r.stderr || r.error?.message || 'ffmpeg a échoué');
}

mkdirSync(join(video, 'planches'), { recursive: true });
const demandees = process.argv.slice(2);
const prises = readdirSync(captures).filter(
  (d) =>
    existsSync(join(captures, d, 'images.ffconcat')) &&
    (!demandees.length || demandees.includes(d)),
);
for (const prise of prises) {
  const sortie = join(video, `${prise}.mp4`);
  lancer(
    [
      ...['-f', 'concat', '-safe', '0', '-i', 'images.ffconcat'],
      ...['-vf', 'fps=60,format=yuv420p', '-c:v', 'libx264', '-crf', '14', '-preset', 'medium'],
      ...['-movflags', '+faststart', sortie],
    ],
    join(captures, prise),
  );
  const mobile = prise.endsWith('-mobile');
  lancer([
    ...['-i', sortie, '-frames:v', '1', '-q:v', '3'],
    ...['-vf', `fps=1,scale=${mobile ? 234 : 480}:-1,tile=${mobile ? '8x4' : '4x8'}`],
    join(video, 'planches', `${prise}.jpg`),
  ]);
  console.log(`✓ ${prise}`);
}
