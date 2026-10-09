'use client';

import {
  GARANTIES_PREMIUM_MOIS,
  grilleTarifs,
  type Facturation,
  type PrixAffiches,
} from '@ph/core/facturation';
import { formatEuros } from '@ph/core/format';
import { bouton, cn } from '@ph/ui';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { routes } from '@/lib/routes';

const ht = (c: number) => formatEuros(c, { decimales: 'toujours' });

function Formule({
  surtitre,
  nom,
  accroche,
  prix,
  barre,
  detail,
  action,
  inclusTitre,
  inclus,
  vedette,
  suivi,
}: {
  /** Clé de mesure (`data-ph`) : prix et carte de la formule. */
  suivi: string;
  surtitre: string;
  nom: string;
  accroche: string;
  prix: string;
  barre?: string | null;
  detail: string;
  action: ReactNode;
  inclusTitre: string;
  inclus: ReactNode[];
  vedette?: boolean;
}) {
  return (
    <li
      data-ph={`offre-${suivi}`}
      className={cn(
        'relative flex flex-col rounded-card bg-blanc p-[clamp(22px,2.4vw,30px)] shadow-sm',
        vedette && 'border-2 border-accent shadow-md',
      )}
    >
      {vedette ? (
        <span className="absolute -top-[13px] left-6 rounded-pill bg-accent-action px-3 py-1 text-xs font-bold text-blanc">
          Le plus choisi
        </span>
      ) : null}
      <p className="m-0 mb-1.5 text-[13px] tracking-[0.08em] text-accent-700 uppercase">
        {surtitre}
      </p>
      <h3 className="m-0 mb-2 text-[28px] leading-[1.1]">{nom}</h3>
      <p className="m-0 mb-5 text-[15.5px] leading-[23px] text-neutre-800">{accroche}</p>
      <p className="m-0 flex flex-wrap items-baseline gap-2">
        {barre ? (
          <s className="text-[22px] leading-none font-semibold text-neutre-700">
            <span className="sr-only">au lieu de </span>
            {barre}
          </s>
        ) : null}
        <span
          data-ph={`prix-${suivi}`}
          className="text-[44px] leading-none font-bold tracking-tight"
        >
          {prix}
        </span>
        <span className="text-[15px] text-neutre-800">HT / mois</span>
      </p>
      <p className="m-0 mt-2 mb-[22px] text-sm leading-5 text-neutre-700">{detail}</p>
      {action}
      <p className="m-0 mt-6 mb-3 text-sm font-bold">{inclusTitre}</p>
      <ul className="m-0 grid list-none gap-2.5 p-0 text-[15px] leading-[22px]">
        {inclus.map((x, i) => (
          <li key={i} className="flex gap-2.5">
            <span aria-hidden="true" className="flex-none font-bold text-accent">
              ✓
            </span>
            <span>{x}</span>
          </li>
        ))}
      </ul>
    </li>
  );
}

