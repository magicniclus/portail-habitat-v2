import { ErreurMetier } from '@ph/core/erreurs';
import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import { chemins } from '../../chemins';
import { auditerAdmin } from './audit';

/** Textes éditables d'une page commune (ADMIN §2.9) ; absents, ceux de docs/data/communes.json. */
export interface TexteCommune {
  intro: string;
  bati: string;
  secteurs: string;
  risques: string;
  frequents: { titre: string; texte: string }[];
  version: number;
}

export async function lireTexteCommune(db: Firestore, slug: string): Promise<TexteCommune | null> {
  const d = (await db.doc(chemins.communeTexte(slug)).get()).data();
  if (!d) return null;
  return {
    intro: d.intro,
    bati: d.bati,
    secteurs: d.secteurs,
    risques: d.risques,
    frequents: d.frequents,
    version: d.version,
  };
}

/** Nouvelle version des textes : la précédente est gardée dans `versions`, audit avant / après. */
export async function modifierTexteCommuneAdmin(
  s: { db: Firestore; horloge: () => number },
  e: Omit<TexteCommune, 'version'> & { acteurUid: string; slug: string; motif: string },
): Promise<number> {
  const { acteurUid, slug, motif, ...textes } = e;
  if (!/^[a-z0-9-]{2,60}$/.test(slug)) throw new ErreurMetier('ENTREE_INVALIDE');
  const ref = s.db.doc(chemins.communeTexte(slug));
  const t0 = Timestamp.fromMillis(s.horloge());
  return s.db.runTransaction(async (t) => {
    const avant = await t.get(ref);
    const version = ((avant.get('version') as number | undefined) ?? 0) + 1;
    if (avant.exists)
      t.create(ref.collection('versions').doc(String(version - 1)), {
        ...avant.data(),
        archiveeLe: t0,
      });
    t.set(ref, { schemaVersion: 1, ...textes, version, updatedAt: t0 });
    auditerAdmin(
      s.db,
      {
        acteurUid,
        action: 'adminTexteCommune',
        cible: ref.path,
        avant: { version: version - 1 },
        apres: { version },
        motif,
      },
      s.horloge(),
      t,
    );
    return version;
  });
}
