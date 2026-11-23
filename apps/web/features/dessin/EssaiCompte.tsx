'use client';

import { Banner, Button, FermerFeuille, Modal } from '@ph/ui';
import { CaretDownIcon, CaretUpIcon } from '@phosphor-icons/react';
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

/**
 * Bandeau de l'essai sans compte (DES-03) : réductible en une pastille qui reste visible ;
 * « Créer mon compte » toujours à portée.
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
  const creer = (
    <Button taille="sm" onClick={() => router.push(connexionEssai())}>
      Créer mon compte
    </Button>
  );
  if (reduit)
    return (
      <div className="flex items-center gap-2 justify-self-start rounded-full border border-info/40 bg-info-fond py-1 pr-1 pl-3 text-sm font-semibold shadow-sm">
        Essai sans compte
        {creer}
        <button
          type="button"
          aria-label="Agrandir le bandeau d’essai"
          onClick={() => basculer(false)}
          className="grid size-11 cursor-pointer place-items-center rounded-full border-0 bg-transparent text-texte hover:bg-info/10"
        >
          <CaretDownIcon aria-hidden="true" />
        </button>
      </div>
    );
  return (
    <Banner
      tone="info"
      titre="Essai sans compte"
      action={
        <div className="flex items-center gap-1">
          {creer}
          <button
            type="button"
            aria-label="Réduire le bandeau d’essai"
            onClick={() => basculer(true)}
            className="grid size-11 cursor-pointer place-items-center rounded-full border-0 bg-transparent text-texte hover:bg-info/10"
          >
            <CaretUpIcon aria-hidden="true" />
          </button>
        </div>
      }
    >
      Votre plan reste sur cet appareil. Créez votre compte gratuit pour l’enregistrer.
    </Banner>
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
