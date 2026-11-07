// Essai local du rendu (émulateurs) : prise de synthèse → vidéo finale. Usage :
// firebase emulators:exec "... npx tsx apps/studio/essais/rendu.ts <dossier des fichiers>"
import { bucketFichiers } from '@ph/firebase/admin';
import type { ProjetStudio } from '@ph/firebase/studio';
import type { PlanMontage } from '@ph/core/studio';
import { join } from 'node:path';
import { rendre } from '../src/rendre';

const dossier = process.argv[2]!;
const plan: PlanMontage = {
  format: (process.env.FORMAT as PlanMontage['format']) ?? 'vertical',
  titre: 'Essai',
  plans: [
    {
      id: 'p1',
      source: { debut: 0, fin: 3_000 },
      visuel: 'carton',
      carton: 'Artisans : stop !',
      camera: 'cachee',
      calques: [],
    },
    {
      id: 'p2',
      source: { debut: 3_500, fin: 8_000 },
      visuel: 'ecran',
      camera: 'bas',
      calques: [
        {
          type: 'texte',
          texte: 'Des clients gratuitement',
          style: 'accroche',
          position: 'haut',
          debut: 0,
          fin: 2_500,
        },
        {
          type: 'compteur',
          de: 0,
          a: 10,
          libelle: 'demandes par mois',
          position: 'centre',
          debut: 1_500,
          fin: 4_400,
        },
      ],
    },
    {
      id: 'p3',
      source: { debut: 9_000, fin: 13_000 },
      visuel: 'camera',
      camera: 'cachee',
      calques: [
        {
          type: 'notification',
          titre: 'Nouvelle demande',
          texte: 'Salle de bain à Mérignac',
          debut: 300,
          fin: 3_500,
        },
      ],
    },
    {
      id: 'p4',
      source: { debut: 13_000, fin: 18_000 },
      visuel: 'ecran',
      camera: 'coin',
      zoom: { x: 0.1, y: 0.1, largeur: 0.5 },
      calques: [
        {
          type: 'liste',
          elements: ['Fiche gratuite', 'Site internet', 'Devis et factures'],
          position: 'centre',
          debut: 0,
          fin: 4_500,
        },
        { type: 'fleche', x: 0.5, y: 0.3, debut: 3_000, fin: 4_900 },
      ],
    },
  ],
  captures: [],
  artisan: null,
  sousTitres: true,
  musique: true,
  miniature: { texte: '10 demandes gratuites', accent: 'gratuites', tempsMs: 4_500 },
};
const mots = [
  ['Artisans,', 200, 800],
  ['arrêtez', 850, 1400],
  ['de', 1450, 1600],
  ['payer', 1650, 2200],
  ['vos', 3600, 3900],
  ['clients.', 3950, 4600],
  ['Jusqu’à', 5000, 5500],
  ['10', 5550, 5900],
  ['demandes', 5950, 6600],
  ['gratuites.', 6650, 7500],
  ['Votre', 9200, 9600],
  ['fiche', 9650, 10100],
  ['travaille', 10150, 10800],
  ['pour', 10850, 11100],
  ['vous.', 11150, 11800],
  ['Tout', 13200, 13500],
  ['est', 13550, 13700],
  ['gratuit.', 13750, 14600],
].map(([texte, debut, fin]) => ({
  texte: texte as string,
  debut: debut as number,
  fin: fin as number,
}));

async function main() {
  const b = bucketFichiers();
  for (const f of ['ecran', 'camera', 'voix'])
    await b.upload(join(dossier, `${f}.webm`), {
      destination: `studio/sa/pr1/${f}.webm`,
      contentType: f === 'voix' ? 'audio/webm' : 'video/webm',
    });
  const p: ProjetStudio = {
    id: 'essai',
    auteurUid: 'sa',
    titre: 'Essai',
    statut: 'rendu',
    format: plan.format,
    camera: true,
    theme: null,
    sujets: [],
    sujet: null,
    prise: {
      id: 'pr1',
      fichiers: {
        ecran: 'studio/sa/pr1/ecran.webm',
        camera: 'studio/sa/pr1/camera.webm',
        voix: 'studio/sa/pr1/voix.webm',
      },
      dureeMs: 20_000,
    },
    mots,
    plan,
    version: 1,
    captures: {},
    rendu: null,
    erreur: null,
    coutCentimes: 0,
    createdAt: 0,
    updatedAt: 0,
  };
  const t0 = Date.now();
  const r = await rendre(p);
  console.log('rendu en', Math.round((Date.now() - t0) / 1000), 's', r);
  await b.file(r.video).download({ destination: join(dossier, `sortie-${plan.format}.mp4`) });
  await b.file(r.srt).download({ destination: join(dossier, 'sortie.srt') });
  await b.file(r.miniature).download({ destination: join(dossier, 'miniature.jpg') });
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
