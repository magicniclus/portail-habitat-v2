import {
  moyenneApres,
  niveauRisque,
  scoreRisqueAvis,
  textesProches,
  type NiveauRisque,
} from '@ph/core/avis';
import { ErreurMetier } from '@ph/core/erreurs';
import { Timestamp, type DocumentSnapshot, type Firestore } from 'firebase-admin/firestore';
import { chemins, collections } from '../../chemins';
import type { Notifier } from '../comptes/services';
import { auditerAdmin } from './audit';

/** Back-office › Avis (ADMIN §2.6, maquette « Admin Avis ») : file, score de risque, décisions. */

export const FILTRES_AVIS = ['attente', 'risque', 'publies', 'tous'] as const;
export type FiltreAvis = (typeof FILTRES_AVIS)[number];

export interface AvisAdmin {
  id: string;
  artisan: string;
  note: number;
  /** Nom affiché publiquement (« Paul G. »), jamais l'email. */
  auteur: string;
  creeLe: number;
  texte: string;
  statut: string;
  risque: { score: number; niveau: NiveauRisque; raisons: string[] } | null;
  signalements: number;
}

const ms = (t: unknown) => (t as Timestamp | undefined)?.toMillis() ?? 0;
const H48 = 48 * 3_600_000;

/** Signaux de risque d'un avis en attente (auteur, IP, texte, lien avec l'entreprise). */
async function risque(db: Firestore, a: DocumentSnapshot): Promise<AvisAdmin['risque']> {
  const auteur = await db.doc(`${chemins.avis(a.id)}/prive/auteur`).get();
  const ipHash = auteur.get('ipHash') as string | undefined;
  const uid = auteur.get('auteurUid') as string | undefined;
  const artisanId = a.get('artisanId') as string;
  const [memeIp, user, membre, artisan, voisins] = await Promise.all([
    ipHash ? db.collectionGroup('prive').where('ipHash', '==', ipHash).count().get() : null,
    uid ? db.doc(chemins.user(uid)).get() : null,
    uid ? db.doc(chemins.membre(artisanId, uid)).get() : null,
    db.doc(chemins.artisan(artisanId)).get(),
    db.collection(collections.avis).where('artisanId', '==', artisanId).limit(30).get(),
  ]);
  const texte = a.get('texte') as string;
  const r = scoreRisqueAvis({
    compteRecent: user?.exists === true && ms(a.get('createdAt')) - ms(user.get('createdAt')) < H48,
    memeIp: Math.max(0, (memeIp?.data().count ?? 1) - 1),
    texteDuplique: voisins.docs.some(
      (v) => v.id !== a.id && textesProches(texte, v.get('texte') as string),
    ),
    lienArtisan:
      membre?.exists === true ||
      (auteur.get('auteurEmail') as string | undefined) === artisan.get('emailContact'),
    sansPreuve: a.get('preuve.type') === 'aucune' && !a.get('demandeId'),
  });
  return { ...r, niveau: niveauRisque(r.score) };
}

export async function listerAvisAdmin(db: Firestore, filtre: FiltreAvis): Promise<AvisAdmin[]> {
  let q = db.collection(collections.avis).orderBy('createdAt', 'desc');
  if (filtre === 'attente' || filtre === 'risque') q = q.where('statut', '==', 'en_attente');
  if (filtre === 'publies') q = q.where('statut', '==', 'publie');
  const r = await q.limit(50).get();
  const noms = new Map<string, string>();
  const lignes = await Promise.all(
    r.docs.map(async (a) => {
      const artisanId = a.get('artisanId') as string;
      if (!noms.has(artisanId))
        noms.set(
          artisanId,
          ((await db.doc(chemins.artisan(artisanId)).get()).get('nomCommercial') as
            string | undefined) ?? artisanId,
        );
      const [r2, signalements] = await Promise.all([
        a.get('statut') === 'en_attente' ? risque(db, a) : null,
        db.collection(chemins.signalements(a.id)).where('statut', '==', 'ouvert').count().get(),
      ]);
      return {
        id: a.id,
        artisan: noms.get(artisanId)!,
        note: a.get('note') as number,
        auteur: a.get('nomAffiche') as string,
        creeLe: ms(a.get('createdAt')),
        texte: a.get('texte') as string,
        statut: a.get('statut') as string,
        risque: r2,
        signalements: signalements.data().count,
      };
    }),
  );
  return filtre === 'risque'
    ? lignes
        .filter((l) => l.risque?.niveau === 'eleve')
        .sort((x, y) => y.risque!.score - x.risque!.score)
    : lignes;
}

