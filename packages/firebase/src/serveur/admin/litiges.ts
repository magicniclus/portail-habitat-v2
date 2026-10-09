import { ErreurMetier } from '@ph/core/erreurs';
import {
  FieldValue,
  Timestamp,
  type DocumentSnapshot,
  type Firestore,
} from 'firebase-admin/firestore';
import { chemins, collections } from '../../chemins';
import type { Notifier } from '../comptes/services';
import { auditerAdmin } from './audit';

/** Back-office › Litiges et médiation (ADMIN §2.7, maquette « Admin Litiges »). */

export const FILTRES_LITIGES = ['ouverts', 'termines'] as const;
export type FiltreLitiges = (typeof FILTRES_LITIGES)[number];

export interface LitigeAdmin {
  id: string;
  titre: string;
  particulier: string;
  artisan: string;
  statut: string;
  creeLe: number;
}

export interface FicheLitigeAdmin extends LitigeAdmin {
  description: string;
  echanges: {
    le: number;
    auteur: 'particulier' | 'artisan' | 'mediateur' | 'decision';
    texte: string;
  }[];
}

const ms = (t: unknown) => (t as Timestamp | undefined)?.toMillis() ?? 0;
/** « Camille M. » : prénom et initiale seulement. */
const court = (nom: string | undefined) => {
  const [p, n] = (nom ?? 'Particulier').split(' ');
  return n ? `${p} ${n[0]}.` : p!;
};

async function ligne(db: Firestore, d: DocumentSnapshot): Promise<LitigeAdmin> {
  const [u, a] = await Promise.all([
    db.doc(chemins.user(d.get('particulierUid') as string)).get(),
    db.doc(chemins.artisan(d.get('artisanId') as string)).get(),
  ]);
  const description = d.get('description') as string;
  return {
    id: d.id,
    titre: description.length > 70 ? `${description.slice(0, 70)}…` : description,
    particulier: court(u.get('nomAffiche') as string | undefined),
    artisan: (a.get('nomCommercial') as string | undefined) ?? (d.get('artisanId') as string),
    statut: d.get('statut') as string,
    creeLe: ms(d.get('createdAt')),
  };
}

export async function listerLitigesAdmin(
  db: Firestore,
  filtre: FiltreLitiges,
): Promise<LitigeAdmin[]> {
  const r = await db
    .collection(collections.litiges)
    .where('statut', 'in', filtre === 'ouverts' ? ['ouvert', 'mediation'] : ['resolu', 'clos'])
    .orderBy('createdAt', 'desc')
    .limit(50)
    .get();
  return Promise.all(r.docs.map((d) => ligne(db, d)));
}

export async function lireLitigeAdmin(db: Firestore, id: string): Promise<FicheLitigeAdmin | null> {
  const d = await db.collection(collections.litiges).doc(id).get();
  if (!d.exists) return null;
  const echanges =
    (d.get('echanges') as { le: Timestamp; par: string; texte: string }[] | undefined) ?? [];
  return {
    ...(await ligne(db, d)),
    description: d.get('description') as string,
    echanges: echanges.map((x) => ({
      le: x.le.toMillis(),
      auteur:
        x.par === 'particulier' || x.par === 'artisan' || x.par === 'decision'
          ? x.par
          : 'mediateur',
      texte: x.texte,
    })),
  };
}

type Services = { db: Firestore; horloge: () => number; notifier: Notifier };

async function prevenir(
  s: Services,
  d: DocumentSnapshot,
  modele: 'litige-message' | 'litige-decision',
  message: string,
) {
  const proprietaire = (await s.db.doc(chemins.artisan(d.get('artisanId') as string)).get()).get(
    'proprietaireUid',
  ) as string | undefined;
  const donnees = { message, resumeInApp: message.slice(0, 120) };
  const titreInApp =
    modele === 'litige-message' ? 'Message du médiateur' : 'Décision sur votre litige';
  await s.notifier({
    modele,
    destinataire: { uid: d.get('particulierUid') as string },
    refObjet: d.ref.path,
    donnees: { ...donnees, lien: '/mon-espace', lienInApp: '/mon-espace' },
    titreInApp,
  });
  if (proprietaire)
    await s.notifier({
      modele,
      destinataire: { uid: proprietaire, artisanId: d.get('artisanId') as string },
      refObjet: d.ref.path,
      donnees: { ...donnees, lien: '/pro/tableau-de-bord', lienInApp: '/pro/tableau-de-bord' },
      titreInApp,
    });
}