/** Section Tarifs : bascule annuel / mensuel (radiogroup), prix lus dans config/app (D24, D25). */
export function Tarifs({ prix }: { prix: PrixAffiches }) {
  const [f, setF] = useState<Facturation>('annuel');
  const g = grilleTarifs(prix, f);
  const annuel = f === 'annuel';
  const choix = (valeur: Facturation, libelle: ReactNode) => (
    <button
      type="button"
      role="radio"
      aria-checked={f === valeur}
      onClick={() => setF(valeur)}
      className={cn(
        'inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-pill border-0 px-4 text-[15px] font-semibold transition-colors',
        f === valeur ? 'bg-accent-action text-blanc' : 'bg-transparent text-texte',
      )}
    >
      {libelle}
    </button>
  );
  return (
    <section id="offres" className="scroll-mt-20 bg-neutre-100 py-[clamp(48px,6vw,80px)]">
      <div className="mx-auto max-w-[1240px] px-[clamp(20px,4vw,44px)]">
        <div className="mb-9 flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-[620px]">
            <p className="m-0 mb-2.5 text-[13px] tracking-[0.08em] text-accent-700 uppercase">
              Tarifs
            </p>
            <h2 className="m-0 mb-3.5 text-[clamp(30px,3.6vw,44px)] leading-[1.08]">
              Commencez gratuitement, <span className="accent-editorial">accélérez</span> quand vous
              voulez.
            </h2>
            <p className="m-0 text-[17px] leading-[27px] text-neutre-800">
              0 % de commission dans toutes les formules. Vous changez de formule en un clic depuis
              votre espace.
            </p>
          </div>
          <div
            role="radiogroup"
            aria-label="Facturation"
            className="flex gap-1 rounded-pill border border-trait bg-blanc p-1"
          >
            {choix(
              'annuel',
              <>
                Annuel{' '}
                <span
                  className={cn(
                    'rounded-pill px-2 py-0.5 text-xs',
                    annuel ? 'bg-blanc text-accent-800' : 'bg-accent-100 text-accent-800',
                  )}
                >
                  jusqu&apos;à −{g.remiseMaxPourcent} %
                </span>
              </>,
            )}
            {choix('mensuel', 'Mensuel')}
          </div>
        </div>
        <ul className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(min(280px,100%),1fr))] gap-[18px] p-0">
          <Formule
            surtitre="Pour démarrer"
            nom="Gratuit"
            suivi="gratuit"
            accroche="Votre fiche en ligne et les demandes de votre zone, sans rien payer."
            prix={formatEuros(0)}
            detail="Pour toujours. Sans carte bancaire, sans engagement."
            action={
              <a
                href="#inscription"
                data-ph="cta-gratuit"
                className={bouton({
                  variant: 'secondaire',
                  pleineLargeur: true,
                  className: 'min-h-[50px]',
                })}
              >
                Créer mon compte gratuit
              </a>
            }
            inclusTitre="Inclus :"
            inclus={[
              <>
                <strong>Fiche artisan</strong> en ligne dans votre zone
              </>,
              <>
                <strong>Demandes illimitées</strong> reçues depuis votre fiche
              </>,
              'CRM, avis clients et application mobile',
              <>
                <strong>Appels d&apos;offres</strong> à l&apos;unité
              </>,
              <strong key="c">0 % de commission</strong>,
            ]}
          />
          <Formule
            surtitre="Pour être vu en premier"
            nom="Visibilité"
            suivi="visibilite"
            accroche="Votre fiche mise en avant auprès des particuliers de votre secteur géographique."
            prix={ht(g.visibilite.parMois)}
            barre={g.visibilite.barre ? ht(g.visibilite.barre) : null}
            detail={
              annuel
                ? `Payé en une fois : ${ht(g.visibilite.totalAnnuel!)} HT pour 12 mois, soit ${ht(g.visibilite.economie!)} d'économie.`
                : `Sans engagement, résiliable à tout moment. ${ht(Math.round(prix.visibiliteAnnuelHt / 12))} HT/mois en payant l'année en une fois.`
            }
            action={
              <Link
                href={routes.proAbonnement('visibilite', f)}
                data-ph="cta-visibilite"
                className={bouton({
                  variant: 'secondaire',
                  pleineLargeur: true,
                  className: 'min-h-[50px]',
                })}
              >
                Activer la Visibilité
              </Link>
            }
            inclusTitre="Tout le Gratuit, plus :"
            inclus={[
              <>
                <strong>Mise en avant</strong> dans l&apos;annuaire de votre secteur
              </>,
              <>
                <strong>Téléphone affiché</strong> sur votre fiche
              </>,
              <>
                <strong>Badge Visibilité</strong> dans les résultats
              </>,
              <>
                <strong>Statistiques</strong> : vues, clics, appels
              </>,
            ]}
          />
          <Formule
            vedette
            surtitre="Pour remplir votre planning"
            nom="Premium"
            suivi="premium"
            accroche="Des clients rien que pour vous chaque mois, et la priorité sur les appels d'offres."
            prix={ht(g.premium.parMois)}
            barre={g.premium.barre ? ht(g.premium.barre) : null}
            detail={
              annuel
                ? `Payé en une fois : ${ht(g.premium.totalAnnuel!)} HT pour 12 mois, soit ${ht(g.premium.economie!)} d'économie.`
                : `Sans engagement, résiliable à tout moment. ${ht(prix.premiumAnnuelHtMois)} HT/mois en payant l'année en une fois.`
            }
            action={
              <Link
                href={routes.proAbonnement('premium', f)}
                data-ph="cta-premium"
                className={bouton({ pleineLargeur: true, className: 'min-h-[50px]' })}
              >
                Passer Premium
              </Link>
            }
            inclusTitre="Toute la Visibilité, plus :"
            inclus={[
              <>
                <strong>{GARANTIES_PREMIUM_MOIS} mises en relation exclusives</strong> par mois :
                vous êtes le seul artisan contacté, sinon votre 2e mois est offert
              </>,
              <>
                <strong>Appels d&apos;offres 24 h avant</strong> les autres formules
              </>,
              <>
                <strong>Position prioritaire</strong> dans votre ville
              </>,
              <>
                <strong>Badge Pro vérifié</strong> et statistiques complètes
              </>,
            ]}
          />
        </ul>
        <p className="m-0 mt-7 text-[15px] leading-[23px] text-neutre-800">
          Sans carte bancaire pour le Gratuit · Changement de formule en un clic · Paiement sécurisé
        </p>
      </div>
    </section>
  );
}
