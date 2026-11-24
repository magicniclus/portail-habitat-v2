import { pageSecteur, type PageSecteur } from '@ph/core/schemas';
import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { collections } from '../../chemins';
import { auditerAdmin } from '../admin/audit';
import { depot } from '../depot';

/**
 * Back-office des pages de secteur (Admin › Référentiels) : liste, blocage (jamais indexée,
 * aucun texte IA) et demande d'un nouveau texte IA. Chaque opération est journalisée.
 */
const pages = (db: Firestore) => depot(db, collections.pagesSecteur, pageSecteur);

export async function listerPagesSecteurAdmin(
  db: Firestore,
  limite = 300,
): Promise<(PageSecteur & { id: string })[]> {
  const s = await pages(db).reference.orderBy('majLe', 'desc').limit(limite).get();
  return s.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function modifierPageSecteurAdmin(
  s: { db: Firestore; horloge: () => number },
  e: {
    acteurUid: string;
    id: string;
    operation: 'bloquer' | 'debloquer' | 'regenerer';
    motif: string;
  },
): Promise<boolean> {
  const ref = pages(s.db).ref(e.id);
  return s.db.runTransaction(async (t) => {
    const p = (await t.get(ref)).data();
    if (!p) return false;
    const maintenant = new Date(s.horloge());
    const champs =
      e.operation === 'regenerer'
        ? {
            texteEtat: 'absent' as const,
            texteEssais: 0,
            texteErreur: FieldValue.delete(),
            texteVerrou: FieldValue.delete(),
          }
        : {
            bloquee: e.operation === 'bloquer',
            indexable: e.operation === 'bloquer' ? false : p.nbArtisans >= 1,
          };
    t.update(ref, { ...champs, majLe: maintenant });
    auditerAdmin(
      s.db,
      {
        acteurUid: e.acteurUid,
        action: 'adminPageSecteur',
        cible: ref.path,
        avant: { bloquee: p.bloquee, indexable: p.indexable, texteEtat: p.texteEtat },
        apres: { operation: e.operation },
        motif: e.motif,
      },
      s.horloge(),
      t,
    );
    return true;
  });
}
