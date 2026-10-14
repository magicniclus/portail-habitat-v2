'use client';

import { recapPaiement } from '@ph/core/facturation';
import { formatEuros } from '@ph/core/format';
import { CONTENU_OFFRES, NOMS_FORMULE, offreUrlDe, type FormulePayante } from '@ph/core/paiements';
import { bouton, Button, Modal } from '@ph/ui';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { routes } from '@/lib/routes';

const eur = (c: number) => formatEuros(c, { decimales: 'toujours' });

/**
 * Fenêtre d'offre (PAIEMENTS §4, PAY-10, maquette Fenetre Offre) : tout clic sur une fonction
 * payante l'ouvre. Raison du blocage, avantages, prix HT, TVA et TTC sans engagement, puis
 * « Continuer vers le paiement » vers `/pro/abonnement?offre=`. Rien ne s'active ici.
 */
export function FenetreOffre({
  formule,
  raison,
  children,
  className,
}: {
  formule: FormulePayante;
  /** Phrase courte propre à l'écran (« Le domaine personnel est inclus dans Site Pro. »). */
  raison?: string;
  /** Libellé du déclencheur. */
  children: ReactNode;
  className?: string;
}) {
  const [ouverte, setOuverte] = useState(false);
  const c = CONTENU_OFFRES[formule];
  const r = recapPaiement(formule);
  const nom = NOMS_FORMULE[formule];
  return (
    <Modal
      open={ouverte}
      onOpenChange={setOuverte}
      declencheur={
        <button type="button" className={className ?? bouton({ variant: 'secondaire' })}>
          {children}
        </button>
      }
      titre={`Passer à ${nom}`}
      description={raison ?? c.raison}
      actions={
        <>
          <Button variant="fantome" onClick={() => setOuverte(false)}>
            Plus tard
          </Button>
          <Link href={routes.proOffre(offreUrlDe(formule))} className={bouton()}>
            Continuer vers le paiement
          </Link>
        </>
      }
    >
      <div className="grid gap-4">
        <p className="m-0 text-base text-neutre-800">{c.accroche}</p>
        <ul className="m-0 grid list-none gap-2 p-0 text-[15px]">
          {c.avantages.map((a) => (
            <li key={a} className="flex gap-2">
              <span aria-hidden="true" className="font-bold text-accent-700">
                ✓
              </span>
              <span>{a}</span>
            </li>
          ))}
        </ul>
        <dl className="m-0 grid gap-1 rounded-card bg-neutre-100 p-4 text-[15px]">
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
        <p className="m-0 text-sm text-neutre-700">
          Sans engagement, résiliable à tout moment.{c.note ? ` ${c.note}` : ''}
        </p>
      </div>
    </Modal>
  );
}
