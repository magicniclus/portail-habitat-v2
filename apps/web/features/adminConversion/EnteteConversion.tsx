import type { Route } from 'next';
import Link from 'next/link';

const ONGLETS = [
  ['/admin/conversion', 'Vue d’ensemble'],
  ['/admin/conversion/sequences', 'Séquences'],
  ['/admin/conversion/journal', 'Journal'],
  ['/admin/conversion/fiche', 'Fiche cycle'],
  ['/admin/conversion/taches', 'Tâches'],
  ['/admin/conversion/reglages', 'Réglages'],
] as const;

/** Titre et onglets de Conversion (maquette « Admin Conversion », ADMIN §2.8b). */
export function EnteteConversion({
  actif,
  sousTitre,
}: {
  actif: (typeof ONGLETS)[number][0];
  sousTitre?: string;
}) {
  return (
    <>
      <div>
        <p className="m-0 text-sm text-neutre-700">Finances › Conversion</p>
        <h1 className="m-0 text-[clamp(26px,3vw,32px)]">Conversion et montée en gamme</h1>
        {sousTitre ? <p className="m-0 text-sm text-neutre-800">{sousTitre}</p> : null}
      </div>
      <nav aria-label="Conversion" className="flex flex-wrap gap-1 border-b border-trait">
        {ONGLETS.map(([href, nom]) => (
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
    </>
  );
}

export const CLASSES_PAGE =
  'grid content-start gap-5 px-[clamp(16px,3vw,32px)] py-[clamp(20px,3vw,32px)]';
