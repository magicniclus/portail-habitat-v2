import { utilisateur } from '@ph/core/schemas';
import type { z } from '@ph/core/zod';

type Utilisateur = z.input<typeof utilisateur>;
const canaux = (email: boolean) => ({ email, sms: false, inapp: true });

/** Profil `users/{uid}` initial : préférences par défaut (EMAILS §2), marketing désactivé. */
export function nouvelUtilisateur(e: {
  email: string;
  roles: Utilisateur['roles'];
  origine: Utilisateur['origine'];
  fournisseurs: Utilisateur['fournisseurs'];
  emailVerifie: boolean;
  maintenant: Date;
}): z.output<typeof utilisateur> {
  return utilisateur.parse({
    schemaVersion: 1,
    createdAt: e.maintenant,
    updatedAt: e.maintenant,
    roles: e.roles,
    email: e.email,
    emailVerifie: e.emailVerifie,
    entreprises: [],
    fournisseurs: e.fournisseurs,
    origine: e.origine,
    preferences: {
      notifs: {
        activite: canaux(true),
        relance: canaux(true),
        offres_pro: canaux(true),
        marketing: canaux(false),
      },
      langue: 'fr',
    },
    statut: 'actif',
  });
}
