'use client';

import { LIBELLES_ROLE_ADMIN, ROLES_ADMIN_SYSTEME, type RoleAdminSysteme } from '@ph/core/admin';
import { Field, Select } from '@ph/ui';
import { useState } from 'react';
import { ConfirmationAdmin } from '@/features/admin/ConfirmationAdmin';
import { modifierMembre } from './actions';

/** Changer le rôle d'un membre, ou le désactiver / réactiver. */
export function ModifierMembre({
  uid,
  nom,
  role,
  actif,
}: {
  uid: string;
  nom: string;
  role: string;
  actif: boolean;
}) {
  const [nouveau, setNouveau] = useState<RoleAdminSysteme>(
    (ROLES_ADMIN_SYSTEME as readonly string[]).includes(role)
      ? (role as RoleAdminSysteme)
      : 'lecture',
  );
  return (
    <span className="flex flex-wrap gap-2">
      <ConfirmationAdmin
        libelle="Changer le rôle"
        titre={`Rôle de ${nom}`}
        description="Les nouvelles permissions s’appliquent à la prochaine page."
        onConfirmer={(motif) => modifierMembre({ uid, role: nouveau, actif, motif })}
      >
        <Field label="Nouveau rôle">
          <Select value={nouveau} onChange={(e) => setNouveau(e.target.value as RoleAdminSysteme)}>
            {ROLES_ADMIN_SYSTEME.map((r) => (
              <option key={r} value={r}>
                {LIBELLES_ROLE_ADMIN[r] ?? r}
              </option>
            ))}
          </Select>
        </Field>
      </ConfirmationAdmin>
      <ConfirmationAdmin
        libelle={actif ? 'Désactiver' : 'Réactiver'}
        titre={`${actif ? 'Désactiver' : 'Réactiver'} : ${nom}`}
        description={
          actif ? 'Ses sessions sont coupées immédiatement.' : 'Il pourra de nouveau se connecter.'
        }
        danger={actif}
        onConfirmer={(motif) =>
          modifierMembre({
            uid,
            role: (ROLES_ADMIN_SYSTEME as readonly string[]).includes(role)
              ? (role as RoleAdminSysteme)
              : 'lecture',
            actif: !actif,
            motif,
          })
        }
      />
    </span>
  );
}
