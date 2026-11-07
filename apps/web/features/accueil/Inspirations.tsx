import { EnTeteSection, Section } from '@/features/vitrine/Section';
import { Visuel } from '@/features/vitrine/Visuel';
import type { choisirInspirations } from './vitrine';

/** Réalisations photographiées par les clients (D49) ; masqué s'il y en a moins de 4. */
export function Inspirations({ liste }: { liste: ReturnType<typeof choisirInspirations> }) {
  if (liste.length === 0) return null;
  return (
    <Section id="inspirations">
      <EnTeteSection
        titre="Inspirations du moment"
        chapeau="Des réalisations récentes, photographiées par les clients après le chantier."
        className="mb-6"
      />
      <ul className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(min(230px,100%),1fr))] gap-[18px] p-0">
        {liste.map((i) => (
          <li key={i.id} className="overflow-hidden rounded-card bg-blanc shadow-sm">
            <span className="block aspect-[4/3]">
              <Visuel
                src={i.photo}
                alt={`${i.titre}, réalisation${i.detail ? ` à ${i.detail}` : ''}`}
              />
            </span>
            <span className="block px-4 py-3.5">
              <span className="mb-[3px] block text-[16.5px] font-semibold">{i.titre}</span>
              <span className="block text-[13.5px] text-neutre-700">{i.detail}</span>
            </span>
          </li>
        ))}
      </ul>
    </Section>
  );
}
