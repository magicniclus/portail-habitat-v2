import { ErreurMetier } from '@ph/core/erreurs';
import { legendeReseau, NOMS_RESEAUX, RESEAUX, type Reseau } from '@ph/core/studio';
import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import { chemins, collections } from '../../chemins';
import { jetonReseauStudio, type ConfigReseaux } from './comptes';
import { lireProjetStudio } from './projets';
import { publierSurReseau, type OutilsPublication } from './publieurs';

/**
 * Publications du Studio (STUDIO.md §11) : une par vidéo et par réseau, programmée à une heure
 * précise, envoyée par la Function `studioPublier` (toutes les 10 min). Admin SDK uniquement.
 */
export type StatutPublication = 'programmee' | 'en_cours' | 'publiee' | 'echec' | 'annulee';

export interface StatsPublication {
  vues: number;
  likes: number | null;
  commentaires: number | null;
  partages: number | null;
  /** Durée moyenne regardée, en secondes. */
  dureeMoyenneS: number | null;
  /** Part de la vidéo regardée en moyenne (0 à 1). */
  retention: number | null;
  abonnesGagnes: number | null;
  /** Courbe de rétention : part des spectateurs encore là à chaque centième de la vidéo. */
  courbe: number[] | null;
}

export interface PublicationStudio {
  id: string;
  projetId: string;
  reseau: Reseau;
  titre: string;
  legende: string;
  /** Fichier publié (vidéo finie, ou une variante d'accroche). */
  video: string;
  variante: string | null;
  programmeeLe: number;
  statut: StatutPublication;
  lien: string | null;
  idExterne: string | null;
  prive: boolean;
  erreur: string | null;
  publieeLe: number | null;
  stats: StatsPublication | null;
  statsLe: number | null;
}

export interface ServicesPublication {
  db: Firestore;
  horloge: () => number;
  reseaux: ConfigReseaux | null;
  outils: OutilsPublication;
  video: {
    lire: (chemin: string) => Promise<Uint8Array<ArrayBuffer>>;
    urlSignee: (chemin: string) => Promise<string>;
  };
}

const ordre = (a: PublicationStudio, b: PublicationStudio) =>
  a.programmeeLe - b.programmeeLe ||
  NOMS_RESEAUX.indexOf(a.reseau) - NOMS_RESEAUX.indexOf(b.reseau);

const ms = (t: unknown) => (t ? (t as Timestamp).toMillis() : null);

export function versPublication(id: string, d: FirebaseFirestore.DocumentData): PublicationStudio {
  return {
    id,
    projetId: d.projetId as string,
    reseau: d.reseau as Reseau,
    titre: d.titre as string,
    legende: d.legende as string,
    video: d.video as string,
    variante: (d.variante as string | null) ?? null,
    programmeeLe: ms(d.programmeeLe) ?? 0,
    statut: d.statut as StatutPublication,
    lien: (d.lien as string | null) ?? null,
    idExterne: (d.idExterne as string | null) ?? null,
    prive: d.prive === true,
    erreur: (d.erreur as string | null) ?? null,
    publieeLe: ms(d.publieeLe),
    stats: (d.stats as StatsPublication | null) ?? null,
    statsLe: ms(d.statsLe),
  };
}

/** Programme la vidéo finie (ou une variante) sur un ou plusieurs réseaux. */
export async function programmerPublicationStudio(
  s: Pick<ServicesPublication, 'db' | 'horloge'>,
  e: {
    projetId: string;
    reseaux: Reseau[];
    quand: number;
    titre: string;
    texte: string;
    hashtags: string[];
    variante?: string | null;
    auteurUid: string;
  },
): Promise<string[]> {
  const p = await lireProjetStudio(s.db, e.projetId);
  if (!p) throw new ErreurMetier('INTROUVABLE', 'Ce projet n’existe plus.');
  const video = e.variante ? p.rendu?.variantes?.[e.variante]?.video : p.rendu?.video;
  if (!video) throw new ErreurMetier('PRECONDITION', 'La vidéo n’est pas encore prête.');
  const maintenant = s.horloge();
  if (e.quand < maintenant - 60_000)
    throw new ErreurMetier('ENTREE_INVALIDE', 'Cette heure est déjà passée.');
  const comptes = await s.db.getAll(...e.reseaux.map((r) => s.db.doc(chemins.compteStudio(r))));
  const absent = e.reseaux.find((_, i) => !comptes[i]!.exists);
  if (absent)
    throw new ErreurMetier(
      'PRECONDITION',
      `${RESEAUX[absent].libelle} n’est pas connecté (Studio › Réseaux).`,
    );
  const lot = s.db.batch();
  const ids: string[] = [];
  for (const reseau of e.reseaux) {
    const ref = s.db.collection(collections.studioPublications).doc();
    ids.push(ref.id);
    lot.set(ref, {
      schemaVersion: 1,
      projetId: e.projetId,
      reseau,
      titre: e.titre,
      legende: legendeReseau(reseau, { texte: e.texte, hashtags: e.hashtags }),
      video,
      variante: e.variante ?? null,
      couvertureMs: p.plan?.miniature?.tempsMs ?? 1_200,
      programmeeLe: Timestamp.fromMillis(Math.max(e.quand, maintenant)),
      statut: 'programmee',
      lien: null,
      idExterne: null,
      prive: false,
      erreur: null,
      publieeLe: null,
      stats: null,
      statsLe: null,
      auteurUid: e.auteurUid,
      creeLe: Timestamp.fromMillis(maintenant),
    });
  }
  await lot.commit();
  return ids;
}

