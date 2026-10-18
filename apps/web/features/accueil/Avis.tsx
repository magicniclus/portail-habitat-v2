import { bouton } from '@ph/ui';
import Link from 'next/link';
import { Etoiles } from '@/features/vitrine/Etoiles';
import { Section } from '@/features/vitrine/Section';
import { routes } from '@/lib/routes';
import type { choisirTemoignages, ChiffresVitrine } from './vitrine';

/** Note globale (stats/public) et 3 témoignages réels (D49) ; masqué sans données. */
export function Avis({
  chiffres,
  temoignages,
}: {
  chiffres: ChiffresVitrine;
  temoignages: ReturnType<typeof choisirTemoignages>;
}) {
  if (!chiffres?.note && temoignages.length === 0) return null;
  return (
    <Section id="avis" etiquette="Avis clients">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(240px,100%),1fr))] items-start gap-6">
        <div>
          {chiffres?.note ? (
            <>
              <p className="m-0 mb-2 text-[clamp(40px,5vw,60px)] leading-none font-bold">
                {chiffres.note}
                <span className="text-[0.42em] font-semibold text-neutre-700">/5</span>
              </p>
              <Etoiles className="mb-2 block text-lg tracking-[2px] text-etoile" />
              <p className="m-0 mb-4 text-[15px] leading-6 text-neutre-800">
                Moyenne sur <strong>{chiffres.avisExact} avis clients</strong> vérifiés après
                chantier.
              </p>
            </>
          ) : null}
          <Link
            href={routes.avis}
            className={bouton({ variant: 'secondaire', className: 'text-[15px]' })}
          >
            Laisser un avis
          </Link>
        </div>
        {temoignages.map((t) => (
          <figure
            key={t.id}
            className="m-0 flex h-full flex-col gap-3.5 rounded-card bg-accent-100 p-[22px]"
          >
            <blockquote className="m-0 text-[15.5px] leading-[25px]">{t.texte}</blockquote>
            <figcaption className="mt-auto flex items-center gap-3 text-sm">
              <span
                aria-hidden="true"
                className="flex size-[42px] flex-none items-center justify-center rounded-full bg-accent-200 font-bold text-accent-800"
              >
                {t.initiales}
              </span>
              <span>
                <strong>{t.nom}</strong>
                <br />
                <span className="text-neutre-700">{t.projet}</span>
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </Section>
  );
}
