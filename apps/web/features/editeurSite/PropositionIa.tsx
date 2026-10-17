'use client';

import type { OperationIa } from '@ph/core/sites';
import { Banner, Button } from '@ph/ui';

export interface Proposition {
  resume: string;
  question: string;
  operations: OperationIa[];
  avertissements: string[];
}

/** Proposition de l'IA : changements lisibles, faits à compléter, Appliquer / Autre version / Annuler. */
export function PropositionIa({
  proposition: p,
  enCours,
  onAppliquer,
  onAutre,
  onAnnuler,
}: {
  proposition: Proposition;
  enCours: boolean;
  onAppliquer: () => void;
  onAutre: () => void;
  onAnnuler: () => void;
}) {
  return (
    <section
      aria-labelledby="proposition-ia"
      className="grid gap-3 rounded-[12px] border border-trait p-3"
    >
      <h3 id="proposition-ia" className="m-0 text-lg">
        Proposition
      </h3>
      <ul className="m-0 grid gap-1 pl-5 text-[15px]">
        {p.resume
          .split('\n')
          .filter(Boolean)
          .map((l) => (
            <li key={l}>{l.replace(/^[-•]\s*/, '')}</li>
          ))}
      </ul>
      {p.avertissements.length ? (
        <Banner tone="attention" titre="À compléter avant de publier">
          L’IA n’a pas trouvé ces informations dans votre fiche : {p.avertissements.join(', ')}.
          Remplacez « [à compléter] » par la bonne valeur.
        </Banner>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button onClick={onAppliquer}>Appliquer</Button>
        <Button variant="secondaire" onClick={onAutre} disabled={enCours}>
          Autre version
        </Button>
        <Button variant="fantome" onClick={onAnnuler}>
          Annuler
        </Button>
      </div>
    </section>
  );
}
