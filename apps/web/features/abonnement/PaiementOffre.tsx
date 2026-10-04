'use client';

import {
  AVANTAGES_OFFRE,
  grilleTarifs,
  NOMS_OFFRE,
  PRIX_AFFICHES,
  recapPaiement,
  type Facturation,
  type ProduitAbonnement,
} from '@ph/core/facturation';
import { formatDate, formatEuros } from '@ph/core/format';
import { Banner, Button, RadioCard, RadioCardGroup } from '@ph/ui';
import { CheckIcon, LockSimpleIcon } from '@phosphor-icons/react';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { posterJson } from '@/lib/posterJson';

const eur = (c: number) => formatEuros(c, { decimales: 'toujours' });

/**
 * Maquettes Paiement Offre Premium / Option Visibilité : formule (préremplie par `?facturation=`,
 * ACQ-03), récapitulatif HT, TVA, TTC dû aujourd'hui, puis paiement sur la page sécurisée Stripe
 * (aucune saisie de carte ici, règle 7).
 */
export function PaiementOffre({
  produit,
  periodeInitiale,
  zone,
  remise = null,
}: {
  produit: ProduitAbonnement;
  periodeInitiale: Facturation;
  zone: string;
  /** Code personnel reçu par email (CONVERSION §6), appliqué sans saisie sur la page Stripe. */
  remise?: { code: string; pourcentage: number; expireLe: number } | 'invalide' | null;
}) {
  const code = remise && remise !== 'invalide' ? remise : null;
  const router = useRouter();
  const chemin = usePathname();
  const [periode, setPeriode] = useState<Facturation>(periodeInitiale);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const recap = recapPaiement(produit, periode);
  const annuel = recapPaiement(produit, 'annuel');
  const mensuel = recapPaiement(produit, 'mensuel');
  const economie = grilleTarifs(PRIX_AFFICHES, 'annuel')[produit].economie!;

  const choisir = (p: Facturation) => {
    setPeriode(p);
    router.replace(`${chemin}?facturation=${p}${code ? `&code=${code.code}` : ''}` as never, {
      scroll: false,
    });
  };
  const payer = async () => {
    setEnCours(true);
    setErreur(null);
    const r = await posterJson<{ url: string }>('/api/pro/abonnement/checkout', {
      produit,
      periode,
      ...(code ? { code: code.code } : {}),
    });
    if (!r.ok) {
      setEnCours(false);
      return setErreur(r.message);
    }
    window.location.assign(r.data.url);
  };

  return (
    <div className="grid gap-5">
      {code ? (
        <Banner tone="succes" titre={`Votre remise de ${code.pourcentage} % est prête`}>
          Le code {code.code} sera appliqué automatiquement sur la page de paiement sécurisée,
          jusqu&apos;au {formatDate(code.expireLe, 'dateHeure')}.
        </Banner>
      ) : remise === 'invalide' ? (
        <Banner tone="info">
          Ce code n&apos;est plus valable : le tarif normal s&apos;applique.
        </Banner>
      ) : null}
      <RadioCardGroup legende="Facturation">
        <RadioCard
          name="facturation"
          value="annuel"
          checked={periode === 'annuel'}
          onChange={() => choisir('annuel')}
          titre={
            produit === 'premium'
              ? `Annuel · ${eur(annuel.parMoisHt)} HT / mois`
              : `Annuel · ${eur(annuel.montantHt)} HT / an`
          }
          description={`Payé en une fois : ${eur(annuel.montantHt)} HT pour 12 mois`}
          complement={
            <span className="rounded-pill bg-succes-fond px-2 py-0.5 text-[13px] font-semibold text-succes">
              −&nbsp;{formatEuros(economie)}/an
            </span>
          }
        />
        <RadioCard
          name="facturation"
          value="mensuel"
          checked={periode === 'mensuel'}
          onChange={() => choisir('mensuel')}
          titre={`Mensuel · ${eur(mensuel.montantHt)} HT / mois`}
          description="Prélevé chaque mois, sans engagement"
        />
      </RadioCardGroup>

      <dl
        aria-label="Récapitulatif"
        className="m-0 grid gap-2 rounded-card border border-trait p-4 text-[15px]"
      >
        <div className="flex justify-between gap-3">
          <dt>
            {NOMS_OFFRE[produit]} · {periode === 'annuel' ? '12 mois' : '1 mois'} · {zone}
          </dt>
          <dd className="m-0 font-semibold">{eur(recap.montantHt)} HT</dd>
        </div>
        <div className="flex justify-between gap-3 text-neutre-800">
          <dt>TVA 20 %</dt>
          <dd className="m-0">{eur(recap.tva)}</dd>
        </div>
        <div className="flex justify-between gap-3 border-t border-trait pt-2 text-base font-bold">
          <dt>Total TTC dû aujourd&apos;hui</dt>
          <dd className="m-0" data-testid="total-ttc">
            {eur(recap.montantTtc)}
          </dd>
        </div>
        <p className="m-0 text-sm text-neutre-700">
          {periode === 'annuel'
            ? 'Renouvelé chaque année au même tarif, résiliable jusqu’à la date anniversaire.'
            : 'Résiliable en un clic, effet à la fin du mois en cours.'}
        </p>
      </dl>

      <ul className="m-0 grid list-none gap-2 p-0 text-[15px]">
        {AVANTAGES_OFFRE[produit].map((a) => (
          <li key={a} className="flex gap-2">
            <CheckIcon aria-hidden className="mt-0.5 size-5 flex-none text-succes" weight="bold" />
            {a}
          </li>
        ))}
      </ul>

      {erreur ? <Banner tone="danger">{erreur}</Banner> : null}
      <Button pleineLargeur onClick={payer} disabled={enCours} className="min-h-[50px]">
        {enCours ? 'Ouverture du paiement…' : `Payer ${eur(recap.montantTtc)}`}
      </Button>
      <p className="m-0 flex items-start gap-2 text-sm text-neutre-700">
        <LockSimpleIcon aria-hidden className="mt-0.5 size-4 flex-none" />
        Paiement par carte sur la page sécurisée de Stripe (3D Secure). Un code promo se saisit sur
        cette page. Aucune donnée de carte ne passe par Portail Habitat.
      </p>
    </div>
  );
}
