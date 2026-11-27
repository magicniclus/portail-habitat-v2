'use client';

import { bouton } from '@ph/ui';
import type { Route } from 'next';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useState, useSyncExternalStore } from 'react';
import {
  consentementActuel,
  enregistrerConsentement,
  EVENEMENT_CONSENTEMENT,
  EVENEMENT_OUVRIR,
} from './consentement';

const PreferencesCookies = dynamic(() => import('./PreferencesCookies'), { ssr: false });

const abonner = (rappel: () => void) => {
  window.addEventListener(EVENEMENT_CONSENTEMENT, rappel);
  return () => window.removeEventListener(EVENEMENT_CONSENTEMENT, rappel);
};
const aChoisi = () => consentementActuel() !== null;
/** Au rendu serveur, le bandeau est dans le HTML ; `SCRIPT_BANDEAU_COOKIES` le masque avant l'affichage si un choix existe. */
const auServeur = () => false;

const classeBouton = bouton({ variant: 'secondaire', className: 'flex-1' });

/**
 * Bandeau cookies conforme CNIL (INTEGRATIONS §7) : « Tout refuser » au même niveau que « Tout accepter »,
 * catégorie « Mesure d'audience détaillée » décochée par défaut, aucun traceur avant le choix.
 */
export function BandeauCookies({ politique }: { politique: Route }) {
  const choisi = useSyncExternalStore(abonner, aChoisi, auServeur);
  const [details, setDetails] = useState(false);

  useEffect(() => {
    // Cookie présent mais expiré ou illisible : le bandeau doit réapparaître.
    if (!choisi) document.documentElement.removeAttribute('data-cookies-choisis');
  }, [choisi]);

  useEffect(() => {
    const ouvrir = () => setDetails(true);
    window.addEventListener(EVENEMENT_OUVRIR, ouvrir);
    return () => window.removeEventListener(EVENEMENT_OUVRIR, ouvrir);
  }, []);

  const choisir = (a: boolean) => {
    enregistrerConsentement(a);
    setDetails(false);
  };

  return (
    <>
      {!choisi ? (
        <section
          data-bandeau-cookies
          aria-labelledby="cookies-titre"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-trait bg-fond px-page pt-2 pb-sure shadow-lg md:pt-4 [[data-cookies-choisis]_&]:hidden"
        >
          <div className="mx-auto flex max-w-contenu flex-wrap items-center gap-x-6 gap-y-1.5 md:gap-y-3">
            <div className="min-w-0 flex-[1_1_420px]">
              <h2 id="cookies-titre" className="m-0 mb-1 text-base max-md:sr-only">
                Vos choix sur les cookies
              </h2>
              {/* Téléphone : deux lignes au plus, la page reste lisible (décision du 17/11/2026). */}
              <p className="m-0 text-[13px] leading-[18px] text-neutre-800 md:hidden">
                Cookies indispensables, et mesure d’audience seulement avec votre accord.{' '}
                <Link href={politique} prefetch={false}>
                  En savoir plus
                </Link>
              </p>
              <p className="m-0 text-sm leading-[21px] text-neutre-800 max-md:hidden">
                Nous utilisons des cookies indispensables au fonctionnement du site. Avec votre
                accord, nous mesurons aussi la façon dont les pages sont utilisées pour les
                améliorer.{' '}
                <Link href={politique} prefetch={false}>
                  En savoir plus
                </Link>
              </p>
            </div>
            {/* Refuser aussi simple qu'accepter : même bouton, même taille, sur la même ligne ;
                sur téléphone « Personnaliser » passe en lien entre les deux (une seule rangée). */}
            <div className="grid w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1.5 sm:flex sm:w-auto sm:flex-none sm:gap-2">
              <button
                type="button"
                className={`${classeBouton} max-sm:px-2.5 max-sm:text-[14px]`}
                onClick={() => choisir(false)}
              >
                Tout refuser
              </button>
              <button
                type="button"
                className="min-h-11 cursor-pointer border-0 bg-transparent px-1 text-[13px] text-neutre-800 underline sm:hidden"
                onClick={() => setDetails(true)}
              >
                Personnaliser
              </button>
              <button
                type="button"
                className={`${classeBouton} max-sm:hidden`}
                onClick={() => setDetails(true)}
              >
                Personnaliser
              </button>
              <button
                type="button"
                className={`${classeBouton} max-sm:px-2.5 max-sm:text-[14px]`}
                onClick={() => choisir(true)}
              >
                Tout accepter
              </button>
            </div>
          </div>
        </section>
      ) : null}
      {details ? (
        <PreferencesCookies
          audienceInitiale={consentementActuel()?.audienceDetaillee ?? false}
          enregistrer={choisir}
          fermer={() => setDetails(false)}
        />
      ) : null}
    </>
  );
}

/** Lien de pied de page qui rouvre le choix. */
export function LienGererCookies({ className }: { className?: string }) {
  return (
    <button
      type="button"
      className={
        className ?? 'min-h-11 cursor-pointer border-0 bg-transparent p-0 text-inherit underline'
      }
      onClick={() => window.dispatchEvent(new Event(EVENEMENT_OUVRIR))}
    >
      Gérer les cookies
    </button>
  );
}
