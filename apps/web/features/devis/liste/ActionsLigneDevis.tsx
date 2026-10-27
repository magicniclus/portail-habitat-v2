'use client';

import { ConfirmDialog, useToast } from '@ph/ui';
import {
  CopyIcon,
  EnvelopeSimpleIcon,
  DownloadSimpleIcon,
  PaperPlaneTiltIcon,
  PencilSimpleIcon,
  TrashIcon,
} from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { posterJson } from '@/lib/posterJson';
import { routes } from '@/lib/routes';
import { MenuActions, type ActionMenu } from './MenuActions';

/**
 * Menu « ⋮ » d'un devis selon son statut : brouillon modifiable et supprimable ; envoyé figé
 * (PDF, relance, duplication), il s'archive mais ne se supprime pas.
 */
export function ActionsLigneDevis({
  devisId,
  numero,
  statut,
  aPdf,
  envoye,
}: {
  devisId: string;
  numero: string;
  statut: string;
  aPdf: boolean;
  /** L'email au client est déjà parti. */
  envoye: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [confirmer, setConfirmer] = useState(false);
  const agir = async (action: 'dupliquer' | 'supprimer' | 'relancer' | 'envoyer') => {
    const r = await posterJson<{ devisId: string } | null>('/api/pro/devis/action', {
      action,
      devisId,
    });
    if (!r.ok) return toast({ titre: r.message, tone: 'danger' });
    if (action === 'dupliquer' && r.data)
      return router.push(routes.proModifierDevis(r.data.devisId));
    toast({
      titre:
        action === 'relancer'
          ? 'Relance envoyée au client.'
          : action === 'envoyer'
            ? 'Devis envoyé au client par email.'
            : 'Devis supprimé.',
      tone: 'succes',
    });
    router.refresh();
  };
  const brouillon = statut === 'brouillon';
  const actions: ActionMenu[] = [
    ...(brouillon
      ? [
          {
            libelle: 'Modifier le devis',
            icone: <PencilSimpleIcon size={20} />,
            href: routes.proModifierDevis(devisId),
          },
        ]
      : []),
    ...(aPdf || brouillon
      ? [
          {
            libelle: brouillon ? 'Télécharger le PDF (brouillon)' : 'Télécharger le PDF',
            icone: <DownloadSimpleIcon size={20} />,
            href: `/api/pro/devis/${devisId}/pdf`,
          },
        ]
      : []),
    {
      libelle: 'Dupliquer le devis',
      icone: <CopyIcon size={20} />,
      onClick: () => void agir('dupliquer'),
    },
    ...(statut === 'envoye'
      ? [
          {
            libelle: envoye ? 'Renvoyer au client' : 'Envoyer au client',
            icone: <EnvelopeSimpleIcon size={20} />,
            onClick: () => void agir('envoyer'),
          },
        ]
      : []),
    ...(statut === 'envoye' && envoye
      ? [
          {
            libelle: 'Relancer par email',
            icone: <PaperPlaneTiltIcon size={20} />,
            onClick: () => void agir('relancer'),
          },
        ]
      : []),
    brouillon
      ? {
          libelle: 'Supprimer le devis',
          icone: <TrashIcon size={20} />,
          onClick: () => setConfirmer(true),
        }
      : {
          libelle: 'Suppression impossible',
          icone: <TrashIcon size={20} />,
          raison: 'Un devis envoyé ne se supprime pas : passez son statut à « Archivé ».',
        },
  ];
  return (
    <>
      <MenuActions libelle={`Actions du devis ${numero || 'brouillon'}`} actions={actions} />
      <ConfirmDialog
        open={confirmer}
        onOpenChange={setConfirmer}
        titre={`Supprimer le devis ${numero} ?`}
        libelleConfirmer="Supprimer"
        danger
        onConfirmer={() => agir('supprimer')}
      >
        Ce brouillon disparaît définitivement.
      </ConfirmDialog>
    </>
  );
}
