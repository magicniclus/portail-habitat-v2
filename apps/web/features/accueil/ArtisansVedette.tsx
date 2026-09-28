import { formatNombre, formatTel } from '@ph/core/format';
import type { artisanPublic } from '@ph/core/schemas';
import type { z } from '@ph/core/zod';
import { bouton } from '@ph/ui';
import Link from 'next/link';
import { EnTeteSection, Section } from '@/features/vitrine/Section';
import { Visuel } from '@/features/vitrine/Visuel';
import { routes } from '@/lib/routes';

type Fiche = Pick<
  z.output<typeof artisanPublic>,
  | 'slug'
  | 'nomCommercial'
  | 'ville'
  | 'noteMoyenne'
  | 'nbAvis'
  | 'anneesActivite'
  | 'pitch'
  | 'telephone'
  | 'tags'
> & { id: string };

/** « Des artisans vérifiés » : 3 fiches publiques réelles (D49), section masquée sinon. */
export function ArtisansVedette({ fiches }: { fiches: Fiche[] }) {
  if (fiches.length < 3) return null;
  return (
    <Section id="artisans" fond="mt-[clamp(44px,5.5vw,80px)] bg-neutre-100">
      <EnTeteSection
        titre="Des artisans vérifiés, notés par leurs clients"
        chapeau="Assurance décennale, SIRET et avis contrôlés avant publication de la fiche."
        lien={{ libelle: 'Parcourir les artisans', href: routes.artisans }}
      />
      <ul className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(min(280px,100%),1fr))] gap-5 p-0">
        {fiches.map((a) => (
          <li key={a.id}>
            <article className="flex h-full flex-col overflow-hidden rounded-card bg-blanc shadow-sm">
              <div className="aspect-[16/10]">
                <Visuel />
              </div>
              <div className="flex flex-1 flex-col gap-2.5 p-[18px]">
                <div className="flex items-start justify-between gap-2.5">
                  <h3 className="m-0 text-[19px]">{a.nomCommercial}</h3>
                  {a.nbAvis > 0 ? (
                    <span className="flex items-center gap-[5px] text-sm whitespace-nowrap">
                      <span aria-hidden="true" className="text-etoile">
                        ★
                      </span>
                      <strong>{formatNombre(a.noteMoyenne, 1)}</strong>
                      <span className="text-neutre-700">({a.nbAvis} avis)</span>
                    </span>
                  ) : null}
                </div>
                <p className="m-0 text-sm text-neutre-800">
                  {[a.tags.slice(0, 2).join(' · '), a.ville].filter(Boolean).join(' · ')}
                </p>
                <div className="flex flex-wrap gap-[7px]">
                  <span className="rounded-pill bg-accent-100 px-2.5 py-1 text-xs font-semibold text-accent-800">
                    Décennale vérifiée
                  </span>
                  {a.anneesActivite ? (
                    <span className="rounded-pill bg-neutre-200 px-2.5 py-1 text-xs font-semibold text-neutre-800">
                      {a.anneesActivite} ans d&apos;activité
                    </span>
                  ) : null}
                </div>
                <p className="m-0 text-[14.5px] leading-[23px] text-neutre-800">{a.pitch}</p>
                <div className="mt-auto flex flex-wrap gap-2.5 pt-1.5">
                  <Link
                    href={routes.ficheArtisan(a.slug)}
                    className={bouton({ className: 'text-[14.5px]' })}
                  >
                    Voir le profil<span className="sr-only"> de {a.nomCommercial}</span>
                  </Link>
                  {a.telephone ? (
                    <a
                      href={`tel:${a.telephone}`}
                      className={bouton({ variant: 'secondaire', className: 'text-[14.5px]' })}
                    >
                      Appeler
                      <span className="sr-only">
                        {' '}
                        {a.nomCommercial} au {formatTel(a.telephone)}
                      </span>
                    </a>
                  ) : null}
                </div>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </Section>
  );
}
