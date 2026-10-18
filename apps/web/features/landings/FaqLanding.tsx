'use client';

import { evenementLanding, type OutilLanding } from '@ph/core/landings';
import { pousserEvenement } from '@/lib/dataLayer';

/** FAQ en accordéons natifs ; chaque ouverture remonte `faq_opened` (LANDINGS §5). */
export function FaqLanding({
  outil,
  faq,
}: {
  outil: OutilLanding;
  faq: readonly { q: string; r: string }[];
}) {
  return (
    <div>
      {faq.map((f, i) => (
        <details
          key={f.q}
          open={i === 0}
          onToggle={(e) => {
            if (e.currentTarget.open)
              pousserEvenement(evenementLanding('faq_opened', outil, { question: f.q }));
          }}
          className="group border-b border-trait py-4"
        >
          <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-4 text-[17px] font-semibold">
            {f.q}
            <span aria-hidden="true" className="text-xl text-accent-700 group-open:rotate-45">
              +
            </span>
          </summary>
          <p className="m-0 mt-3 text-[15.5px] leading-[25px] text-neutre-800">{f.r}</p>
        </details>
      ))}
    </div>
  );
}
