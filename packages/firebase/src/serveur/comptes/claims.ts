import { claimsUtilisateur, type ClaimsUtilisateur, type RoleCompte } from '@ph/core/equipe';
import type { Membre } from '@ph/core/equipe';
import { FieldValue } from 'firebase-admin/firestore';
import { chemins } from '../../chemins';
import type { ServicesComptes } from './services';

/**
 * `syncClaims` (COMPTES §7) : recalcule `users.entreprises` et les claims depuis les documents `membres`
 * et `admins`. Idempotent. `artisanIdTouche` : entreprise dont l'appartenance vient de changer
 * (ajout ou retrait), à relire même si elle n'est pas encore dans `users.entreprises`.
 */
export async function synchroniserClaims(
  s: ServicesComptes,
  uid: string,
  artisanIdTouche?: string,
): Promise<ClaimsUtilisateur> {
  const refUser = s.db.doc(chemins.user(uid));
  const user = (await refUser.get()).data() as
    { roles?: RoleCompte[]; entreprises?: string[]; entrepriseActive?: string } | undefined;
  const candidates = [
    ...new Set([...(user?.entreprises ?? []), ...(artisanIdTouche ? [artisanIdTouche] : [])]),
  ];
  const membres = (
    await Promise.all(
      candidates.map(async (artisanId) => {
        const m = (await s.db.doc(chemins.membre(artisanId, uid)).get()).data() as
          Membre | undefined;
        return m ? { artisanId, role: m.role, statut: m.statut } : null;
      }),
    )
  ).filter((m) => m !== null);
  const admin = (await s.db.doc(chemins.admin(uid)).get()).data() as
    { role: string; actif: boolean; permissionsEffectives: string[] } | undefined;

  const autres = (user?.roles ?? []).filter((r) => r !== 'artisan');
  const roles: RoleCompte[] = membres.length ? [...autres, 'artisan'] : autres;
  const claims = claimsUtilisateur({ roles, membres, admin });
  await s.auth.setCustomUserClaims(uid, { ...claims });

  if (user) {
    const entreprises = membres.map((m) => m.artisanId);
    const active =
      user.entrepriseActive && entreprises.includes(user.entrepriseActive)
        ? user.entrepriseActive
        : entreprises[0];
    await refUser.update({
      roles,
      entreprises,
      entrepriseActive: active ?? FieldValue.delete(),
      updatedAt: new Date(s.horloge()),
    });
  }
  return claims;
}
