import { LIBELLES_LABELS } from '@ph/core/annuaire';
import { PlusIcon } from '@phosphor-icons/react/ssr';
import { CarteFiche } from './CarteFiche';

/**
 * « Certifications & labels » (maquette Ma fiche) : seulement les labels prouvés par un document
 * validé par l'équipe ; « + » mène au dépôt du justificatif (attestation, certificat).
 */
export function Certifications({ labels, ajout }: { labels: string[]; ajout: boolean }) {
  return (
    <CarteFiche titre="Certifications & labels">
      <ul className="m-0 flex list-none flex-wrap items-center gap-2 p-0">
        {labels.map((l) => (
          <li
            key={l}
            className="rounded-pill border border-accent-300 bg-accent-100 px-3.5 py-1.5 text-sm font-semibold text-accent-800"
          >
            {(LIBELLES_LABELS as Record<string, string>)[l] ?? l}
          </li>
        ))}
        {ajout ? (
          <li>
            <a
              href="#documents"
              className="flex size-11 items-center justify-center rounded-full border border-dashed border-neutre-500 text-neutre-800"
            >
              <PlusIcon size={18} aria-hidden="true" />
              <span className="sr-only">Ajouter une certification : déposer le justificatif</span>
            </a>
          </li>
        ) : null}
      </ul>
      {labels.length === 0 ? (
        <p className="m-0 text-sm text-neutre-800">
          Aucune certification vérifiée pour l&apos;instant : déposez le justificatif, notre équipe
          le vérifie.
        </p>
      ) : null}
    </CarteFiche>
  );
}
