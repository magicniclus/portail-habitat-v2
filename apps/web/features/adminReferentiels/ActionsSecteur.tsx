'use client';

import { ConfirmationAdmin } from '@/features/admin/ConfirmationAdmin';
import { modifierPageSecteur } from './actionsSecteurs';

const SANS_DROIT = 'Permission requise : referentiels.modifier';

/** Bloquer / débloquer une page de secteur, ou faire réécrire son texte IA (motif obligatoire). */
export function ActionsSecteur({
  id,
  bloquee,
  peut,
}: {
  id: string;
  bloquee: boolean;
  peut: boolean;
}) {
  const desactive = peut ? undefined : SANS_DROIT;
  return (
    <>
      <ConfirmationAdmin
        libelle="Réécrire le texte"
        titre="Faire réécrire le texte IA"
        description="Un nouveau texte local est rédigé (recherche web, contrôles) puis publié s’il passe les contrôles ; en attendant, la page garde son texte actuel."
        desactive={desactive}
        onConfirmer={(motif) => modifierPageSecteur({ id, operation: 'regenerer', motif })}
      />
      <ConfirmationAdmin
        libelle={bloquee ? 'Débloquer' : 'Bloquer'}
        titre={bloquee ? 'Débloquer la page' : 'Bloquer la page'}
        description={
          bloquee
            ? 'La page redevient indexable si au moins un artisan du secteur y figure.'
            : 'La page reste consultable mais n’est plus jamais indexée, et aucun texte IA n’est rédigé.'
        }
        danger={!bloquee}
        desactive={desactive}
        onConfirmer={(motif) =>
          modifierPageSecteur({ id, operation: bloquee ? 'debloquer' : 'bloquer', motif })
        }
      />
    </>
  );
}
