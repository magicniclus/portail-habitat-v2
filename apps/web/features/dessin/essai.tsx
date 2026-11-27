'use client';

import { bouton } from '@ph/ui';
import Link from 'next/link';
import { createContext, useContext } from 'react';
import { routes } from '@/lib/routes';
import { effacerBrouillon, lireBrouillon } from './brouillons';

/**
 * Essai sans compte (DES-03) : la scène reste dans IndexedDB sous cette clé, rien n'est envoyé
 * au serveur. Après connexion, « Mes plans » la reprend en vrai plan, puis l'efface.
 */
export const CLE_ESSAI = 'essai';
export const lireEssai = () => lireBrouillon(CLE_ESSAI);
export const effacerEssai = () => effacerBrouillon(CLE_ESSAI);
/** Après connexion : « Mes plans » crée le plan depuis l'essai. */
const SUITE_ESSAI = `${routes.monEspacePlans}?essai=1`;
export const connexionEssai = () => routes.connexionSuite(SUITE_ESSAI);

const Contexte = createContext(false);
export const FournisseurEssai = Contexte.Provider;
/** Vrai dans l'éditeur d'essai : les fonctions qui passent par le serveur invitent au compte. */
export const useEssai = () => useContext(Contexte);

/** Remplace une fonction qui demande un compte (import, partage, PDF, photo, adresse…). */
export function CompteRequis({ pour }: { pour: string }) {
  return (
    <div className="grid gap-2 rounded-[10px] bg-accent-100 p-3.5 text-sm leading-5">
      <p className="m-0">
        Créez votre compte gratuit pour {pour}. Votre plan d’essai est repris tel quel.
      </p>
      <Link href={connexionEssai()} className={bouton({ taille: 'sm' })}>
        Créer mon compte gratuit
      </Link>
    </div>
  );
}
