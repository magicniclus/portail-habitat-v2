'use client';

import { Combobox } from '@ph/ui';
import { useState } from 'react';
import { useLieux, type Lieu } from '@/features/inscription/useLieux';

/**
 * Ville ou code postal avec suggestions (API Découpage administratif via `/api/lieux`) : la
 * commune choisie fournit sa latitude et sa longitude, envoyées avec le formulaire (`lat`,
 * `lon`) pour des distances exactes ; sans choix, la ville saisie est géocodée par le serveur.
 */
export function ChampVille({
  nom = 'ville',
  valeurInitiale = '',
  positionInitiale,
  label = 'Ville ou code postal',
  labelMasque = true,
  placeholder = 'Ville ou code postal',
  className,
  classeChamp,
  onChoix,
}: {
  nom?: string;
  valeurInitiale?: string;
  positionInitiale?: { latitude: number; longitude: number };
  label?: string;
  labelMasque?: boolean;
  placeholder?: string;
  className?: string;
  classeChamp?: string;
  /** Hors formulaire GET : commune choisie (nom, code postal, centre). */
  onChoix?: (l: Lieu) => void;
}) {
  const [saisie, setSaisie] = useState(valeurInitiale);
  const [choisi, setChoisi] = useState<{ nom: string; latitude: number; longitude: number } | null>(
    positionInitiale && valeurInitiale ? { nom: valeurInitiale, ...positionInitiale } : null,
  );
  const lieux = useLieux(saisie, choisi?.nom);
  const position = choisi && choisi.nom === saisie ? choisi : null;
  return (
    <>
      <Combobox
        label={label}
        labelMasque={labelMasque}
        name={nom}
        autoComplete="address-level2"
        valeur={saisie}
        onValeurChange={setSaisie}
        placeholder={placeholder}
        vide="Aucune commune trouvée."
        options={lieux.map((l) => ({
          id: `${l.nom}-${l.codePostal}`,
          libelle: l.nom,
          complement: l.codePostal,
        }))}
        onSelection={(o) => {
          const l = lieux.find((x) => `${x.nom}-${x.codePostal}` === o.id);
          if (!l) return;
          setSaisie(l.nom);
          setChoisi({ nom: l.nom, ...l.centre });
          onChoix?.(l);
        }}
        {...(className ? { className } : {})}
        {...(classeChamp ? { classeChamp } : {})}
      />
      {position ? (
        <>
          <input type="hidden" name="lat" value={position.latitude.toFixed(5)} />
          <input type="hidden" name="lon" value={position.longitude.toFixed(5)} />
        </>
      ) : null}
    </>
  );
}
