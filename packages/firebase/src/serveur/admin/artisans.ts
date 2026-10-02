import { masquerEmail } from '@ph/core/equipe';
import { ErreurMetier } from '@ph/core/erreurs';
import { masquerTel } from '@ph/core/format';
import { Timestamp, type DocumentData, type Firestore, type Query } from 'firebase-admin/firestore';
import { chemins, collections } from '../../chemins';
import { lireDocumentsPro, type DocumentPro } from '../pro/documents';
import { auditerAdmin } from './audit';

/** Back-office › Artisans (ADMIN §2.3, maquette « Admin Artisans »). */

export const FILTRES_ARTISANS = ['tous', 'en_ligne', 'a_verifier', 'suspendus', 'payants'] as const;
export type FiltreArtisans = (typeof FILTRES_ARTISANS)[number];

export interface LigneArtisanAdmin {
  id: string;
  nom: string;
  siren: string;
  metier: string;
  ville: string;
  note: number | null;
  statut: 'en_ligne' | 'a_verifier' | 'suspendu' | 'hors_ligne';
  plan: string;
}

const LIMITE = 200;

function statutDe(d: DocumentData): LigneArtisanAdmin['statut'] {
  if (d.statut === 'suspendu' || d.statut === 'dereference') return 'suspendu';
  if (['a_faire', 'en_cours'].includes(d.verification?.statut)) return 'a_verifier';
  return d.enLigne ? 'en_ligne' : 'hors_ligne';
}

export async function listerArtisansAdmin(
  db: Firestore,
  e: { filtre: FiltreArtisans; q?: string },
): Promise<LigneArtisanAdmin[]> {
  let req: Query = db.collection(collections.artisans);
  if (e.filtre === 'suspendus') req = req.where('statut', '==', 'suspendu');
  if (e.filtre === 'a_verifier')
    req = req.where('verification.statut', 'in', ['a_faire', 'en_cours']);
  if (e.filtre === 'en_ligne')
    req = req.where('enLigne', '==', true).where('statut', '==', 'actif');
  if (e.filtre === 'payants') req = req.where('plan', 'in', ['visibilite', 'premium']);
  const docs = (await req.limit(LIMITE).get()).docs;
  const q = e.q?.trim().toLowerCase();
  return docs
    .map((d) => {
      const a = d.data();
      return {
        id: d.id,
        nom: (a.nomCommercial as string | undefined) ?? '—',
        siren: (a.siren as string | undefined) ?? '',
        metier: (a.metierPrincipal as string | undefined) ?? '',
        ville:
          (a.adresseSiege?.ville as string | undefined) ?? (a.ville as string | undefined) ?? '',
        note: (a.nbAvis as number | undefined) ? (a.noteMoyenne as number) : null,
        statut: statutDe(a),
        plan: (a.plan as string | undefined) ?? 'gratuit',
      };
    })
    .filter((l) => !q || `${l.nom} ${l.siren} ${l.ville}`.toLowerCase().includes(q))
    .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
}

export interface FicheArtisanAdmin extends LigneArtisanAdmin {
  proprietaireUid: string | null;
  emailMasque: string | null;
  telephoneMasque: string | null;
  zone: string;
  verification: string;
  decennale: string;
  credits: number;
  tauxReponse: number | null;
  tempsReponseMin: number | null;
  sanctions: { type: string; motif: string; le: number; levee: boolean }[];
  documents: DocumentPro[];
  equipe: { uid: string; nom: string; role: string; statut: string }[];
  siegesMax: number;
  notes: { texte: string; parUid: string; le: number }[];
}

