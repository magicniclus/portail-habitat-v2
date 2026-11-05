import type { MotTranscrit } from '@ph/core/studio';
import type { ProjetStudio } from '@ph/firebase/studio';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { dansDossier, executer, sonder } from './outils';
import { telecharger } from './stockage';

const RACINE = new URL('..', import.meta.url).pathname;

/**
 * Transcription (Whisper, en local) de la voix, et 4 images de la caméra pour que Claude juge le
 * regard et l'énergie de chaque passage.
 */
export async function transcrire(p: ProjetStudio): Promise<{
  mots: MotTranscrit[];
  images: { type: 'image/jpeg'; base64: string }[];
}> {
  if (!p.prise) throw new Error('aucune prise');
  const prise = p.prise;
  return dansDossier(async (d) => {
    const voix = await telecharger(prise.fichiers.voix, d, 'voix.webm');
    const wav = join(d, 'voix.wav');
    await executer('ffmpeg', ['-y', '-i', voix, '-ac', '1', '-ar', '16000', wav]);
    const sortie = await executer(process.env.PYTHON ?? 'python3', [
      join(RACINE, 'whisper.py'),
      wav,
    ]);
    const mots = (JSON.parse(sortie) as MotTranscrit[]).filter((m) => m.fin > m.debut);
    const images: { type: 'image/jpeg'; base64: string }[] = [];
    if (prise.fichiers.camera) {
      const cam = await telecharger(prise.fichiers.camera, d, 'camera.webm');
      const { dureeMs } = await sonder(cam);
      const pas = Math.max(1, (dureeMs || prise.dureeMs) / 1000 / 4);
      await executer('ffmpeg', [
        '-y',
        '-i',
        cam,
        '-vf',
        `fps=1/${pas.toFixed(2)},scale=512:-2`,
        '-frames:v',
        '4',
        '-q:v',
        '5',
        join(d, 'cam-%d.jpg'),
      ]);
      for (const f of (await readdir(d)).filter((x) => x.startsWith('cam-')).sort())
        images.push({
          type: 'image/jpeg',
          base64: (await readFile(join(d, f))).toString('base64'),
        });
    }
    return { mots, images };
  });
}
