/** Garanties sous le bouton d'inscription (maquette Acquisition Artisans v2). */
export function GarantiesInscription() {
  return (
    <>
      <p className="m-0 flex items-start gap-2 text-[13px] leading-5 text-neutre-700">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--accent-700)"
          strokeWidth="1.8"
          strokeLinecap="round"
          aria-hidden="true"
          className="mt-px flex-none"
        >
          <path d="M12 3.2 19.5 6v6c0 4.6-3.1 7.6-7.5 8.9C7.6 19.6 4.5 16.6 4.5 12V6L12 3.2ZM9 12l2 2 4-4" />
        </svg>
        <span>
          Réservé aux entreprises immatriculées et assurées : SIREN et attestation décennale
          vérifiés pour chaque fiche.
        </span>
      </p>
      <ul className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-[13px] text-neutre-800">
        {["0 € à l'inscription", 'Sans engagement', '0 % de commission'].map((t) => (
          <li key={t} className="flex items-center gap-1.5">
            <span aria-hidden="true" className="font-bold text-accent">
              ✓
            </span>
            {t}
          </li>
        ))}
      </ul>
    </>
  );
}