export async function lireArtisanAdmin(
  db: Firestore,
  id: string,
): Promise<FicheArtisanAdmin | null> {
  const [a, portefeuille, sanctions, notes, documents, membres] = await Promise.all([
    db.doc(chemins.artisan(id)).get(),
    db.doc(chemins.portefeuille(id)).get(),
    db.collection(collections.sanctions).where('artisanId', '==', id).limit(20).get(),
    db.collection(collections.notesInternes).where('cible', '==', `artisans/${id}`).limit(20).get(),
    lireDocumentsPro(db, id),
    db.collection(chemins.membres(id)).get(),
  ]);
  const profils = membres.empty
    ? []
    : await db.getAll(...membres.docs.map((m) => db.doc(chemins.user(m.id))));
  if (!a.exists) return null;
  const d = a.data()!;
  const fin = (d.assuranceDecennale?.fin as Timestamp | undefined)?.toMillis();
  return {
    id,
    nom: d.nomCommercial ?? '—',
    siren: d.siren ?? '',
    metier: d.metierPrincipal ?? '',
    ville: d.adresseSiege?.ville ?? '',
    note: d.nbAvis ? d.noteMoyenne : null,
    statut: statutDe(d),
    plan: d.plan ?? 'gratuit',
    proprietaireUid: d.proprietaireUid ?? null,
    emailMasque: d.emailContact ? masquerEmail(d.emailContact) : null,
    telephoneMasque: d.telephonePublic ? masquerTel(d.telephonePublic) : null,
    zone: d.zoneIntervention
      ? `${d.adresseSiege?.ville ?? ''} + ${d.zoneIntervention.rayonKm} km`
      : '—',
    verification: d.verification?.statut ?? 'a_faire',
    decennale: fin ? new Date(fin).toISOString().slice(0, 10) : '',
    credits: (portefeuille.get('soldeCredits') as number | undefined) ?? 0,
    tauxReponse: d.tauxReponse ?? null,
    tempsReponseMin: d.tempsReponseMoyenMin ?? null,
    sanctions: sanctions.docs
      .map((x) => ({
        type: x.get('type') as string,
        motif: x.get('motif') as string,
        le: (x.get('debut') as Timestamp).toMillis(),
        levee: Boolean(x.get('leveeLe')),
      }))
      .sort((x, y) => y.le - x.le),
    documents,
    equipe: membres.docs.map((m, i) => ({
      uid: m.id,
      nom: (profils[i]?.get('nomAffiche') as string | undefined) ?? 'Membre',
      role: m.get('role') as string,
      statut: m.get('statut') as string,
    })),
    siegesMax: (d.siegesMax as number | undefined) ?? 1,
    notes: notes.docs
      .map((x) => ({
        texte: x.get('texte') as string,
        parUid: x.get('parUid') as string,
        le: (x.get('createdAt') as Timestamp).toMillis(),
      }))
      .sort((x, y) => y.le - x.le),
  };
}

type Services = { db: Firestore; horloge: () => number };

/** `adminVerifierArtisan` : vérification manuelle validée (identité, documents). */
export async function verifierArtisanAdmin(
  s: Services,
  e: { acteurUid: string; artisanId: string; motif: string },
): Promise<void> {
  const ref = s.db.doc(chemins.artisan(e.artisanId));
  const t0 = Timestamp.fromMillis(s.horloge());
  await s.db.runTransaction(async (t) => {
    const a = await t.get(ref);
    if (!a.exists) throw new ErreurMetier('INTROUVABLE');
    const avant = a.get('verification.statut') as string | undefined;
    t.update(ref, {
      'verification.statut': 'verifie',
      'verification.verifieLe': t0,
      updatedAt: t0,
    });
    auditerAdmin(
      s.db,
      {
        acteurUid: e.acteurUid,
        action: 'adminVerifierArtisan',
        cible: chemins.artisan(e.artisanId),
        avant: { verification: avant ?? null },
        apres: { verification: 'verifie' },
        motif: e.motif,
      },
      s.horloge(),
      t,
    );
  });
}

/**
 * `adminSanctionner` : suspension (fiche retirée de l'annuaire, plus aucune demande) ou levée.
 * Sanction et audit dans la même transaction (ADMIN §4).
 */
