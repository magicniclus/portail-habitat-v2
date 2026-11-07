import { collections } from '@ph/firebase/chemins';
import type { Migration } from '@ph/firebase/migrations';
import { droitsDe, formuleMigree } from '@ph/core/paiements';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

/**
 * Grille de 2026 (PAIEMENTS.md, D54 et D60) : `plan` et `optionVisibilite` remplacés par `droits`.
 * Visibilité → Fiche Pro, Premium → Tout inclus. Les abonnements Stripe eux-mêmes changent de
 * prix à part, après le préavis de 30 jours (DEPLOIEMENT.md) ; le webhook réécrit alors `droits`.
 */
export const formulesDroits: Migration = {
  id: '001-formules-droits',
  description: 'Formules 2026 : droits à la place de plan et optionVisibilite',
  collection: collections.artisans,
  transformer: (d) => {
    if (d.droits && !('plan' in d) && !('optionVisibilite' in d)) return null;
    const formule = formuleMigree({
      plan: (d.plan as string | undefined) ?? 'gratuit',
      optionVisibilite: d.optionVisibilite === true,
    });
    const fin = (d.planExpireLe ?? d.optionVisibiliteExpireLe) as Timestamp | undefined;
    return {
      droits: d.droits ?? {
        ...droitsDe(formule),
        statut: 'actif',
        ...(fin ? { finPeriode: fin } : {}),
        majLe: Timestamp.now(),
      },
      plan: FieldValue.delete(),
      planPeriode: FieldValue.delete(),
      planExpireLe: FieldValue.delete(),
      optionVisibilite: FieldValue.delete(),
      optionVisibiliteExpireLe: FieldValue.delete(),
    };
  },
};
