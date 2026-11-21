/** Pictogramme d'une prestation : tracé SVG 24 × 24 du référentiel (maquette). */
export function Icone({ trace, taille = 46 }: { trace: string; taille?: 44 | 46 | 48 }) {
  return (
    <span
      className="grid flex-none place-items-center rounded-[12px] bg-accent-100"
      style={{ width: taille, height: taille }}
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="text-accent-700"
      >
        <path d={trace} />
      </svg>
    </span>
  );
}