export type ActionAvis = 'publier' | 'refuser' | 'preuve' | 'suspendre';

const TRANSITIONS: Record<ActionAvis, { de: string[]; vers: string }> = {
  publier: { de: ['en_attente', 'suspendu'], vers: 'publie' },
  refuser: { de: ['en_attente'], vers: 'refuse' },
  preuve: { de: ['en_attente'], vers: 'en_attente' },
  suspendre: { de: ['publie'], vers: 'suspendu' },
};

/**
 * `adminModererAvis` : le texte n'est jamais modifié. La note de l'entreprise suit (publication,
 * suspension) ; l'auteur est prévenu ; la tâche de la file est close.
 */
export async function modererAvisAdmin(
  s: { db: Firestore; horloge: () => number; notifier: Notifier },
  e: { acteurUid: string; avisId: string; action: ActionAvis; motif: string; motifRefus?: string },
): Promise<void> {
  if (e.action === 'refuser' && !e.motifRefus)
    throw new ErreurMetier('ENTREE_INVALIDE', 'Choisissez le motif envoyé à l’auteur.');
  const ref = s.db.doc(chemins.avis(e.avisId));
  const refAuteur = s.db.doc(`${chemins.avis(e.avisId)}/prive/auteur`);
  const refTache = s.db.collection(collections.filesModeration).doc(`avis-${e.avisId}`);
  const t0 = Timestamp.fromMillis(s.horloge());
  const { de, vers } = TRANSITIONS[e.action];
  const r = await s.db.runTransaction(async (t) => {
    const [a, auteur, tache] = await Promise.all([t.get(ref), t.get(refAuteur), t.get(refTache)]);
    if (!a.exists) throw new ErreurMetier('INTROUVABLE');
    const avant = a.get('statut') as string;
    if (!de.includes(avant)) throw new ErreurMetier('CONFLIT', 'Cet avis a déjà été traité.');
    const refArtisan = s.db.doc(chemins.artisan(a.get('artisanId') as string));
    const artisan = await t.get(refArtisan);
    const note = a.get('note') as number;
    const stats = {
      moyenne: (artisan.get('noteMoyenne') as number | undefined) ?? 0,
      nb: (artisan.get('nbAvis') as number | undefined) ?? 0,
    };
    if (vers === 'publie' || (avant === 'publie' && vers !== 'publie')) {
      const n = moyenneApres(stats, note, vers === 'publie' ? 'ajout' : 'retrait');
      t.update(refArtisan, { noteMoyenne: n.moyenne, nbAvis: n.nb, updatedAt: t0 });
    }
    t.update(ref, {
      statut: vers,
      moderation: { parUid: e.acteurUid, le: t0, motif: e.motifRefus ?? e.motif },
      ...(vers === 'publie' && !a.get('publieLe') ? { publieLe: t0 } : {}),
      updatedAt: t0,
    });
    if (
      tache.exists &&
      e.action !== 'preuve' &&
      ['a_traiter', 'en_cours'].includes(tache.get('statut') as string)
    )
      t.update(refTache, {
        statut: 'traitee',
        resolution: e.motif,
        traiteePar: e.acteurUid,
        traiteeLe: t0,
      });
    auditerAdmin(
      s.db,
      {
        acteurUid: e.acteurUid,
        action: 'adminModererAvis',
        cible: ref.path,
        avant: { statut: avant },
        apres: { statut: vers, action: e.action },
        motif: e.motif,
      },
      s.horloge(),
      t,
    );
    return {
      email: auteur.get('auteurEmail') as string | undefined,
      uid: auteur.get('auteurUid') as string | undefined,
      nomArtisan: (artisan.get('nomCommercial') as string | undefined) ?? '',
      proprietaire: artisan.get('proprietaireUid') as string | undefined,
      artisanId: artisan.id,
    };
  });
  const modele =
    e.action === 'publier'
      ? 'avis-publie'
      : e.action === 'refuser'
        ? 'avis-refuse'
        : e.action === 'preuve'
          ? 'avis-preuve-demandee'
          : null;
  if (modele && r.email)
    await s.notifier({
      modele,
      destinataire: r.uid ? { uid: r.uid, email: r.email } : { email: r.email },
      refObjet: ref.path,
      donnees: {
        message:
          e.action === 'publier'
            ? `Votre avis sur ${r.nomArtisan} est en ligne. Merci pour votre retour.`
            : e.action === 'refuser'
              ? `Votre avis sur ${r.nomArtisan} n’a pas été publié : ${e.motifRefus}.`
              : `Pour publier votre avis sur ${r.nomArtisan}, envoyez-nous une facture ou un devis signé en répondant à cet email.`,
        lien: '/mon-espace/avis',
      },
    });
  if (e.action === 'publier' && r.proprietaire)
    await s.notifier({
      modele: 'nouvel-avis',
      destinataire: { uid: r.proprietaire, artisanId: r.artisanId },
      refObjet: ref.path,
      donnees: {
        message: 'Un nouvel avis est publié sur votre fiche. Vous pouvez y répondre.',
        lien: '/pro/avis',
        lienInApp: '/pro/avis',
        resumeInApp: 'Nouvel avis publié',
      },
      titreInApp: 'Nouvel avis',
    });
}

