'use client';

import { recapPaiement } from '@ph/core/facturation';
import { formatDate, formatEuros } from '@ph/core/format';
import { NOMS_FORMULE, type Formule, type FormulePayante } from '@ph/core/paiements';
import { Banner, Button, Modal } from '@ph/ui';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { routes } from '@/lib/routes';
import { usePaiement } from './usePaiement';

const eur = (c: number) => formatEuros(c, { decimales: 'toujours' });

/**
 * Fenêtre de paiement ouverte par `?offre=` (PAIEMENTS §4, PAY-02) : récapitulatif HT, TVA, TTC,
 * CGV acceptées sur la page Stripe. Aucune carte saisie ici (règle 7) : Stripe Checkout pour un premier abonnement ;
 * sinon Stripe change la formule (montée au prorata, descente à l'échéance) et la page attend le
 * webhook avant d'afficher « activé ».
 */
export function FenetrePaiement({
  formule,
  actuelle,
  prixActuelHt,
  code,
}: {
  formule: FormulePayante;
  actuelle: Formule;
  prixActuelHt: number;
  code: { code: string; pourcentage: number; expireLe: number } | null;
}) {
  const router = useRouter();
  const [ouverte, setOuverte] = useState(true);
  const { payer, enCours, erreur } = usePaiement(formule, code?.code);
  const r = recapPaiement(formule);
  const montee = r.montantHt > prixActuelHt;
  const fermer = (o: boolean) => {
    setOuverte(o);
    if (!o) router.replace(routes.proAbonnement, { scroll: false });
  };
  const note =
    actuelle === 'gratuit'
      ? `Prélevé aujourd’hui, puis ${eur(r.montantTtc)} TTC chaque mois.`
      : montee
        ? `Changement immédiat : vous payez aujourd’hui la différence au prorata, puis ${eur(r.montantTtc)} TTC chaque mois.`
        : `Le nouveau prix s’applique à la prochaine échéance, puis ${eur(r.montantTtc)} TTC chaque mois.`;
  return (
    <Modal
      open={ouverte}
      onOpenChange={fermer}
      titre={`Passer à ${NOMS_FORMULE[formule]}`}
      actions={
        <>
          <Button variant="fantome" onClick={() => fermer(false)}>
            Annuler
          </Button>
          <Button onClick={payer} disabled={enCours}>
            {enCours ? 'Un instant…' : 'Continuer vers le paiement'}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <dl className="m-0 grid gap-1 text-[15px]">
          <div className="flex justify-between gap-3">
            <dt>{NOMS_FORMULE[formule]} · mensuel</dt>
            <dd className="m-0">{eur(r.montantHt)} HT</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>TVA 20 %</dt>
            <dd className="m-0">{eur(r.tva)}</dd>
          </div>
          <div className="flex justify-between gap-3 border-t border-trait pt-1.5 font-bold">
            <dt>Total TTC</dt>
            <dd className="m-0" data-testid="total-ttc">
              {eur(r.montantTtc)}
            </dd>
          </div>
        </dl>
        {code ? (
          <Banner tone="succes">
            Code {code.code} : −{code.pourcentage} % appliqué au paiement, valable jusqu’au{' '}
            {formatDate(code.expireLe, 'long')}.
          </Banner>
        ) : null}
        <p className="m-0 text-sm text-neutre-700">{note} Sans engagement.</p>
        <p className="m-0 text-sm text-neutre-700">
          Paiement sécurisé par Stripe, 3-D Secure si votre banque le demande. Aucune carte n’est
          saisie sur Portail Travaux.
        </p>
        {erreur ? <Banner tone="danger">{erreur}</Banner> : null}
      </div>
    </Modal>
  );
}
