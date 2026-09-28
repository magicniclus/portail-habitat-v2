import { cn } from '@ph/ui';
import type { Route } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

/** Largeur et marges des sections des maquettes publiques (1280 px, gouttière fluide). */
export const conteneur = 'mx-auto w-full max-w-[1280px] px-[clamp(18px,4vw,44px)]';
const espaceSection = 'py-[clamp(44px,5.5vw,80px)]';

export function Section({
  id,
  className,
  fond,
  children,
  etiquette,
}: {
  id?: string;
  className?: string;
  /** Classe de fond pleine largeur (bande colorée) ; sinon section sans fond. */
  fond?: string;
  children: ReactNode;
  /** Nom accessible de la région (sinon, son premier titre). */
  etiquette?: string;
}) {
  const interieur = <div className={cn(conteneur, className)}>{children}</div>;
  return (
    <section
      id={id}
      aria-label={etiquette}
      className={cn('scroll-mt-20', fond ? cn(fond, espaceSection) : 'pt-[clamp(44px,5.5vw,80px)]')}
    >
      {interieur}
    </section>
  );
}

/** Titre de section, chapeau et lien « Voir tout → » aligné à droite. */
export function EnTeteSection({
  titre,
  chapeau,
  lien,
  className,
}: {
  titre: ReactNode;
  chapeau?: ReactNode;
  lien?: { libelle: string; href: Route };
  className?: string;
}) {
  return (
    <div className={cn('mb-7 flex flex-wrap items-end justify-between gap-4', className)}>
      <div>
        <h2 className="m-0 mb-2 text-[clamp(26px,3.2vw,36px)] leading-[1.12]">{titre}</h2>
        {chapeau ? (
          <p className="m-0 max-w-[56ch] text-[17px] leading-[26px] text-neutre-800">{chapeau}</p>
        ) : null}
      </div>
      {lien ? (
        <Link
          href={lien.href}
          className="inline-flex min-h-11 items-center text-[15px] font-semibold"
        >
          {lien.libelle} <span aria-hidden="true">&nbsp;→</span>
        </Link>
      ) : null}
    </div>
  );
}

/** FAQ en accordéons natifs `<details>` (colonne de droite des maquettes). */
export function ListeFaq({ faq }: { faq: readonly { q: string; r: string }[] }) {
  return (
    <div>
      {faq.map((f) => (
        <details key={f.q} className="group border-b border-trait py-4">
          <summary className="flex min-h-11 cursor-pointer items-center text-[17px] font-semibold">
            {f.q}
          </summary>
          <p className="m-0 mt-3 text-[15.5px] leading-[25px] text-neutre-800">{f.r}</p>
        </details>
      ))}
    </div>
  );
}
