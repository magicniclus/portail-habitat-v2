import { masquerEmail } from '@ph/core/equipe';
import { ErreurMetier } from '@ph/core/erreurs';
import { masquerTel } from '@ph/core/format';
import { Timestamp, type Firestore, type Query } from 'firebase-admin/firestore';
import { chemins, collections } from '../../chemins';
import {
  attribuerDemande,
  convertirEnAppelOffres,
  type ServicesMatching,
} from '../matching/attribuer';
import { auditerAdmin } from './audit';

/** Back-office › Demandes (ADMIN §2.4, maquette « Admin Demandes ») avec la trace du matching. */

export const FILTRES_DEMANDES = [
  'toutes',
  'attente',
  'appel_offres',
  'relation',
  'rejetees',
] as const;
export type FiltreDemandes = (typeof FILTRES_DEMANDES)[number];

const STATUTS: Record<FiltreDemandes, string[] | null> = {
  toutes: null,
  attente: ['nouvelle', 'en_attribution'],
  appel_offres: ['appel_offres'],
  relation: ['attribuee', 'devis_recus', 'signee'],
  rejetees: ['spam', 'annulee'],
};

export interface LigneDemandeAdmin {
  id: string;
  reference: string;
  creeLe: number;
  prestationId: string;
  ville: string;
  budget: { min: number; max: number };
  statut: string;
  source: string;
}

const ms = (t: unknown) => (t as Timestamp | undefined)?.toMillis() ?? 0;

export async function listerDemandesAdmin(
  db: Firestore,
  e: { filtre: FiltreDemandes; reference?: string },
): Promise<LigneDemandeAdmin[]> {
  let q: Query = db.collection(collections.demandes);
  if (e.reference) q = q.where('reference', '==', e.reference.trim().toUpperCase());
  else {
    const statuts = STATUTS[e.filtre];
    if (statuts) q = q.where('statut', 'in', statuts);
    q = q.orderBy('createdAt', 'desc');
  }
  const r = await q.limit(100).get();
  return r.docs.map((d) => ({
    id: d.id,
    reference: d.get('reference') as string,
    creeLe: ms(d.get('createdAt')),
    prestationId: d.get('prestationId') as string,
    ville: (d.get('adresseChantier.ville') as string | undefined) ?? '',
    budget: {
      min: (d.get('estimation.minCentimes') as number | undefined) ?? 0,
      max: (d.get('estimation.maxCentimes') as number | undefined) ?? 0,
    },
    statut: d.get('statut') as string,
    source: d.get('source') as string,
  }));
}

export interface CandidatTrace {
  artisanId: string;
  nom: string;
  score: number;
  distance: number | null;
  exclu: string | null;
  retenu: boolean;
}

export interface FicheDemandeAdmin extends LigneDemandeAdmin {
  /** Prénom et initiale seulement : le reste est masqué (ADM-02). */
  particulier: string;
  emailMasque: string;
  telephoneMasque: string;
  niveau: string | null;
  resultat: string | null;
  candidats: CandidatTrace[];
  attributions: { artisanId: string; nom: string; statut: string; exclusive: boolean }[];
}

export async function lireDemandeAdmin(
  db: Firestore,
  id: string,
): Promise<FicheDemandeAdmin | null> {
  const [d, trace, attributions] = await Promise.all([
    db.doc(chemins.demande(id)).get(),
    db.collection(collections.matching).doc(id).get(),
    db.collection(chemins.attributions(id)).get(),
  ]);
  if (!d.exists) return null;
  const candidats = ((trace.get('candidats') as Record<string, unknown>[] | undefined) ?? []).slice(
    0,
    30,
  );
  const ids = [
    ...new Set([
      ...candidats.map((c) => c.artisanId as string),
      ...attributions.docs.map((a) => a.id),
    ]),
  ];
  const artisans = ids.length ? await db.getAll(...ids.map((x) => db.doc(chemins.artisan(x)))) : [];
  const noms = new Map(
    artisans.map((a) => [a.id, (a.get('nomCommercial') as string | undefined) ?? a.id]),
  );
  const contact = d.get('contact') as {
    prenom: string;
    nom: string;
    email: string;
    telephone: string;
  };
  return {
    id,
    reference: d.get('reference') as string,
    creeLe: ms(d.get('createdAt')),
    prestationId: d.get('prestationId') as string,
    ville: (d.get('adresseChantier.ville') as string | undefined) ?? '',
    budget: {
      min: (d.get('estimation.minCentimes') as number | undefined) ?? 0,
      max: (d.get('estimation.maxCentimes') as number | undefined) ?? 0,
    },
    statut: d.get('statut') as string,
    source: d.get('source') as string,
    particulier: `${contact.prenom} ${contact.nom ? `${contact.nom[0]}.` : ''}`.trim(),
    emailMasque: masquerEmail(contact.email),
    telephoneMasque: masquerTel(contact.telephone),
    niveau: (d.get('qualification.niveau') as string | undefined) ?? null,
    resultat: (trace.get('resultat') as string | undefined) ?? null,
    candidats: candidats
      .map((c) => ({
        artisanId: c.artisanId as string,
        nom: noms.get(c.artisanId as string) ?? (c.artisanId as string),
        score: (c.score as number | undefined) ?? 0,
        distance: (c.distance as number | undefined) ?? null,
        exclu: (c.exclu as string | undefined) ?? null,
        retenu: c.retenu === true,
      }))
      .sort((a, b) => Number(b.retenu) - Number(a.retenu) || b.score - a.score),
    attributions: attributions.docs.map((a) => ({
      artisanId: a.id,
      nom: noms.get(a.id) ?? a.id,
      statut: a.get('statut') as string,
      exclusive: a.get('exclusive') === true,
    })),
  };
}

