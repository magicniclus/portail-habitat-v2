import type { AnnonceLue } from '@ph/core/admin';
import { ErreurMetier } from '@ph/core/erreurs';
import { Timestamp, type DocumentSnapshot, type Firestore } from 'firebase-admin/firestore';
import { collections } from '../../chemins';
import { auditerAdmin } from './audit';

/** Annonces in-app (ADMIN §2.11) : publiées et arrêtées depuis l'admin, lues par les espaces. */

const versAnnonce = (d: DocumentSnapshot): AnnonceLue => {
  const fin = (d.get('fin') as Timestamp | undefined)?.toMillis();
  return {
    id: d.id,
    titre: d.get('titre') as string,
    texte: d.get('texte') as string,
    cible: d.get('cible') as AnnonceLue['cible'],
    ton: d.get('ton') as AnnonceLue['ton'],
    actif: d.get('actif') === true,
    debut: (d.get('debut') as Timestamp).toMillis(),
    ...(fin !== undefined ? { fin } : {}),
  };
};

/** Annonces actives (filtrées ensuite par public et par dates, `annoncesVisibles`). */
export async function lireAnnoncesActives(db: Firestore): Promise<AnnonceLue[]> {
  const r = await db.collection(collections.annonces).where('actif', '==', true).limit(20).get();
  return r.docs.map(versAnnonce);
}

export async function listerAnnoncesAdmin(db: Firestore): Promise<AnnonceLue[]> {
  const r = await db.collection(collections.annonces).orderBy('debut', 'desc').limit(50).get();
  return r.docs.map(versAnnonce);
}

type Services = { db: Firestore; horloge: () => number };

export async function publierAnnonceAdmin(
  s: Services,
  e: {
    acteurUid: string;
    titre: string;
    texte: string;
    cible: AnnonceLue['cible'];
    ton: AnnonceLue['ton'];
    debut: number;
    fin?: number;
  },
): Promise<string> {
  if (e.fin !== undefined && e.fin <= e.debut)
    throw new ErreurMetier('ENTREE_INVALIDE', 'La fin doit suivre le début.');
  const ref = s.db.collection(collections.annonces).doc();
  const t0 = Timestamp.fromMillis(s.horloge());
  const batch = s.db.batch();
  batch.create(ref, {
    schemaVersion: 1,
    createdAt: t0,
    titre: e.titre,
    texte: e.texte,
    cible: e.cible,
    ton: e.ton,
    debut: Timestamp.fromMillis(e.debut),
    ...(e.fin !== undefined ? { fin: Timestamp.fromMillis(e.fin) } : {}),
    actif: true,
  });
  await batch.commit();
  await auditerAdmin(
    s.db,
    {
      acteurUid: e.acteurUid,
      action: 'adminPublierAnnonce',
      cible: ref.path,
      apres: { titre: e.titre, cible: e.cible },
    },
    s.horloge(),
  );
  return ref.id;
}

export async function arreterAnnonceAdmin(
  s: Services,
  e: { acteurUid: string; id: string; motif: string },
): Promise<void> {
  const ref = s.db.collection(collections.annonces).doc(e.id);
  const t0 = Timestamp.fromMillis(s.horloge());
  await s.db.runTransaction(async (t) => {
    const d = await t.get(ref);
    if (!d.exists) throw new ErreurMetier('INTROUVABLE');
    t.update(ref, { actif: false, updatedAt: t0 });
    auditerAdmin(
      s.db,
      {
        acteurUid: e.acteurUid,
        action: 'adminArreterAnnonce',
        cible: ref.path,
        avant: { actif: d.get('actif') },
        apres: { actif: false },
        motif: e.motif,
      },
      s.horloge(),
      t,
    );
  });
}
