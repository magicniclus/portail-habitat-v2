import 'server-only';
import type { PermissionAdmin } from '@ph/core/admin';
import type { ContexteBase, OptionsEnveloppe, Traitement } from '@ph/core/enveloppe';
import type { Resultat } from '@ph/core/resultat';
import type { z } from '@ph/core/zod';
import { action } from './action';
import { mfaAdminDesactivee } from './sessionAdmin';

/**
 * Enveloppe des actions du back-office (ADMIN §1) : permission admin relue côté serveur
 * (`admins/{uid}.permissionsEffectives`), double authentification, audit, et refus pendant une
 * impersonation. Le traitement écrit son propre audit détaillé (avant, après, motif).
 */
export function actionAdmin<S extends z.ZodType, R>(
  options: OptionsEnveloppe<S> & { nom: string; permission?: PermissionAdmin },
  traitement: Traitement<S, ContexteBase, R>,
): (brut: unknown) => Promise<Resultat<R>> {
  return action(
    {
      rateLimit: { cle: `admin-${options.nom}`, max: 300, fenetre: '1h' },
      ...options,
      audit: true,
      secondFacteur: !mfaAdminDesactivee(),
    },
    traitement,
  );
}
