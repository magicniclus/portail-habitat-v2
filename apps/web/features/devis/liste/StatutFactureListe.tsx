'use client';

import { LIBELLES_STATUT_FACTURE, tonStatut } from '@ph/core/devis';
import { Badge, cn, useToast } from '@ph/ui';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { posterJson } from '@/lib/posterJson';
import { PaiementRapide } from './PaiementRapide';

const libelle = (s: string) =>
  LIBELLES_STATUT_FACTURE[s as keyof typeof LIBELLES_STATUT_FACTURE] ?? s;

/**
 * Statut d'une facture dans la liste (captures) : tant qu'il reste à payer, le menu propose
 * « Payée », qui enregistre le règlement du reste (moyen et date demandés). Sinon un badge.
 */
export function StatutFactureListe({
  factureId,
  numero,
  statut,
  type,
  annulee,
  resteCentimes,
  peutGerer,
  aujourdHui,
}: {
  factureId: string;
  numero: string;
  statut: string;
  type: string;
  annulee: boolean;
  resteCentimes: number;
  peutGerer: boolean;
  aujourdHui: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [ouvert, setOuvert] = useState(false);
  const payable =
    peutGerer && !annulee && type !== 'avoir' && statut !== 'brouillon' && resteCentimes > 0;
  if (annulee) return <Badge tone="neutre">Annulée par avoir</Badge>;
  if (!payable) return <Badge tone={tonStatut(statut)}>{libelle(statut)}</Badge>;
  return (
    <>
      <select
        aria-label={`Statut de la facture ${numero}`}
        value={statut}
        onChange={(x) => x.target.value === 'payee' && setOuvert(true)}
        className={cn(
          'min-h-11 w-fit cursor-pointer rounded-pill border border-trait bg-blanc px-3 text-base font-semibold text-texte',
        )}
      >
        <option value={statut}>{libelle(statut)}</option>
        <option value="payee">{libelle('payee')}</option>
      </select>
      <PaiementRapide
        ouvert={ouvert}
        onOuvert={setOuvert}
        numero={numero}
        resteCentimes={resteCentimes}
        aujourdHui={aujourdHui}
        onPayer={async ({ moyen, le }) => {
          const r = await posterJson<unknown>('/api/pro/factures/paiement', {
            factureId,
            montantCentimes: resteCentimes,
            moyen,
            le,
          });
          if (!r.ok) return toast({ titre: r.message, tone: 'danger' });
          setOuvert(false);
          toast({ titre: `Facture ${numero} marquée payée.`, tone: 'succes' });
          router.refresh();
        }}
      />
    </>
  );
}
