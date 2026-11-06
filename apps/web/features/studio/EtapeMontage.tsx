'use client';

import { verifierRythme, type MotTranscrit, type PlanMontage } from '@ph/core/studio';
import { Banner } from '@ph/ui';
import { ApercuMontage } from './ApercuMontage';
import { ReglagesMontage } from './ReglagesMontage';

/** Étape 4 : aperçu du montage, réglages directs et retouches demandées à Claude. */
export function EtapeMontage(p: {
  projetId: string;
  plan: PlanMontage;
  prise: { ecran?: string; camera?: string; voix?: string };
  captures: Record<string, string>;
  mots: MotTranscrit[];
  camera: boolean;
}) {
  const rythme = verifierRythme(p.plan);
  return (
    <section
      aria-labelledby="montage-studio"
      className="grid gap-3 rounded-card border border-trait bg-blanc p-4"
    >
      <h2 id="montage-studio" className="m-0 text-lg">
        4. Montage · {p.plan.titre}
      </h2>
      {rythme.messages.length ? (
        <Banner tone="attention" titre="Pour garder l’attention">
          <ul className="m-0 pl-5">
            {rythme.messages.slice(0, 4).map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
          Demandez à Claude : « resserre le rythme » dans les retouches.
        </Banner>
      ) : null}
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(300px,400px)]">
        <ApercuMontage plan={p.plan} prise={p.prise} captures={p.captures} mots={p.mots} />
        <ReglagesMontage
          projetId={p.projetId}
          plan={p.plan}
          camera={p.camera}
          ecran={Boolean(p.prise.ecran)}
        />
      </div>
    </section>
  );
}
