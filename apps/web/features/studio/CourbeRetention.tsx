/**
 * Courbe de rétention YouTube : part des spectateurs encore là au fil de la vidéo (0 à 100 %),
 * avec la plus forte chute marquée.
 */
export function CourbeRetention({
  courbe,
  dureeS,
  chuteS,
}: {
  courbe: readonly number[];
  dureeS: number;
  chuteS: number | null;
}) {
  const L = 280;
  const H = 120;
  const max = Math.max(1, ...courbe);
  const points = courbe
    .map(
      (y, i) => `${((i / (courbe.length - 1)) * L).toFixed(1)},${(H - (y / max) * H).toFixed(1)}`,
    )
    .join(' ');
  const xChute = chuteS !== null && dureeS > 0 ? (chuteS / dureeS) * L : null;
  return (
    <figure className="m-0 grid gap-1">
      <svg
        viewBox={`0 0 ${L} ${H}`}
        className="h-auto w-full rounded-control bg-neutre-100"
        role="img"
        aria-label={`Rétention de la vidéo${chuteS !== null ? `, plus forte chute à ${chuteS} s` : ''}`}
      >
        {xChute !== null ? (
          <line
            x1={xChute}
            x2={xChute}
            y1={0}
            y2={H}
            className="stroke-danger"
            strokeDasharray="4 3"
          />
        ) : null}
        <polyline points={points} fill="none" className="stroke-accent" strokeWidth={2} />
      </svg>
      <figcaption className="flex justify-between text-xs text-neutre-700">
        <span>0 s</span>
        {chuteS !== null ? <span className="text-danger">chute à {chuteS} s</span> : null}
        <span>{Math.round(dureeS)} s</span>
      </figcaption>
    </figure>
  );
}
