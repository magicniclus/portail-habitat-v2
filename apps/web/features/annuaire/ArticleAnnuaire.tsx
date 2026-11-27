import type { articleAnnuaire } from '@ph/core/annuaire';
import { bouton } from '@ph/ui';
import Link from 'next/link';
import type { Route } from 'next';

/**
 * Texte d'une page « métier à une ville » ou « travaux à une ville », sous la liste des artisans :
 * la page a un vrai contenu pour le particulier et pour le référencement.
 */
export function ArticleAnnuaire({
  article,
  simulateur,
}: {
  article: NonNullable<ReturnType<typeof articleAnnuaire>>;
  /** Estimation de ces travaux dans le simulateur (pages « travaux à … »). */
  simulateur?: Route;
}) {
  return (
    <article className="mt-10 grid max-w-[860px] gap-3 border-t border-trait pt-8 text-neutre-800">
      <h2 className="m-0 text-[clamp(20px,2.2vw,26px)] leading-tight text-texte">
        {article.titre}
      </h2>
      {article.paragraphes.map((p) => (
        <p key={p} className="m-0 text-base leading-[26px]">
          {p}
        </p>
      ))}
      {simulateur ? (
        <Link href={simulateur} prefetch={false} className={`${bouton()} mt-2 justify-self-start`}>
          Estimer mon projet
        </Link>
      ) : null}
    </article>
  );
}
