'use client';

import { Button, Checkbox, Feuille } from '@ph/ui';
import Link from 'next/link';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { routes } from '@/lib/routes';
import {
  consentementActuel,
  enregistrerConsentement,
  EVENEMENT_CONSENTEMENT,
  EVENEMENT_OUVRIR,
} from './consentement';

const abonner = (rappel: () => void) => {
  window.addEventListener(EVENEMENT_CONSENTEMENT, rappel);
  return () => window.removeEventListener(EVENEMENT_CONSENTEMENT, rappel);
};
/** Instantané stable : présence d'un choix valable (le serveur ne sait pas : pas de bandeau au rendu). */
const aChoisi = () => consentementActuel() !== null;
const auServeur = () => true;

/**
 * Bandeau cookies conforme CNIL (INTEGRATIONS §7) : « Tout refuser » au même niveau que « Tout accepter »,
 * catégorie « Mesure d'audience détaillée » décochée par défaut, aucun traceur avant le choix.
 */
export function BandeauCookies() {
  const choisi = useSyncExternalStore(abonner, aChoisi, auServeur);
  const [details, setDetails] = useState(false);
  const [audience, setAudience] = useState(false);

  useEffect(() => {
    const ouvrir = () => {
      setAudience(consentementActuel()?.audienceDetaillee ?? false);
      setDetails(true);
    };
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
          aria-labelledby="cookies-titre"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-trait bg-fond px-page pt-4 pb-[max(16px,env(safe-area-inset-bottom))] shadow-lg"
        >
          <div className="mx-auto flex max-w-contenu flex-wrap items-center gap-x-6 gap-y-3">
            <div className="min-w-0 flex-[1_1_420px]">
              <h2 id="cookies-titre" className="m-0 mb-1 text-base">
                Vos choix sur les cookies
              </h2>
              <p className="m-0 text-sm leading-[21px] text-neutre-800">
                Nous utilisons des cookies indispensables au fonctionnement du site. Avec votre
                accord, nous mesurons aussi la façon dont les pages sont utilisées pour les
                améliorer.{' '}
                <Link href={routes.legal('particuliers', 'cookies')}>En savoir plus</Link>
              </p>
            </div>
            <div className="flex flex-[1_1_320px] flex-wrap gap-2 sm:flex-none">
              <Button variant="secondaire" className="flex-1" onClick={() => choisir(false)}>
                Tout refuser
              </Button>
              <Button variant="secondaire" className="flex-1" onClick={() => setDetails(true)}>
                Personnaliser
              </Button>
              <Button variant="secondaire" className="flex-1" onClick={() => choisir(true)}>
                Tout accepter
              </Button>
            </div>
          </div>
        </section>
      ) : null}
      <Feuille
        open={details}
        onOpenChange={setDetails}
        titre="Gérer les cookies"
        description="Vous pouvez changer d'avis à tout moment depuis le lien « Gérer les cookies » en bas de page."
        actions={
          <Button pleineLargeur onClick={() => choisir(audience)}>
            Enregistrer mes choix
          </Button>
        }
      >
        <div className="grid gap-4">
          <div>
            <p className="m-0 font-semibold">Indispensables</p>
            <p className="m-0 text-sm text-neutre-800">
              Connexion, sécurité, mémorisation de ce choix. Toujours actifs, ils ne servent à aucun
              suivi.
            </p>
          </div>
          <Checkbox checked={audience} onChange={(e) => setAudience(e.target.checked)}>
            <span className="grid gap-0.5">
              <span className="font-semibold">Mesure d&apos;audience détaillée</span>
              <span className="text-sm text-neutre-800">
                Parcours de navigation anonymisés pour améliorer les pages, hébergés en Union
                européenne.
              </span>
            </span>
          </Checkbox>
        </div>
      </Feuille>
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
