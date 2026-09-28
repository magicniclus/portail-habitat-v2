import { finChantierValide, texteUniciteAvis } from '@ph/core/avis';
import { ErreurMetier } from '@ph/core/erreurs';
import { auteurAvis, avis, type EntreeAvis } from '@ph/core/schemas';
import { createHash } from 'node:crypto';
import type { Firestore } from 'firebase-admin/firestore';
import { chemins, collections } from '../../chemins';
import type { Notifier } from '../comptes/services';
import { depot } from '../depot';

export interface ServicesAvis {
  db: Firestore;
  horloge: () => number;
  notifier: Notifier;
}

const sha256 = (t: string) => createHash('sha256').update(t).digest('hex');

/**
 * Dépôt d'un avis (`/avis`, README « Laisser un avis ») : sans compte obligatoire, statut
 * `en_attente` (modération sous 48 h, AVI-03), un seul avis par email, artisan et mois de chantier
 * (AVI-04). Les données de l'auteur restent dans `avis/{id}/prive/auteur`, jamais dans l'avis public.
 */
export async function deposerAvis(
  s: ServicesAvis,
  e: EntreeAvis,
  ctx: { uid?: string | null; ipHash?: string; userAgent?: string },
): Promise<{ avisId: string }> {
  const maintenant = new Date(s.horloge());
  if (!finChantierValide(e.finChantier, maintenant))
    throw new ErreurMetier('ENTREE_INVALIDE', 'Indiquez un mois de fin de chantier passé.');
  const fiche = await s.db.doc(chemins.artisanPublic(e.artisanId)).get();
  if (!fiche.exists || fiche.get('enLigne') !== true) throw new ErreurMetier('INTROUVABLE');

  const cleUnicite = sha256(texteUniciteAvis(e.email, e.artisanId, e.finChantier));
  const depotAvis = depot(s.db, collections.avis, avis);
  const ref = depotAvis.reference.doc();
  const doublon = s.db.collectionGroup('prive').where('cleUnicite', '==', cleUnicite).limit(1);

  await s.db.runTransaction(async (t) => {
    if (!(await t.get(doublon)).empty)
      throw new ErreurMetier(
        'CONFLIT',
        'Vous avez déjà laissé un avis sur cet artisan pour ce chantier. Vous pouvez le modifier depuis votre espace.',
      );
    t.create(ref, {
      schemaVersion: 1,
      createdAt: maintenant,
      updatedAt: maintenant,
      artisanId: e.artisanId,
      nomAffiche: e.nomAffiche,
      note: e.note,
      criteres: e.criteres,
      pointsPositifs: e.pointsPositifs,
      texte: e.texte,
      photos: [],
      typeTravaux: e.typeTravaux,
      finChantier: e.finChantier,
      certificationAcceptee: true,
      preuve: { type: 'aucune' },
      statut: 'en_attente',
    });
    t.create(depot(s.db, `${chemins.avis(ref.id)}/prive`, auteurAvis).ref('auteur'), {
      schemaVersion: 1,
      ...(ctx.uid ? { auteurUid: ctx.uid } : {}),
      auteurEmail: e.email,
      ipHash: ctx.ipHash ?? sha256('ip-inconnue').slice(0, 32),
      ...(ctx.userAgent ? { userAgent: ctx.userAgent.slice(0, 400) } : {}),
      cleUnicite,
    });
  });

  await s.notifier({
    modele: 'avis-recu',
    destinataire: ctx.uid ? { uid: ctx.uid, email: e.email } : { email: e.email },
    refObjet: chemins.avis(ref.id),
    donnees: { nomArtisan: String(fiche.get('nomCommercial') ?? ''), note: e.note },
  });
  return { avisId: ref.id };
}
