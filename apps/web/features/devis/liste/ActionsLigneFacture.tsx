'use client';

import { ConfirmDialog, useToast } from '@ph/ui';
import {
  CopyIcon,
  DownloadSimpleIcon,
  EnvelopeSimpleIcon,
  PencilSimpleIcon,
  TrashIcon,
  XCircleIcon,
} from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { posterJson } from '@/lib/posterJson';
import { routes } from '@/lib/routes';
import { MenuActions, type ActionMenu } from './MenuActions';

export interface FactureLigne {
  id: string;
  numero: string;
  type: 'facture' | 'acompte' | 'avoir';
  statut: string;
  annulee: boolean;
  aPdf: boolean;
  resteCentimes: number;
}

/**
 * Menu « ⋮ » d'une facture (légal) : un brouillon se modifie ou se supprime ; une facture émise
 * se télécharge, s'envoie, se relance, se duplique et s'annule par un avoir, jamais supprimée.
 */
export function ActionsLigneFacture({ f }: { f: FactureLigne }) {
  const router = useRouter();
  const toast = useToast();
  const [supprimer, setSupprimer] = useState(false);
  const [annuler, setAnnuler] = useState(false);
  const appeler = async (url: string, corps: object, succes: string) => {
    const r = await posterJson<{ factureId: string } | null>(url, corps);
    if (!r.ok) {
      toast({ titre: r.message, tone: 'danger' });
      return null;
    }
    toast({ titre: succes, tone: 'succes' });
    router.refresh();
    return r.data;
  };
  const action = (a: 'dupliquer' | 'supprimer' | 'envoyer', succes: string) =>
    appeler('/api/pro/factures/action', { action: a, factureId: f.id }, succes);
  const brouillon = f.statut === 'brouillon';
  const enAttente = !brouillon && !f.annulee && f.type !== 'avoir' && f.resteCentimes > 0;
  const actions: ActionMenu[] = brouillon
    ? [
        {
          libelle: 'Modifier la facture',
          icone: <PencilSimpleIcon size={20} />,
          href: routes.proModifierFacture(f.id),
        },
        {
          libelle: 'Télécharger le PDF (brouillon)',
          icone: <DownloadSimpleIcon size={20} />,
          href: `/api/pro/factures/${f.id}/pdf`,
        },
        {
          libelle: 'Supprimer le brouillon',
          icone: <TrashIcon size={20} />,
          onClick: () => setSupprimer(true),
        },
      ]
    : [
        ...(f.aPdf
          ? [
              {
                libelle: 'Télécharger le PDF',
                icone: <DownloadSimpleIcon size={20} />,
                href: `/api/pro/factures/${f.id}/pdf`,
              },
              {
                libelle: 'Envoyer par email',
                icone: <EnvelopeSimpleIcon size={20} />,
                onClick: () => void action('envoyer', 'Envoyée au client par email.'),
              },
            ]
          : []),
        ...(enAttente && f.aPdf
          ? [
              {
                libelle: 'Relancer le client',
                icone: <EnvelopeSimpleIcon size={20} />,
                onClick: () =>
                  void appeler(
                    '/api/pro/factures/relancer',
                    { factureId: f.id },
                    'Relance envoyée au client.',
                  ),
              },
            ]
          : []),
        ...(f.type === 'facture'
          ? [
              {
                libelle: 'Dupliquer la facture',
                icone: <CopyIcon size={20} />,
                onClick: async () => {
                  const r = await action('dupliquer', 'Copie créée en brouillon.');
                  if (r) router.push(routes.proModifierFacture(r.factureId));
                },
              },
            ]
          : []),
        ...(f.type !== 'avoir' && !f.annulee
          ? [
              {
                libelle: 'Annuler la facture',
                icone: <XCircleIcon size={20} />,
                onClick: () => setAnnuler(true),
              },
            ]
          : []),
        {
          libelle: 'Suppression impossible',
          icone: <TrashIcon size={20} />,
          raison: 'Une facture numérotée ne se supprime jamais : annulez-la, un avoir sera créé.',
        },
      ];
  const nom = f.numero || 'brouillon';
  return (
    <>
      <MenuActions libelle={`Actions de la facture ${nom}`} actions={actions} />
      <ConfirmDialog
        open={supprimer}
        onOpenChange={setSupprimer}
        titre="Supprimer ce brouillon ?"
        libelleConfirmer="Supprimer"
        danger
        onConfirmer={async () => void (await action('supprimer', 'Brouillon supprimé.'))}
      >
        Il n’a pas de numéro : il disparaît sans laisser de trou dans la suite des factures.
      </ConfirmDialog>
      <ConfirmDialog
        open={annuler}
        onOpenChange={setAnnuler}
        titre={`Annuler la facture ${nom} ?`}
        libelleConfirmer="Créer l’avoir"
        danger
        motifObligatoire
        onConfirmer={async (motif) =>
          void (await appeler(
            '/api/pro/factures/avoir',
            { factureId: f.id, motif, cleIdempotence: `avoir-${f.id}-${Date.now()}` },
            'Avoir créé : la facture est annulée.',
          ))
        }
      >
        Un avoir du même montant est créé avec son propre numéro ; la facture reste dans vos
        documents, marquée « annulée ».
      </ConfirmDialog>
    </>
  );
}
