import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { chemins } from '../../chemins';
import { auditerAdmin } from '../admin/audit';
import { lireConfigIa } from './analyser';

/** Réglages de l'assistant (IA_ADMIN §6) : audit avant / après. Les modèles restent dans le code. */
export async function enregistrerReglagesIa(
  s: { db: Firestore; horloge: () => number },
  e: {
    acteurUid: string;
    actif: boolean;
    analyseHebdo: boolean;
    quotaJour: number;
    budgetMensuelCentimes: number;
    consignes: string[];
  },
): Promise<void> {
  const avant = await lireConfigIa(s.db);
  const { acteurUid, ...apres } = e;
  await s.db
    .doc(chemins.configIa())
    .set({ schemaVersion: 1, ...apres, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  await auditerAdmin(
    s.db,
    {
      acteurUid,
      action: 'adminReglagesIa',
      cible: chemins.configIa(),
      avant: {
        actif: avant.actif,
        analyseHebdo: avant.analyseHebdo,
        quotaJour: avant.quotaJour,
        budgetMensuelCentimes: avant.budgetMensuelCentimes,
        consignes: avant.consignes,
      },
      apres,
    },
    s.horloge(),
  );
}
