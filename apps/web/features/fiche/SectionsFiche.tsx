import { LIBELLES_LABELS } from '@ph/core/annuaire';
import { formatDate } from '@ph/core/format';
import type { AvisFiche, RealisationFiche } from '@ph/firebase/annuaire';
import type { ReactNode } from 'react';

type Label = keyof typeof LIBELLES_LABELS;

export function Bloc({ titre, id, children }: { titre: string; id: string; children: ReactNode }) {
  return (
    <section
      aria-labelledby={id}
      className="rounded-[16px] border border-trait bg-blanc p-[clamp(18px,2.4vw,26px)]"
    >
      <h2 id={id} className="m-0 mb-3 text-xl">
        {titre}
      </h2>
      {children}
    </section>
  );
}

/** Labels vérifiés seulement (FIC-01) : la projection publique a déjà écarté les autres. */
export function Labels({ labels }: { labels: string[] }) {
  if (!labels.length)
    return <p className="m-0 text-[15px] text-neutre-800">Aucun label vérifié pour le moment.</p>;
  return (
    <ul aria-label="Labels vérifiés" className="m-0 flex list-none flex-wrap gap-2 p-0">
      {labels.map((l) => (
        <li
          key={l}
          className="rounded-pill bg-accent-100 px-3 py-1.5 text-sm font-semibold text-accent-800"
        >
          <span aria-hidden="true">✓ </span>
          {LIBELLES_LABELS[l as Label]}
        </li>
      ))}
    </ul>
  );
}

export function Realisations({ liste }: { liste: RealisationFiche[] }) {
  return (
    <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(min(220px,100%),1fr))] gap-3.5 p-0">
      {liste.map((r) => {
        const photo = r.photos[0];
        return (
          <li key={r.id} className="overflow-hidden rounded-[12px] border border-trait">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element -- photos Storage, dimensions connues
              <img
                src={photo.url}
                alt={r.titre}
                width={photo.largeur}
                height={photo.hauteur}
                loading="lazy"
                className="aspect-[4/3] w-full object-cover"
              />
            ) : null}
            <div className="grid gap-1 p-3">
              <strong className="text-[15.5px]">{r.titre}</strong>
              {r.description ? (
                <span className="text-sm text-neutre-800">{r.description}</span>
              ) : null}
              <span className="text-[13px] text-neutre-700">{r.ville}</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function DerniersAvis({ avis }: { avis: AvisFiche[] }) {
  if (!avis.length)
    return <p className="m-0 text-[15px] text-neutre-800">Aucun avis publié pour le moment.</p>;
  return (
    <ul className="m-0 grid list-none gap-3 p-0">
      {avis.map((a) => (
        <li key={a.id} className="rounded-[12px] bg-neutre-100 p-3.5">
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold">
              {a.nomAffiche}{' '}
              <span aria-hidden="true" className="tracking-[2px] text-etoile">
                {'★'.repeat(a.note)}
              </span>
              <span className="sr-only">, note {a.note} sur 5</span>
            </span>
            <span className="text-[13px] text-neutre-700">
              {a.typeTravaux} · {formatDate(a.publieLe)}
            </span>
          </div>
          {a.texte ? <p className="m-0 text-[15px] leading-6 text-neutre-800">{a.texte}</p> : null}
          {a.reponse ? (
            <p className="m-0 mt-2 border-l-2 border-accent-300 pl-3 text-sm text-neutre-800">
              <strong>Réponse de l&apos;artisan :</strong> {a.reponse.texte}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
