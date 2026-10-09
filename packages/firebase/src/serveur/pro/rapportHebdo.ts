import { messageRapportHebdo, rapportHebdo } from '@ph/core/espace-pro';
import { FieldPath, type Firestore } from 'firebase-admin/firestore';
import { chemins, collections } from '../../chemins';
import type { Notifier } from '../comptes/services';

const J = 86_400_000;
const jourParis = (ms: number) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(ms);

/**
 * `rapportHebdo` (lundi 8 h) : aux abonnés Premium en ligne, la semaine passée comparée à la
 * précédente (`statsJour`) ; une lecture de 14 jours par entreprise, rien sans activité.
 */
export async function envoyerRapportsHebdo(s: {
  db: Firestore;
  horloge: () => number;
  notifier: Notifier;
}): Promise<{ envoyes: number }> {
  const maintenant = s.horloge();
  const depuis = jourParis(maintenant - 14 * J);
  const premium = await s.db
    .collection(collections.artisans)
    .where('plan', '==', 'premium')
    .where('enLigne', '==', true)
    .get();
  let envoyes = 0;
  for (const a of premium.docs) {
    const proprietaire = a.get('proprietaireUid') as string | undefined;
    if (!proprietaire) continue;
    const jours = await s.db
      .doc(chemins.statsJour(a.id, depuis))
      .parent.where(FieldPath.documentId(), '>=', depuis)
      .get();
    const r = rapportHebdo(
      jours.docs.map((d) => ({
        jour: d.id,
        vuesFiche: (d.get('vuesFiche') as number | undefined) ?? 0,
        clicsTelephone: (d.get('clicsTelephone') as number | undefined) ?? 0,
        clicsDevis: (d.get('clicsDevis') as number | undefined) ?? 0,
        demandesRecues: (d.get('demandesRecues') as number | undefined) ?? 0,
      })),
      maintenant,
    );
    if (!r) continue;
    await s.notifier({
      modele: 'rapport-hebdo',
      destinataire: { uid: proprietaire, artisanId: a.id },
      refObjet: `${collections.artisans}/${a.id}/rapport-hebdo/${jourParis(maintenant)}`,
      donnees: { message: messageRapportHebdo(r), lien: '/pro/statistiques' },
    });
    envoyes++;
  }
  return { envoyes };
}
