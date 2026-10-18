import { ICONES } from './contenu';

/** Pictogramme au trait des maquettes diagnostic (décoratif). */
export function Icone({ nom, taille = 22 }: { nom: keyof typeof ICONES; taille?: number }) {
  return (
    <svg
      width={taille}
      height={taille}
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--accent-700)"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={ICONES[nom]} />
    </svg>
  );
}