type Services = ServicesMatching;

/** Spam ou annulation (`demandes.annuler`) : statut, audit avant/après avec le motif. */
export async function rejeterDemandeAdmin(
  s: Services,
  e: { acteurUid: string; demandeId: string; statut: 'spam' | 'annulee'; motif: string },
): Promise<void> {
  const ref = s.db.doc(chemins.demande(e.demandeId));
  const t0 = Timestamp.fromMillis(s.horloge());
  await s.db.runTransaction(async (t) => {
    const d = await t.get(ref);
    if (!d.exists) throw new ErreurMetier('INTROUVABLE');
    const avant = d.get('statut') as string;
    if (['spam', 'annulee', 'signee'].includes(avant))
      throw new ErreurMetier('CONFLIT', 'Cette demande ne peut plus être modifiée.');
    t.update(ref, { statut: e.statut, updatedAt: t0 });
    auditerAdmin(
      s.db,
      {
        acteurUid: e.acteurUid,
        action: 'adminRejeterDemande',
        cible: ref.path,
        avant: { statut: avant },
        apres: { statut: e.statut },
        motif: e.motif,
      },
      s.horloge(),
      t,
    );
  });
}

/**
 * `adminRelancerMatching` : une demande encore nouvelle repasse dans l'algorithme ; une demande
 * garantie sans réponse devient un appel d'offres (artisans déjà sollicités exclus).
 */
export async function relancerMatchingAdmin(
  s: Services,
  e: { acteurUid: string; demandeId: string; motif: string },
): Promise<string> {
  const ref = s.db.doc(chemins.demande(e.demandeId));
  const d = await ref.get();
  if (!d.exists) throw new ErreurMetier('INTROUVABLE');
  const statut = d.get('statut') as string;
  let resultat: string;
  if (statut === 'nouvelle') resultat = await attribuerDemande(s, e.demandeId);
  else if (statut === 'en_attribution') {
    const vues = await s.db.collection(chemins.attributions(e.demandeId)).get();
    const t0 = Timestamp.fromMillis(s.horloge());
    // Les propositions sans réponse expirent : la conversion les écarte ensuite.
    const lot = s.db.batch();
    for (const a of vues.docs.filter((x) =>
      ['proposee', 'vue'].includes(x.get('statut') as string),
    ))
      lot.update(a.ref, { statut: 'expiree', reponduLe: t0 });
    await lot.commit();
    resultat = (await convertirEnAppelOffres(s, e.demandeId)) ? 'appel_offres' : 'inchange';
  } else
    throw new ErreurMetier(
      'PRECONDITION',
      'L’algorithme ne peut être relancé qu’avant toute mise en relation.',
    );
  await auditerAdmin(
    s.db,
    {
      acteurUid: e.acteurUid,
      action: 'adminRelancerMatching',
      cible: ref.path,
      avant: { statut },
      apres: { resultat },
      motif: e.motif,
    },
    s.horloge(),
  );
  return resultat;
}

/** `adminReattribuer` (ajout) : proposition manuelle à un artisan choisi, prévenu comme d'habitude. */
export async function ajouterArtisanDemandeAdmin(
  s: Services,
  e: { acteurUid: string; demandeId: string; artisanId: string; motif: string },
): Promise<void> {
  const refDemande = s.db.doc(chemins.demande(e.demandeId));
  const refAttribution = s.db.doc(chemins.attribution(e.demandeId, e.artisanId));
  const t0 = Timestamp.fromMillis(s.horloge());
  const proprietaire = await s.db.runTransaction(async (t) => {
    const [d, a, existante] = await Promise.all([
      t.get(refDemande),
      t.get(s.db.doc(chemins.artisan(e.artisanId))),
      t.get(refAttribution),
    ]);
    if (!d.exists || !a.exists) throw new ErreurMetier('INTROUVABLE');
    if (existante.exists)
      throw new ErreurMetier('CONFLIT', 'Cet artisan a déjà reçu cette demande.');
    if (a.get('statut') !== 'actif')
      throw new ErreurMetier('PRECONDITION', 'Cet artisan n’est pas actif.');
    t.create(refAttribution, {
      schemaVersion: 1,
      artisanId: e.artisanId,
      demandeId: e.demandeId,
      statut: 'proposee',
      exclusive: false,
      proposeeLe: t0,
      expireLe: Timestamp.fromMillis(s.horloge() + 24 * 3_600_000),
      coordonneesDebloquees: false,
      scoreMatching: 0,
    });
    t.update(refDemande, {
      nbAttributions: ((d.get('nbAttributions') as number | undefined) ?? 0) + 1,
      updatedAt: t0,
    });
    auditerAdmin(
      s.db,
      {
        acteurUid: e.acteurUid,
        action: 'adminReattribuer',
        cible: refDemande.path,
        apres: { artisanId: e.artisanId },
        motif: e.motif,
      },
      s.horloge(),
      t,
    );
    return {
      uid: a.get('proprietaireUid') as string | undefined,
      reference: d.get('reference') as string,
      ville: d.get('adresseChantier.ville') as string,
    };
  });
  if (proprietaire.uid)
    await s.notifier({
      modele: 'nouvelle-demande',
      destinataire: { uid: proprietaire.uid, artisanId: e.artisanId },
      refObjet: `demandes/${e.demandeId}`,
      donnees: {
        reference: proprietaire.reference,
        ville: proprietaire.ville,
        message: `Demande ${proprietaire.reference} à ${proprietaire.ville}. Acceptez-la pour voir les coordonnées du particulier.`,
        lien: '/pro/demandes',
        lienInApp: '/pro/demandes',
        resumeInApp: `Demande ${proprietaire.reference} à ${proprietaire.ville}`,
      },
      titreInApp: 'Nouvelle demande pour vous',
    });
}
