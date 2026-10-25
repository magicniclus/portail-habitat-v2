import { Button, StickyActionBar } from '@ph/ui';

/**
 * Barre fixe en bas de l'écran (D26e, ONB-07, maquettes Onboarding) : étape, statut explicite, bouton actif seulement quand l'étape est
 * complète. Le bouton soumet le formulaire `formulaire`.
 */
export function BarreEtape({
  etape,
  statut,
  complete,
  libelle,
  formulaire,
  enCours,
}: {
  etape: string;
  statut: string;
  complete: boolean;
  libelle: string;
  formulaire: string;
  enCours?: boolean;
}) {
  return (
    <StickyActionBar
      role="region"
      aria-label={libelle}
      className="fixed inset-x-0 z-[80] border-0 bg-blanc px-[clamp(16px,4vw,40px)] shadow-lg backdrop-blur-none"
    >
      <div className="mx-auto flex w-full max-w-[1240px] items-center justify-between gap-4">
        <span className="grid min-w-0">
          <span className="text-[13px] text-neutre-700">{etape}</span>
          <span className="truncate text-[15.5px] font-bold" aria-live="polite">
            {statut}
          </span>
        </span>
        <Button
          type="submit"
          form={formulaire}
          disabled={!complete || enCours}
          className="min-h-[50px] px-[22px] text-base whitespace-nowrap"
        >
          {enCours ? 'Patientez…' : libelle}
        </Button>
      </div>
    </StickyActionBar>
  );
}
