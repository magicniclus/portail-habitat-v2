'use client';

import { verifierRythme, type MotTranscrit, type PlanMontage } from '@ph/core/studio';
import { Banner } from '@ph/ui';
import { EditeurMontage } from './EditeurMontage';

/** Étape 4 : l'éditeur de montage (frise, aperçu, réglages) et les retouches par Claude. */
export function EtapeMontage(p: {
  projetId: string;
  plan: PlanMontage;
  prise: { ecran?: string; camera?: string; voix?: string };
  captures: Record<string, string>;
  mots: MotTranscrit[];
  camera: boolean;
  dureePriseMs: number;
  /** Version du plan : une nouvelle version repart d'un brouillon propre. */
  version: number;
}) {
  const rythme = verifierRythme(p.plan);
  return (
    <section
      aria-labelledby="montage-studio"
      className="grid gap-3 rounded-card border border-trait bg-blanc p-4"
    >
      <h2 id="montage-studio" className="m-0 text-lg">
        Montage · {p.plan.titre}
      </h2>
      {rythme.messages.length ? (
        <Banner tone="attention" titre="Pour garder l’attention">
          <ul className="m-0 pl-5">
            {rythme.messages.slice(0, 4).map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
          Ajoutez une coupe ou une animation dans la frise, ou demandez à Claude « resserre le
          rythme ».
        </Banner>
      ) : null}
      <EditeurMontage key={p.version} {...p} />
    </section>
  );
}
