import type { Firestore } from 'firebase-admin/firestore';
import { collections } from '../../chemins';
import type { Notifier } from '../comptes/services';
import { analyserIa, type ServicesIa } from './analyser';
import { lireAnalyseIa } from './recommandations';

/** Acteur des analyses planifiées (jamais un membre de l'équipe). */
export const ACTEUR_SYNTHESE = 'systeme:synthese-hebdo';

/**
 * Synthèse du lundi 7 h (IA_ADMIN §3, IA-07) : audit complet sur toutes les données, au modèle
 * approfondi, envoyé aux superadmins avec l'évolution des notes d'étape depuis la semaine passée.
 */
export async function syntheseHebdoIa(
  s: ServicesIa & { notifier: Notifier },
): Promise<{ analyseId: string; destinataires: number }> {
  const precedente = await s.db
    .collection(collections.iaAnalyses)
    .where('demandePar', '==', ACTEUR_SYNTHESE)
    .where('statut', '==', 'ok')
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get();
  const { analyseId } = await analyserIa(
    s,
    { mode: 'audit', perimetres: [], approfondie: true, relancer: true },
    ACTEUR_SYNTHESE,
  );
  const lu = (await lireAnalyseIa(s.db, analyseId))!;
  const avant = new Map(
    (
      (precedente.docs[0]?.get('etapes') as { etape: string; score: number }[] | undefined) ?? []
    ).map((e) => [e.etape, e.score]),
  );
  const faibles = [...lu.analyse.etapes].sort((a, b) => a.score - b.score).slice(0, 3);
  const evolution = (etape: string, score: number) => {
    const ancien = avant.get(etape);
    return ancien === undefined ? '' : ` (${score - ancien >= 0 ? '+' : ''}${score - ancien})`;
  };
  const message = [
    lu.analyse.resume,
    lu.analyse.gainTotal ? `Gain estimé : ${lu.analyse.gainTotal}.` : '',
    `Étapes les plus faibles : ${faibles.map((e) => `${e.etape} ${e.score}/100${evolution(e.etape, e.score)}`).join(' · ')}.`,
    `${lu.recommandations.length} recommandations à examiner.`,
  ]
    .filter(Boolean)
    .join('\n\n');
  const superadmins = await superadminsActifs(s.db);
  for (const uid of superadmins)
    await s.notifier({
      modele: 'ia-synthese-hebdo',
      destinataire: { uid },
      refObjet: `${collections.iaAnalyses}/${analyseId}`,
      donnees: { message, lien: `/admin/ia?analyse=${analyseId}` },
    });
  return { analyseId, destinataires: superadmins.length };
}

async function superadminsActifs(db: Firestore) {
  const r = await db
    .collection(collections.admins)
    .where('role', '==', 'superadmin')
    .where('actif', '==', true)
    .get();
  return r.docs.map((d) => d.id);
}