/** Message du médiateur aux deux parties ; le litige passe en médiation. */
export async function ecrireLitigeAdmin(
  s: Services,
  e: { acteurUid: string; id: string; texte: string },
): Promise<void> {
  const ref = s.db.collection(collections.litiges).doc(e.id);
  const t0 = Timestamp.fromMillis(s.horloge());
  const d = await s.db.runTransaction(async (t) => {
    const d = await t.get(ref);
    if (!d.exists) throw new ErreurMetier('INTROUVABLE');
    if (!['ouvert', 'mediation'].includes(d.get('statut') as string))
      throw new ErreurMetier('CONFLIT', 'Ce litige est terminé.');
    t.update(ref, {
      statut: 'mediation',
      echanges: FieldValue.arrayUnion({ le: t0, par: `admin:${e.acteurUid}`, texte: e.texte }),
      updatedAt: t0,
    });
    auditerAdmin(
      s.db,
      {
        acteurUid: e.acteurUid,
        action: 'adminMessageLitige',
        cible: ref.path,
        avant: { statut: d.get('statut') },
        apres: { statut: 'mediation' },
      },
      s.horloge(),
      t,
    );
    return d;
  });
  await prevenir(s, d, 'litige-message', e.texte);
}

/**
 * Clôture : résolu à l'amiable ou clos sans suite, avec un rappel ou un avertissement éventuel
 * à l'artisan (`sanctions`). Une suspension se décide depuis la fiche de l'artisan.
 */
export async function deciderLitigeAdmin(
  s: Services,
  e: {
    acteurUid: string;
    id: string;
    issue: 'resolu' | 'clos';
    sanction?: 'rappel' | 'avertissement';
    motif: string;
  },
): Promise<void> {
  const ref = s.db.collection(collections.litiges).doc(e.id);
  const t0 = Timestamp.fromMillis(s.horloge());
  const d = await s.db.runTransaction(async (t) => {
    const d = await t.get(ref);
    if (!d.exists) throw new ErreurMetier('INTROUVABLE');
    if (!['ouvert', 'mediation'].includes(d.get('statut') as string))
      throw new ErreurMetier('CONFLIT', 'Ce litige est déjà terminé.');
    const texte = `${e.issue === 'resolu' ? 'Résolu' : 'Clos'} : ${e.motif}`;
    t.update(ref, {
      statut: e.issue,
      echanges: FieldValue.arrayUnion({ le: t0, par: 'decision', texte }),
      updatedAt: t0,
    });
    if (e.sanction)
      t.create(s.db.collection(collections.sanctions).doc(), {
        schemaVersion: 1,
        createdAt: t0,
        artisanId: d.get('artisanId') as string,
        type: e.sanction,
        motif: e.motif,
        refs: [ref.path],
        debut: t0,
        parUid: e.acteurUid,
      });
    auditerAdmin(
      s.db,
      {
        acteurUid: e.acteurUid,
        action: 'adminDeciderLitige',
        cible: ref.path,
        avant: { statut: d.get('statut') },
        apres: { statut: e.issue, ...(e.sanction ? { sanction: e.sanction } : {}) },
        motif: e.motif,
      },
      s.horloge(),
      t,
    );
    return d;
  });
  await prevenir(
    s,
    d,
    'litige-decision',
    `${e.issue === 'resolu' ? 'Litige résolu' : 'Litige clos'} : ${e.motif}`,
  );
}
