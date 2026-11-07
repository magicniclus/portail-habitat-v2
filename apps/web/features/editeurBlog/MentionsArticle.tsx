import { LIBELLES_MENTIONS_BLOG } from '@ph/core/blog';
import Link from 'next/link';
import { routes } from '@/lib/routes';
import type { EditeurArticleDonnees } from '@/server/blog';

/** Mentions légales sous l'article (BLOG §4) : lues dans Devis & factures › Paramètres. */
export function MentionsArticle({ mentions }: { mentions: EditeurArticleDonnees['mentions'] }) {
  return (
    <section
      aria-labelledby="mentions-article"
      className="grid gap-2 rounded-[12px] bg-neutre-100 p-4"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="mentions-article" className="m-0 text-lg">
          Mentions légales sous l’article
        </h2>
        <Link href={routes.proDevisParametres}>Modifier dans Devis & factures › Paramètres</Link>
      </div>
      <p className="m-0 text-sm text-neutre-800">
        Les mêmes que sur vos devis et factures : modifiées une fois, à jour partout.
      </p>
      <ul className="m-0 grid list-none gap-1 p-0 text-[15px]">
        {mentions.lignes.map((l) => (
          <li key={l.cle}>
            <strong>{l.libelle}</strong> · {l.texte}
          </li>
        ))}
      </ul>
      {!mentions.complet ? (
        <p className="m-0 font-semibold text-danger">
          À compléter avant de publier :{' '}
          {mentions.manquantes.map((m) => LIBELLES_MENTIONS_BLOG[m] ?? m).join(', ')}.
        </p>
      ) : null}
    </section>
  );
}
