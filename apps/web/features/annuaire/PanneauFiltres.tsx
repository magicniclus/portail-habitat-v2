'use client';

import { Button, FermerFeuille, Sheet } from '@ph/ui';
import { useState } from 'react';
import { Filtres, type OptionsFiltres, type ValeursFiltres } from './Filtres';

/**
 * Filtres sur mobile (MOBILE §7) : bouton « Filtres (n) » qui ouvre une feuille du bas ; la liste
 * se met à jour derrière. Sur ordinateur, la colonne de gauche affiche le même formulaire.
 */
export function PanneauFiltres({
  valeurs,
  options,
  nbActifs,
}: {
  valeurs: ValeursFiltres;
  options: OptionsFiltres;
  nbActifs: number;
}) {
  const [ouvert, setOuvert] = useState(false);
  return (
    <Sheet
      open={ouvert}
      onOpenChange={setOuvert}
      titre="Filtres"
      declencheur={
        <Button variant="secondaire" className="lg:hidden">
          Filtres{nbActifs ? ` (${nbActifs})` : ''}
        </Button>
      }
      actions={
        <FermerFeuille asChild>
          <Button pleineLargeur>Voir les artisans</Button>
        </FermerFeuille>
      }
    >
      <Filtres valeurs={valeurs} options={options} id="feuille" />
    </Sheet>
  );
}
