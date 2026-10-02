import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { getBytes, ref, uploadBytes, type FirebaseStorage } from 'firebase/storage';
import { afterAll, beforeAll, describe, it } from 'vitest';
import { contexte, creerEnvironnement } from './environnement';
import { semer } from './graine';
import { IDENTITES, PROFILS, membresA1, staffAvec, type Profil } from './profils';

const Mo = 1024 * 1024;
const octets = (taille: number) => new Uint8Array(taille);

type Operation = { lire: string } | { ecrire: string; type: string; taille: number };

interface Cas {
  nom: string;
  op: Operation;
  autorises: Profil[];
}

const uidDe = (p: Profil) => (p === 'anonyme' ? 'anonyme' : IDENTITES[p].uid);

const CAS: Cas[] = [
  { nom: 'lire un logo', op: { lire: 'artisans/a1/logo/logo.png' }, autorises: PROFILS },
  {
    nom: 'envoyer un logo',
    op: { ecrire: 'artisans/a1/logo/{p}.png', type: 'image/png', taille: 1000 },
    autorises: ['proprietaire', 'gerant'],
  },
  {
    nom: 'envoyer un logo de plus de 2 Mo',
    op: { ecrire: 'artisans/a1/logo/gros-{p}.png', type: 'image/png', taille: 2 * Mo + 1 },
    autorises: [],
  },
  {
    nom: 'envoyer un logo qui n’est pas une image',
    op: { ecrire: 'artisans/a1/logo/{p}.svg', type: 'image/svg+xml', taille: 1000 },
    autorises: [],
  },
  {
    nom: 'envoyer une photo de réalisation',
    op: { ecrire: 'artisans/a1/realisations/r1/{p}.jpg', type: 'image/jpeg', taille: 1000 },
    autorises: ['proprietaire', 'gerant', 'collaborateur'],
  },
  {
    nom: 'lire une photo de réalisation',
    op: { lire: 'artisans/a1/realisations/r1/photo.jpg' },
    autorises: PROFILS,
  },
  {
    nom: 'déposer un document (PDF)',
    op: { ecrire: 'artisans/a1/documents/d-{p}/kbis.pdf', type: 'application/pdf', taille: 5000 },
    autorises: ['proprietaire', 'gerant', 'collaborateur'],
  },
  {
    nom: 'déposer un document de plus de 10 Mo',
    op: {
      ecrire: 'artisans/a1/documents/gros-{p}/kbis.pdf',
      type: 'application/pdf',
      taille: 10 * Mo + 1,
    },
    autorises: [],
  },
  {
    nom: 'déposer un exécutable',
    op: {
      ecrire: 'artisans/a1/documents/x-{p}/virus.exe',
      type: 'application/octet-stream',
      taille: 100,
    },
    autorises: [],
  },
  {
    nom: 'remplacer un document existant',
    op: { ecrire: 'artisans/a1/documents/d1/kbis.pdf', type: 'application/pdf', taille: 5000 },
    autorises: [],
  },
  {
    nom: 'lire un document privé',
    op: { lire: 'artisans/a1/documents/d1/kbis.pdf' },
    autorises: [
      ...membresA1('p', 'g', 'c'),
      ...new Set<Profil>([...staffAvec('art'), ...staffAvec('avi'), ...staffAvec('file')]),
    ],
  },
  {
    nom: 'lire une photo d’avis publiée',
    op: { lire: 'avis/av1/photos/photo.jpg' },
    autorises: PROFILS,
  },
  {
    nom: 'écrire une photo d’avis directement',
    op: { ecrire: 'avis/av1/photos/{p}.jpg', type: 'image/jpeg', taille: 1000 },
    autorises: [],
  },
  {
    nom: 'téléverser dans son propre espace',
    op: { ecrire: 'televersements/{uid}/{p}.jpg', type: 'image/jpeg', taille: 1000 },
    autorises: PROFILS.filter((p) => p !== 'anonyme' && p !== 'impersonation'),
  },
  {
    nom: 'écraser un fichier déjà téléversé',
    op: { ecrire: 'televersements/part1/existant.jpg', type: 'image/jpeg', taille: 1000 },
    autorises: [],
  },
  {
    nom: 'téléverser dans l’espace d’un autre',
    op: { ecrire: 'televersements/part1/{p}-intrus.jpg', type: 'image/jpeg', taille: 1000 },
    autorises: ['particulier'],
  },
  {
    nom: 'lire une photo de demande (URL signée uniquement)',
    op: { lire: 'demandes/dem1/photos/photo.jpg' },
    autorises: [],
  },
  {
    nom: 'lire un devis (URL signée uniquement)',
    op: { lire: 'demandes/dem1/devis/a1/devis.pdf' },
    autorises: [],
  },
];

const FICHIERS = [
  'artisans/a1/logo/logo.png',
  'artisans/a1/realisations/r1/photo.jpg',
  'artisans/a1/documents/d1/kbis.pdf',
  'avis/av1/photos/photo.jpg',
  'demandes/dem1/photos/photo.jpg',
  'demandes/dem1/devis/a1/devis.pdf',
  'televersements/part1/existant.jpg',
];

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await creerEnvironnement();
  await semer(env); // les règles Storage lisent les documents `membres`
  await env.withSecurityRulesDisabled(async (ctx) => {
    const stockage = ctx.storage() as unknown as FirebaseStorage;
    await Promise.all(
      FICHIERS.map((f) =>
        uploadBytes(ref(stockage, f), octets(10), {
          contentType: f.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
        }),
      ),
    );
  });
});

afterAll(async () => {
  await env?.cleanup();
});

describe.each(CAS)('$nom', ({ op, autorises }) => {
  it.each(PROFILS)('%s', async (profil) => {
    const stockage = contexte(env, profil).storage() as unknown as FirebaseStorage;
    const chemin = (s: string) => s.replaceAll('{p}', profil).replaceAll('{uid}', uidDe(profil));
    const promesse: Promise<unknown> =
      'lire' in op
        ? getBytes(ref(stockage, chemin(op.lire)))
        : uploadBytes(ref(stockage, chemin(op.ecrire)), octets(op.taille), {
            contentType: op.type,
          });
    await (autorises.includes(profil) ? assertSucceeds(promesse) : assertFails(promesse));
  });
});
