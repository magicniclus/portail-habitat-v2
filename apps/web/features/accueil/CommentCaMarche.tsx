import { Section } from '@/features/vitrine/Section';
import { ETAPES } from './contenu';

export function CommentCaMarche() {
  return (
    <Section id="devis">
      <h2 className="m-0 mb-7 text-[clamp(26px,3.2vw,36px)] leading-[1.12]">Comment ça marche</h2>
      <ol className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(min(240px,100%),1fr))] gap-[22px] p-0">
        {ETAPES.map((e, i) => (
          <li key={e.titre} className="rounded-card bg-accent-100 px-[22px] py-6">
            <span
              aria-hidden="true"
              className="mb-4 flex size-[42px] items-center justify-center rounded-full bg-accent-action text-lg font-bold text-blanc"
            >
              {i + 1}
            </span>
            <h3 className="m-0 mb-2 text-xl">{e.titre}</h3>
            <p className="m-0 mb-2.5 text-[15.5px] leading-[25px] text-neutre-800">{e.texte}</p>
            <p className="m-0 text-[13px] font-semibold text-accent-700">{e.delai}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}
