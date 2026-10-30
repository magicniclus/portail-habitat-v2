'use client';

import { recapPaiement } from '@ph/core/facturation';
import { formatEuros } from '@ph/core/format';
import { CONTENU_OFFRES, NOMS_FORMULE, type FormulePayante } from '@ph/core/paiements';
import { Banner, bouton, Button, Modal } from '@ph/ui';
import { ArrowCounterClockwiseIcon, CrownSimpleIcon, LockKeyIcon } from '@phosphor-icons/react';
import { useState, type ReactNode } from 'react';
import { usePaiement } from '@/features/abonnement/usePaiement';
import { BandeauOffre } from './BandeauOffre';

const eur = (c: number) => formatEuros(c, { decimales: 'toujours' });

/**
 * Fenêtre d'offre (PAIEMENTS §4, PAY-10, maquette Fenetre Offre) : tout clic sur une fonction
 * payante l'ouvre. Raison du blocage, avantages, prix HT, TVA et TTC sans engagement, puis
 * « Continuer vers le paiement » ouvre directement Stripe, où les CGV s'acceptent (choix du propriétaire,
 * 27/10/2026). Rien ne s'active sans paiement : les droits viennent du webhook.
 */
export function FenetreOffre({
  formule,
  raison,
  children,
  className,
  ouverte: imposee,
  onOuverte,
}: {
  formule: FormulePayante;
  /** Phrase courte propre à l'écran (« Le domaine personnel est inclus dans Site Pro. »). */
  raison?: string;
  /** Libellé du déclencheur ; absent, la fenêtre s'ouvre seulement par `ouverte`. */
  children?: ReactNode;
  className?: string;
  /** Ouverture commandée par l'écran (après une action qui mène au paiement). */
  ouverte?: boolean;
  onOuverte?: (o: boolean) => void;
}) {
  const [interne, setInterne] = useState(false);
  const ouverte = imposee ?? interne;
  const setOuverte = onOuverte ?? setInterne;
  const { payer, enCours, erreur } = usePaiement(formule);
  const c = CONTENU_OFFRES[formule];
  const r = recapPaiement(formule);
  const nom = NOMS_FORMULE[formule];
  return (
    <Modal
      open={ouverte}
      onOpenChange={setOuverte}
      {...(children
        ? {
            declencheur: (
              <button type="button" className={className ?? bouton({ variant: 'secondaire' })}>
                {/* Déclencheur par défaut : la couronne signale la fonction payante. */}
                {className ? null : (
                  <CrownSimpleIcon
                    size={16}
                    weight="fill"
                    aria-hidden="true"
                    className="text-premium"
                  />
                )}
                {children}
              </button>
            ),
          }
        : {})}
      titre={`Passer à ${nom}`}
      description={raison ?? c.raison}
      actions={
        <>
          <Button variant="fantome" onClick={() => setOuverte(false)}>
            Plus tard
          </Button>
          <Button chargement={enCours} onClick={payer} disabled={enCours}>
            {enCours ? 'Un instant…' : 'Continuer vers le paiement'}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <BandeauOffre formule={formule} />
        <dl className="m-0 grid gap-1 rounded-card border border-trait p-4 text-[15px]">
          <div className="flex justify-between gap-3">
            <dt>{nom} · mensuel</dt>
            <dd className="m-0">{eur(r.montantHt)} HT</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>TVA 20 %</dt>
            <dd className="m-0">{eur(r.tva)}</dd>
          </div>
          <div className="flex justify-between gap-3 border-t border-trait pt-1.5 font-bold">
            <dt>Total TTC</dt>
            <dd className="m-0">{eur(r.montantTtc)}</dd>
          </div>
        </dl>
        <ul className="m-0 grid list-none gap-1.5 p-0 text-sm text-neutre-800 sm:grid-cols-2">
          <li className="flex items-center gap-1.5">
            <ArrowCounterClockwiseIcon size={16} aria-hidden="true" className="text-accent-700" />
            Sans engagement, résiliable à tout moment
          </li>
          <li className="flex items-center gap-1.5">
            <LockKeyIcon size={16} aria-hidden="true" className="text-accent-700" />
            Paiement sécurisé par Stripe
          </li>
        </ul>
        <p className="m-0 text-sm text-neutre-700">
          {c.note ? `${c.note} ` : ''}Carte et CGV se valident sur la page Stripe.
        </p>
        {erreur ? <Banner tone="danger">{erreur}</Banner> : null}
      </div>
    </Modal>
  );
}
