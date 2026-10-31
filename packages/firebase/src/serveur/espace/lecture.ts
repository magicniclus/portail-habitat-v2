import { ErreurMetier } from '@ph/core/erreurs';
import { LIBELLES_ATTRIBUTION_PARTICULIER } from '@ph/core/espace';
import type { STATUTS_DEMANDE } from '@ph/core/schemas';
import type { DocumentSnapshot, Firestore, Timestamp } from 'firebase-admin/firestore';
import { chemins, collections } from '../../chemins';

type StatutDemande = (typeof STATUTS_DEMANDE)[number];
type StatutAttribution = keyof typeof LIBELLES_ATTRIBUTION_PARTICULIER;

export interface ServicesEspace {
  db: Firestore;
  /** Nom lisible d'une prestation (« Rénovation de salle de bain ») ; l'identifiant sinon. */
  nomPrestation: (id: string) => string;
}

/** Demande telle qu'elle apparaît dans « Mes projets » (ESP-01) : jamais le détail d'un autre. */
export interface DemandeEspace {
  id: string;
  reference: string;
  titre: string;
  ville: string;
  envoyeeLe: number;
  statut: StatutDemande;
  estimation: { minCentimes: number; maxCentimes: number };
  nbArtisans: number;
  nbDevis: number;
}

export interface ArtisanDemande {
  artisanId: string;
  nom: string;
  slug?: string;
  note: number;
  nbAvis: number;
  statut: StatutAttribution;
  etat: string;
  devisCentimes?: number;
}

export interface MessageEspace {
  id: string;
  artisanId: string;
  deMoi: boolean;
  texte: string;
  le: number;
}

export interface DetailDemande extends DemandeEspace {
  reponsesLisibles: { question: string; reponse: string }[];
  artisans: ArtisanDemande[];
  messages: MessageEspace[];
}

const ms = (t: unknown) => (t as Timestamp | undefined)?.toMillis?.() ?? 0;

async function artisansDe(db: Firestore, demandeId: string): Promise<ArtisanDemande[]> {
  const attributions = await db.collection(chemins.attributions(demandeId)).get();
  const visibles = attributions.docs.filter(
    (a) => LIBELLES_ATTRIBUTION_PARTICULIER[a.get('statut') as StatutAttribution] !== null,
  );
  const fiches = visibles.length
    ? await db.getAll(...visibles.map((a) => db.doc(chemins.artisanPublic(a.id))))
    : [];
  return visibles.map((a, i) => {
    const f = fiches[i];
    const statut = a.get('statut') as StatutAttribution;
    const devis = a.get('devis') as { montantCentimes: number } | undefined;
    return {
      artisanId: a.id,
      nom: (f?.get('nomCommercial') as string | undefined) ?? 'Artisan',
      ...(f?.get('slug') ? { slug: f.get('slug') as string } : {}),
      note: (f?.get('noteMoyenne') as number | undefined) ?? 0,
      nbAvis: (f?.get('nbAvis') as number | undefined) ?? 0,
      statut,
      etat: LIBELLES_ATTRIBUTION_PARTICULIER[statut] ?? '',
      ...(devis ? { devisCentimes: devis.montantCentimes } : {}),
    };
  });
}

function resume(s: ServicesEspace, d: DocumentSnapshot, artisans: ArtisanDemande[]) {
  const estimation = d.get('estimation') as { minCentimes: number; maxCentimes: number };
  return {
    id: d.id,
    reference: d.get('reference') as string,
    titre: s.nomPrestation(d.get('prestationId') as string),
    ville: (d.get('adresseChantier.ville') as string | undefined) ?? '',
    envoyeeLe: ms(d.get('createdAt')),
    statut: d.get('statut') as StatutDemande,
    estimation: { minCentimes: estimation.minCentimes, maxCentimes: estimation.maxCentimes },
    nbArtisans: artisans.length,
    nbDevis: artisans.filter((a) => a.devisCentimes !== undefined).length,
  };
}

/** « Mes projets » : les 50 dernières demandes du particulier connecté (index particulierUid + date). */
export async function lireMesDemandes(s: ServicesEspace, uid: string): Promise<DemandeEspace[]> {
  const r = await s.db
    .collection(collections.demandes)
    .where('particulierUid', '==', uid)
    .orderBy('createdAt', 'desc')
    .limit(50)
    .get();
  return Promise.all(r.docs.map(async (d) => resume(s, d, await artisansDe(s.db, d.id))));
}

/**
 * Détail d'une demande (ESP-02) : une demande qui n'existe pas et celle d'un autre particulier
 * donnent la même réponse, « introuvable », pour ne rien révéler.
 */
export async function lireMaDemande(
  s: ServicesEspace,
  uid: string,
  demandeId: string,
): Promise<DetailDemande> {
  const d = await s.db.doc(chemins.demande(demandeId)).get();
  if (!d.exists || d.get('particulierUid') !== uid) throw new ErreurMetier('INTROUVABLE');
  const [artisans, messages] = await Promise.all([
    artisansDe(s.db, demandeId),
    s.db.collection(chemins.messages(demandeId)).orderBy('createdAt').limit(500).get(),
  ]);
  return {
    ...resume(s, d, artisans),
    reponsesLisibles:
      (d.get('reponsesLisibles') as { question: string; reponse: string }[] | undefined) ?? [],
    artisans,
    messages: messages.docs.map((m) => ({
      id: m.id,
      artisanId: m.get('artisanId') as string,
      deMoi: m.get('auteurUid') === uid,
      texte: m.get('texte') as string,
      le: ms(m.get('createdAt')),
    })),
  };
}

/** Prénom affiché dans « Bonjour Camille » (profil, sinon première demande). */
export async function lireProfilEspace(db: Firestore, uid: string) {
  const u = await db.doc(chemins.user(uid)).get();
  let prenom = u.get('prenom') as string | undefined;
  if (!prenom) {
    const d = await db
      .collection(collections.demandes)
      .where('particulierUid', '==', uid)
      .limit(1)
      .get();
    prenom = d.docs[0]?.get('contact.prenom') as string | undefined;
  }
  return {
    prenom: prenom ?? null,
    email: (u.get('email') as string | undefined) ?? '',
    telephone: (u.get('telephone') as string | undefined) ?? null,
  };
}