/** Suppression définitive (`avis.supprimer`) : avis, auteur et signalements ; note recalculée. */
export async function supprimerAvisAdmin(
  s: { db: Firestore; horloge: () => number },
  e: { acteurUid: string; avisId: string; motif: string },
): Promise<void> {
  const ref = s.db.doc(chemins.avis(e.avisId));
  const signalements = await s.db.collection(chemins.signalements(e.avisId)).listDocuments();
  const t0 = Timestamp.fromMillis(s.horloge());
  const refTache = s.db.collection(collections.filesModeration).doc(`avis-${e.avisId}`);
  await s.db.runTransaction(async (t) => {
    const [a, tache] = await Promise.all([t.get(ref), t.get(refTache)]);
    if (!a.exists) throw new ErreurMetier('INTROUVABLE');
    const refArtisan = s.db.doc(chemins.artisan(a.get('artisanId') as string));
    const artisan = await t.get(refArtisan);
    if (a.get('statut') === 'publie') {
      const n = moyenneApres(
        {
          moyenne: (artisan.get('noteMoyenne') as number | undefined) ?? 0,
          nb: (artisan.get('nbAvis') as number | undefined) ?? 0,
        },
        a.get('note') as number,
        'retrait',
      );
      t.update(refArtisan, { noteMoyenne: n.moyenne, nbAvis: n.nb, updatedAt: t0 });
    }
    t.delete(ref);
    t.delete(s.db.doc(`${chemins.avis(e.avisId)}/prive/auteur`));
    for (const x of signalements) t.delete(x);
    if (tache.exists && ['a_traiter', 'en_cours'].includes(tache.get('statut') as string))
      t.update(refTache, {
        statut: 'traitee',
        resolution: e.motif,
        traiteePar: e.acteurUid,
        traiteeLe: t0,
      });
    auditerAdmin(
      s.db,
      {
        acteurUid: e.acteurUid,
        action: 'adminSupprimerAvis',
        cible: ref.path,
        avant: { statut: a.get('statut'), note: a.get('note'), artisanId: a.get('artisanId') },
        motif: e.motif,
      },
      s.horloge(),
      t,
    );
  });
}
