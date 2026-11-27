import { ErreurMetier } from '@ph/core/erreurs';
import { peut, type Membre } from '@ph/core/equipe';
import { examinerContestation, type MotifContestation } from '@ph/core/leads';
import { distanceKm, type Point } from '@ph/core/matching';
import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import { chemins, collections } from '../../chemins';

/**
 * Contestation d'un appel d'offres débloqué (DATABASE §5) : une par achat, 7 jours ; « hors zone »
 * refusé d'office si le chantier est dans le rayon de l'artisan (CGV Pro §1 bis). Sinon, une
 * tâche « Contestation » entre dans la file de l'équipe (72 h).
 */
export async function contesterAppelOffres(
  s: { db: Firestore; horloge: () => number },
  e: {
    artisanId: string;
    uid: string;
    appelOffresId: string;
    motif: MotifContestation;
    details: string;
  },
): Promise<{ etat: 'ouverte' } | { etat: 'refusee'; raison: string }> {
  const maintenant = s.horloge();
  const t0 = Timestamp.fromMillis(maintenant);
  const refDeblocage = s.db.doc(chemins.deblocage(e.appelOffresId, e.artisanId));
  return s.db.runTransaction(async (t) => {
    const [deblocage, membre, ao, artisan] = await Promise.all([
      t.get(refDeblocage),
      t.get(s.db.doc(chemins.membre(e.artisanId, e.uid))),
      t.get(s.db.doc(chemins.appelOffres(e.appelOffresId))),
      t.get(s.db.doc(chemins.artisan(e.artisanId))),
    ]);
    if (!peut(membre.data() as Membre | undefined, 'leads.debloquer'))
      throw new ErreurMetier('PERMISSION_REFUSEE');
    if (!deblocage.exists || deblocage.get('statut') !== 'actif' || !ao.exists)
      throw new ErreurMetier('INTROUVABLE');
    const achatId = deblocage.get('achatId') as string;
    const ref = s.db.doc(`${collections.remboursementsLeads}/${achatId}`);
    if ((await t.get(ref)).exists)
      throw new ErreurMetier('CONFLIT', 'Cet appel d’offres est déjà contesté.');
    const zone = artisan.get('zoneIntervention') as { centre: Point; rayonKm: number } | undefined;
    const examen = examinerContestation({
      debloqueLe: (deblocage.get('debloqueLe') as Timestamp).toMillis(),
      maintenant,
      motif: e.motif,
      ...(zone
        ? { distanceKm: distanceKm(zone.centre, ao.get('geo') as Point), rayonKm: zone.rayonKm }
        : {}),
    });
    if (examen.etat === 'hors_delai')
      throw new ErreurMetier('PRECONDITION', 'Le délai de 7 jours pour contester est dépassé.');
    const refuse = examen.etat === 'refusee_auto';
    t.create(ref, {
      schemaVersion: 1,
      createdAt: t0,
      achatId,
      artisanId: e.artisanId,
      appelOffresId: e.appelOffresId,
      demandeId: ao.get('demandeId') as string,
      motif: e.motif,
      details: e.details,
      preuves: [],
      statut: refuse ? 'refuse' : 'ouvert',
      ...(refuse ? { decisionPar: 'system', decisionLe: t0, motifDecision: examen.raison } : {}),
    });
    if (refuse) return { etat: 'refusee' as const, raison: examen.raison };
    t.set(s.db.collection(collections.filesModeration).doc(`contestation-${achatId}`), {
      schemaVersion: 1,
      type: 'remboursement_lead',
      refs: { artisanId: e.artisanId, appelOffresId: e.appelOffresId, achatId },
      priorite: 3,
      statut: 'a_traiter',
      permissionRequise: 'leads.rembourser',
      createdAt: t0,
    });
    return { etat: 'ouverte' as const };
  });
}
