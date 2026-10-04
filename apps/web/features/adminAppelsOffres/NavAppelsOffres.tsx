import type { Route } from 'next';
import Link from 'next/link';

const LIENS = [
  ['/admin/appels-d-offres', 'Appels d’offres'],
  ['/admin/appels-d-offres/baremes', 'Barèmes'],
] as const;

/** Sous-sections d'« Appels d'offres et prix » (ADMIN §2.5). */
export function NavAppelsOffres({ actif }: { actif: (typeof LIENS)[number][0] }) {
  return (
    <nav
      aria-label="Appels d’offres et prix"
      className="flex flex-wrap gap-1 border-b border-trait"
    >
      {LIENS.map(([href, nom]) => (
        <Link
          key={href}
          href={href as Route}
          aria-current={href === actif ? 'page' : undefined}
          className="flex min-h-11 items-center border-b-2 border-transparent px-3 text-sm text-neutre-700 no-underline aria-[current=page]:border-accent-600 aria-[current=page]:font-bold aria-[current=page]:text-texte"
        >
          {nom}
        </Link>
      ))}
    </nav>
  );
}
