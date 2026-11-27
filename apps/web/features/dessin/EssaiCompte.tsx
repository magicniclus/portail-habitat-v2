'use client';

import { Button, FermerFeuille, Modal } from '@ph/ui';
import { CaretDownIcon, CaretUpIcon, CheckIcon, CloudSlashIcon } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { connexionEssai } from './essai';

const CLE_REDUIT = 'dessin-essai-reduit';
const lireReduit = () => {
  try {
    return sessionStorage.getItem(CLE_REDUIT) === '1';
  } catch {
    return false;
  }
};

/** Petit bouton rond (caret) : 32 px à l'œil, zone de clic de 44 px. */
const ROND =
  'relative grid size-8 shrink-0 cursor-pointer place-items-center rounded-full border-0 bg-transparent text-neutre-700 after:absolute after:-inset-1.5 after:content-[""] hover:bg-neutre-100';
/** Bouton d'appel compact : 32 px à l'œil, zone de clic de 44 px. */
const APPEL =
  'relative inline-flex h-8 shrink-0 cursor-pointer items-center rounded-full border-0 bg-accent-action px-3 text-xs font-semibold whitespace-nowrap text-blanc after:absolute after:inset-x-0 after:-inset-y-1.5 after:content-[""] hover:bg-accent-700';
const AVANTAGES = ['Sauvegardé en ligne', 'Sur tous vos appareils', 'PDF et partage'];

/**
 * Bandeau de l'essai sans compte (DES-03) : une pastille discrète qui rappelle que le plan
 * n'est pas sauvegardé, ou un encart qui dit pourquoi créer son compte. Toujours à portée.
 */
export function BandeauEssai() {
  const router = useRouter();
  const [reduit, setReduit] = useState(lireReduit);
  const basculer = (v: boolean) => {
    setReduit(v);
    try {
      sessionStorage.setItem(CLE_REDUIT, v ? '1' : '0');
    } catch {
      // Stockage indisponible : le choix vaut pour cette page seulement.
    }
  };
  const creer = () => router.push(connexionEssai());
  if (reduit)
    return (
      <div className="flex items-center gap-2 justify-self-start rounded-full border border-neutre-200 bg-blanc py-1 pr-1 pl-2.5 shadow-md">
        <CloudSlashIcon aria-hidden="true" className="size-4 shrink-0 text-attention" />
        <p className="m-0 text-xs leading-tight font-semibold text-neutre-800">
          Essai sans compte
          <span className="hidden font-normal sm:inline"> · non sauvegardé</span>
        </p>
        <button type="button" className={APPEL} onClick={creer}>
          Sauvegarder gratuitement
        </button>
        <button
          type="button"
          aria-label="Agrandir le bandeau d’essai"
          onClick={() => basculer(false)}
          className={ROND}
        >
          <CaretDownIcon aria-hidden="true" className="size-4" />
        </button>
      </div>
    );
  return (
    <section
      aria-label="Essai sans compte"
      className="w-full max-w-[340px] justify-self-start rounded-xl border border-neutre-200 bg-blanc p-3 shadow-lg"
    >
      <div className="flex items-start gap-2.5">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-attention-fond">
          <CloudSlashIcon aria-hidden="true" className="size-4 text-attention" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="m-0 text-[11px] font-semibold tracking-wide text-neutre-600 uppercase">
            Essai sans compte
          </p>
          <p className="m-0 text-sm leading-snug font-semibold text-neutre-800">
            Ne perdez pas votre plan
          </p>
        </div>
        <button
          type="button"
          aria-label="Réduire le bandeau d’essai"
          onClick={() => basculer(true)}
          className={ROND}
        >
          <CaretUpIcon aria-hidden="true" className="size-4" />
        </button>
      </div>
      <p className="m-0 mt-2 text-xs leading-snug text-neutre-700">
        Il n’est gardé que sur cet appareil : il disparaît si vous videz le navigateur.
      </p>
      <ul className="m-0 mt-2 flex list-none flex-wrap gap-x-3 gap-y-1 p-0">
        {AVANTAGES.map((a) => (
          <li key={a} className="flex items-center gap-1 text-xs text-neutre-800">
            <CheckIcon aria-hidden="true" weight="bold" className="size-3.5 text-succes" />
            {a}
          </li>
        ))}
      </ul>
      <Button taille="sm" pleineLargeur className="mt-3" onClick={creer}>
        Créer mon compte gratuit
      </Button>
      <p className="m-0 mt-1.5 text-center text-[11px] text-neutre-600">
        Votre plan est repris tel quel.
      </p>
    </section>
  );
}

/**
 * Fenêtre « Enregistrer » pendant l'essai : le plan est gardé sur l'appareil ; créer son compte
 * l'enregistre pour de bon (repris tel quel après connexion), ou l'on continue l'essai.
 */
export function useModaleEssai() {
  const router = useRouter();
  const [ouverte, setOuverte] = useState(false);
  return {
    ouvrir: () => setOuverte(true),
    modale: (
      <Modal
        open={ouverte}
        onOpenChange={setOuverte}
        titre="Enregistrez votre plan"
        description="Votre plan est gardé sur cet appareil. Créez votre compte gratuit pour l’enregistrer pour de bon et le retrouver partout : il est repris tel quel."
        actions={
          <>
            <FermerFeuille asChild>
              <Button variant="secondaire">Continuer l’essai</Button>
            </FermerFeuille>
            <Button onClick={() => router.push(connexionEssai())}>Créer mon compte gratuit</Button>
          </>
        }
      />
    ),
  };
}
