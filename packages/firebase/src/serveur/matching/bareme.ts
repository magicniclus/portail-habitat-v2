import { BAREME_DEFAUT, GRILLE_DEFAUT, type Bareme } from '@ph/core/leads';
import type { DocumentData, Firestore } from 'firebase-admin/firestore';
import { chemins, collections } from '../../chemins';

/** Barème des appels d'offres : `grillesTarifaires` actif, sinon le barème par défaut (D47). */

export interface BaremeLu {
  id: string;
  version: number;
  bareme: Bareme;
}

export function versBareme(d: DocumentData): Bareme {
  return {
    prixBaseParMetier: d.prixBaseParMetier,
    prixBaseDefaut: d.prixBaseDefaut ?? BAREME_DEFAUT.prixBaseDefaut,
    coefBudget: d.coefBudget,
    coefUrgence: d.coefUrgence,
    coefQualite: d.coefQualite,
    coefConcurrence: d.coefConcurrence,
    seuilsConcurrence: d.seuilsConcurrence ?? BAREME_DEFAUT.seuilsConcurrence,
    ...(d.coefNiveau ? { coefNiveau: d.coefNiveau } : {}),
    ...(d.coefEligibilite ? { coefEligibilite: d.coefEligibilite } : {}),
    remisePremium: d.remisePremium,
    centimesParCredit: d.centimesParCredit,
    plancher: d.plancher,
    plafond: d.plafond,
    arrondi: d.arrondi,
  };
}

export async function lireBaremeActif(db: Firestore): Promise<BaremeLu> {
  const r = await db
    .collection(collections.grillesTarifaires)
    .where('actif', '==', true)
    .limit(1)
    .get();
  const d = r.docs[0];
  if (!d) return { id: GRILLE_DEFAUT, version: 0, bareme: BAREME_DEFAUT };
  return { id: d.id, version: d.get('version') as number, bareme: versBareme(d.data()) };
}

/** Barème d'un appel d'offres (son `grilleId`), pour revenir au prix automatique. */
export async function lireBareme(db: Firestore, id: string | undefined): Promise<Bareme> {
  if (!id) return BAREME_DEFAUT;
  const d = await db.doc(chemins.grilleTarifaire(id)).get();
  return d.exists ? versBareme(d.data()!) : BAREME_DEFAUT;
}
