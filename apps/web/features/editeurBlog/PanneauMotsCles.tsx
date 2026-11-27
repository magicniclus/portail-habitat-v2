'use client';

import { Button, Chip, Field, Input } from '@ph/ui';
import { useState } from 'react';
import type { ChampsArticle } from './useArticle';

/**
 * Mots-clés (BLOG §3) : mot-clé principal et secondaires. Volumes, difficulté et tendance
 * attendent le choix du fournisseur de données (D68 ⏳) : rien n'est affiché d'inventé.
 */
export function PanneauMotsCles({
  c,
  maj,
}: {
  c: ChampsArticle;
  maj: (p: Partial<ChampsArticle>) => void;
}) {
  const [saisie, setSaisie] = useState('');
  return (
    <div className="grid gap-4">
      <Field
        label="Mot-clé principal"
        aide="L’expression que vos clients tapent dans Google, à reprendre dans le titre."
      >
        <Input
          value={c.motCle}
          maxLength={80}
          placeholder="ex. pompe à chaleur Bordeaux"
          onChange={(e) => maj({ motCle: e.target.value })}
        />
      </Field>
      <form
        className="grid gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const m = saisie.trim();
          if (m && !c.motsSecondaires.includes(m) && c.motsSecondaires.length < 10)
            maj({ motsSecondaires: [...c.motsSecondaires, m] });
          setSaisie('');
        }}
      >
        <Field label="Mots-clés secondaires">
          <Input value={saisie} maxLength={80} onChange={(e) => setSaisie(e.target.value)} />
        </Field>
        <div>
          <Button type="submit" variant="secondaire" taille="sm">
            Ajouter
          </Button>
        </div>
      </form>
      {c.motsSecondaires.length ? (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Mots-clés secondaires">
          {c.motsSecondaires.map((m) => (
            <Chip
              key={m}
              onClick={() => maj({ motsSecondaires: c.motsSecondaires.filter((x) => x !== m) })}
              aria-label={`Retirer ${m}`}
            >
              {m} ×
            </Chip>
          ))}
        </div>
      ) : null}
      <p className="m-0 text-sm text-neutre-700">
        Volumes de recherche, difficulté et tendance sur 12 mois : bientôt disponibles.
      </p>
    </div>
  );
}
