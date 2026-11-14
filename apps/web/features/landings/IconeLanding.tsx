import type { IconeLanding as Nom } from '@ph/core/landings';

/** Pictogrammes de la maquette `Landing Outil` (constante `IC`), trait de 1,7. */
const TRACES: Record<Nom, string> = {
  demandes: 'M4 6h16v10H9l-5 3V6z',
  fiche: 'M4 5h16v14H4zM8 9h8M8 13h5',
  site: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z',
  devis: 'M7 3h7l4 4v14H7zM14 3v4h4M10 12h5M10 16h5',
  suivi: 'M4 4h16v16H4zM4 9h16M9 4v16',
  avis: 'm12 3.8 2.5 5.1 5.6.8-4 3.9 1 5.6-5.1-2.7-5.1 2.7 1-5.6-4-3.9 5.6-.8z',
  zone: 'M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11zM12 10h.01',
  ia: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6',
  mobile: 'M8 3h8v18H8zM11 18h2',
  check: 'M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6zM9 12l2 2 4-4',
  signe: 'M4 19c3-1 4-6 7-6s2 4 5 4 3-3 4-3M4 5h10',
};

export function IconeLanding({ nom, taille = 22 }: { nom: Nom; taille?: number }) {
  return (
    <svg
      width={taille}
      height={taille}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={TRACES[nom]} />
    </svg>
  );
}