export async function annulerPublicationStudio(db: Firestore, id: string) {
  const ref = db.doc(chemins.publicationStudio(id));
  await db.runTransaction(async (tx) => {
    const d = await tx.get(ref);
    if (!d.exists) throw new ErreurMetier('INTROUVABLE', 'Cette publication n’existe plus.');
    if (d.get('statut') !== 'programmee')
      throw new ErreurMetier('PRECONDITION', 'Déjà envoyée : elle ne peut plus être annulée.');
    tx.update(ref, { statut: 'annulee' });
  });
}

/** Publications entre deux dates (calendrier), dans l'ordre. */
export async function listerPublicationsStudio(
  db: Firestore,
  o: { depuis: number; jusqua: number },
): Promise<PublicationStudio[]> {
  const q = await db
    .collection(collections.studioPublications)
    .where('programmeeLe', '>=', Timestamp.fromMillis(o.depuis))
    .where('programmeeLe', '<', Timestamp.fromMillis(o.jusqua))
    .orderBy('programmeeLe')
    .limit(500)
    .get();
  return q.docs.map((d) => versPublication(d.id, d.data())).sort(ordre);
}

export async function publicationsProjetStudio(db: Firestore, projetId: string) {
  const q = await db
    .collection(collections.studioPublications)
    .where('projetId', '==', projetId)
    .limit(50)
    .get();
  return q.docs.map((d) => versPublication(d.id, d.data())).sort(ordre);
}

/**
 * Envoie les publications arrivées à leur heure (5 au plus par passage). Chacune est réservée en
 * transaction (`en_cours`) : deux passages simultanés ne publient jamais deux fois.
 */
export async function publierDuesStudio(
  s: ServicesPublication,
): Promise<{ publiees: number; echecs: number }> {
  const maintenant = s.horloge();
  const dues = await s.db
    .collection(collections.studioPublications)
    .where('statut', '==', 'programmee')
    .where('programmeeLe', '<=', Timestamp.fromMillis(maintenant))
    .orderBy('programmeeLe')
    .limit(5)
    .get();
  let publiees = 0;
  let echecs = 0;
  for (const d of dues.docs) {
    const reservee = await s.db.runTransaction(async (tx) => {
      const x = await tx.get(d.ref);
      if (x.get('statut') !== 'programmee') return false;
      tx.update(d.ref, { statut: 'en_cours', debutEnvoi: Timestamp.fromMillis(maintenant) });
      return true;
    });
    if (!reservee) continue;
    const p = versPublication(d.id, d.data());
    try {
      if (!s.reseaux) throw new Error('STUDIO_CHIFFREMENT_CLE manquante.');
      const acces = await jetonReseauStudio(s.db, s.reseaux, p.reseau);
      if (!acces) throw new Error(`${RESEAUX[p.reseau].libelle} n’est plus connecté.`);
      const [octets, url] = await Promise.all([s.video.lire(p.video), s.video.urlSignee(p.video)]);
      const r = await publierSurReseau(s.outils, p.reseau, acces, {
        octets,
        url,
        titre: p.titre,
        legende: p.legende,
        couvertureMs: (d.get('couvertureMs') as number | undefined) ?? 1_200,
      });
      await d.ref.update({
        statut: 'publiee',
        idExterne: r.idExterne,
        lien: r.lien,
        prive: r.prive,
        publieeLe: Timestamp.fromMillis(s.horloge()),
        erreur: null,
      });
      publiees++;
    } catch (e) {
      // Message court et sans jeton (les erreurs des publieurs n'en contiennent pas).
      await d.ref.update({
        statut: 'echec',
        erreur: (e instanceof Error ? e.message : 'Erreur inconnue.').slice(0, 300),
      });
      echecs++;
    }
  }
  return { publiees, echecs };
}

/** Une publication en échec repart à la prochaine minute. */
export async function relancerPublicationStudio(
  s: Pick<ServicesPublication, 'db' | 'horloge'>,
  id: string,
) {
  const ref = s.db.doc(chemins.publicationStudio(id));
  const d = await ref.get();
  if (d.get('statut') !== 'echec')
    throw new ErreurMetier('PRECONDITION', 'Seule une publication en échec peut être relancée.');
  await ref.update({
    statut: 'programmee',
    erreur: null,
    programmeeLe: Timestamp.fromMillis(s.horloge()),
  });
}
