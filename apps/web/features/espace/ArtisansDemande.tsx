import { formatEuros } from '@ph/core/format';
import type { ArtisanDemande } from '@ph/firebase/espace';
import { bouton } from '@ph/ui';
import { initiales } from '@/features/avis/types';

/** Artisans sur le projet : état, devis reçu (montant), accès aux messages. */
export function ArtisansDemande({
  artisans,
  etape,
  onEcrire,
}: {
  artisans: ArtisanDemande[];
  etape: number;
  onEcrire: (artisanId: string) => void;
}) {
  const nbDevis = artisans.filter((a) => a.devisCentimes !== undefined).length;
  return (
    <section aria-labelledby="titre-artisans" className="grid gap-3">
      <h3 id="titre-artisans" className="m-0 text-lg">
        Artisans sur votre projet
      </h3>
      {artisans.length === 0 ? (
        <p className="m-0 text-[15px] leading-6 text-neutre-800">
          Nous sélectionnons les artisans vérifiés de votre secteur. Vous êtes prévenu par email dès
          que l&apos;un d&apos;eux accepte votre demande.
        </p>
      ) : null}
      {artisans.map((a) => (
        <div
          key={a.artisanId}
          className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3.5 rounded-[14px] border border-trait p-3.5 sm:grid-cols-[auto_minmax(0,1fr)_auto]"
        >
          <span
            aria-hidden="true"
            className="grid size-[52px] place-items-center rounded-[12px] bg-accent-100 text-[17px] font-bold text-accent-800"
          >
            {initiales(a.nom)}
          </span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-base font-bold">{a.nom}</span>
            {a.nbAvis > 0 ? (
              <span className="text-sm text-neutre-700">
                <span aria-hidden="true" className="text-etoile">
                  ★
                </span>{' '}
                {a.note.toFixed(1).replace('.', ',')} · {a.nbAvis} avis
              </span>
            ) : null}
            <span className="text-sm font-semibold text-neutre-800">{a.etat}</span>
          </span>
          <span className="col-span-2 flex items-center justify-end gap-3 sm:col-span-1 sm:flex-col sm:items-end sm:gap-1.5">
            {a.devisCentimes !== undefined ? (
              <span className="text-[19px] font-bold">{formatEuros(a.devisCentimes)}</span>
            ) : null}
            <button
              type="button"
              onClick={() => onEcrire(a.artisanId)}
              className={bouton({ variant: 'secondaire' })}
            >
              Écrire<span className="sr-only"> à {a.nom}</span>
            </button>
          </span>
        </div>
      ))}
      {nbDevis >= 2 && etape < 4 ? (
        <p className="m-0 rounded-[10px] bg-accent-100 px-4 py-3.5 text-[15px] leading-normal font-semibold text-accent-800">
          {nbDevis} devis reçus. Prenez le temps de comparer avant de signer.
        </p>
      ) : null}
    </section>
  );
}