export async function sanctionnerArtisanAdmin(
  s: Services,
  e: { acteurUid: string; artisanId: string; action: 'suspendre' | 'lever'; motif: string },
): Promise<void> {
  const ref = s.db.doc(chemins.artisan(e.artisanId));
  const t0 = Timestamp.fromMillis(s.horloge());
  const actives = s.db
    .collection(collections.sanctions)
    .where('artisanId', '==', e.artisanId)
    .where('type', '==', 'suspension');
  await s.db.runTransaction(async (t) => {
    const [a, enCours] = await Promise.all([t.get(ref), t.get(actives)]);
    if (!a.exists) throw new ErreurMetier('INTROUVABLE');
    const avant = a.get('statut') as string;
    if (e.action === 'suspendre') {
      if (avant === 'suspendu')
        throw new ErreurMetier('CONFLIT', 'Cette entreprise est déjà suspendue.');
      t.create(s.db.collection(collections.sanctions).doc(), {
        schemaVersion: 1,
        createdAt: t0,
        artisanId: e.artisanId,
        type: 'suspension',
        motif: e.motif,
        refs: [],
        debut: t0,
        parUid: e.acteurUid,
      });
    } else {
      if (avant !== 'suspendu')
        throw new ErreurMetier('CONFLIT', 'Cette entreprise n’est pas suspendue.');
      for (const x of enCours.docs.filter((x) => !x.get('leveeLe')))
        t.update(x.ref, { leveeLe: t0, fin: t0, updatedAt: t0 });
    }
    const apres = e.action === 'suspendre' ? 'suspendu' : 'actif';
    t.update(ref, { statut: apres, updatedAt: t0 });
    auditerAdmin(
      s.db,
      {
        acteurUid: e.acteurUid,
        action: 'adminSanctionner',
        cible: chemins.artisan(e.artisanId),
        avant: { statut: avant },
        apres: { statut: apres },
        motif: e.motif,
      },
      s.horloge(),
      t,
    );
  });
}

/** Plafond d'un geste commercial sans `credits.crediter_illimite` (ADMIN §1). */
export const PLAFOND_GESTE_CREDITS = 5;

/** `adminCrediter` : geste commercial en crédits, mouvement `geste_admin` journalisé. */
export async function crediterArtisanAdmin(
  s: Services,
  e: { acteurUid: string; illimite: boolean; artisanId: string; credits: number; motif: string },
): Promise<{ soldeCredits: number }> {
  if (!Number.isInteger(e.credits) || e.credits < 1) throw new ErreurMetier('ENTREE_INVALIDE');
  if (!e.illimite && e.credits > PLAFOND_GESTE_CREDITS)
    throw new ErreurMetier(
      'PERMISSION_REFUSEE',
      `Au plus ${PLAFOND_GESTE_CREDITS} crédits par geste.`,
    );
  const ref = s.db.doc(chemins.portefeuille(e.artisanId));
  const t0 = Timestamp.fromMillis(s.horloge());
  return s.db.runTransaction(async (t) => {
    const [p, a] = await Promise.all([t.get(ref), t.get(s.db.doc(chemins.artisan(e.artisanId)))]);
    if (!a.exists) throw new ErreurMetier('INTROUVABLE');
    const avant = (p.get('soldeCredits') as number | undefined) ?? 0;
    const solde = avant + e.credits;
    t.set(
      ref,
      {
        schemaVersion: 1,
        soldeCredits: solde,
        creditsInclusMois: (p.get('creditsInclusMois') as number | undefined) ?? 0,
        creditsInclusRestants: (p.get('creditsInclusRestants') as number | undefined) ?? 0,
        updatedAt: t0,
      },
      { merge: true },
    );
    t.create(s.db.collection(chemins.mouvements(e.artisanId)).doc(), {
      schemaVersion: 1,
      type: 'geste_admin',
      credits: e.credits,
      soldeApres: solde,
      par: e.acteurUid,
      motif: e.motif,
      createdAt: t0,
    });
    auditerAdmin(
      s.db,
      {
        acteurUid: e.acteurUid,
        action: 'adminCrediter',
        cible: chemins.artisan(e.artisanId),
        avant: { soldeCredits: avant },
        apres: { soldeCredits: solde },
        motif: e.motif,
      },
      s.horloge(),
      t,
    );
    return { soldeCredits: solde };
  });
}
