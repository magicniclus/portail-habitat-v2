// Essai local des captures : copie de démonstration déjà lancée (STUDIO_DEMO_EXTERNE=1).
import { NOMS_SCENES } from '@ph/core/studio';
import type { ProjetStudio } from '@ph/firebase/studio';
import { bucketFichiers } from '@ph/firebase/admin';
import { join } from 'node:path';
import { capturer } from '../src/capturer';

const dossier = process.argv[2]!;
const scenes = (process.env.SCENES?.split(',') ?? NOMS_SCENES) as typeof NOMS_SCENES;
async function main() {
  const p = {
    id: 'essai',
    captures: {},
    version: 1,
    plan: {
      format: (process.env.FORMAT ?? 'vertical') as 'vertical',
      titre: 't',
      plans: [],
      sousTitres: true,
      musique: false,
      captures: scenes.map((scene, i) => ({ id: `c${i}`, scene })),
      artisan: {
        nom: 'Martin Plomberie',
        metier: 'Plombier',
        ville: 'Bordeaux',
        noteMoyenne: 4.9,
        nombreAvis: 37,
      },
    },
  } as unknown as ProjetStudio;
  const t0 = Date.now();
  const r = await capturer(p);
  console.log('captures en', Math.round((Date.now() - t0) / 1000), 's', Object.keys(r).length);
  for (const [cle, chemin] of Object.entries(r))
    await bucketFichiers()
      .file(chemin)
      .download({ destination: join(dossier, `${cle.replace(':', '-')}.mp4`) });
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
