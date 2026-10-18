import { Button, StickyActionBar } from '@ph/ui';

/**
 * Barre fixe (D26e, ONB-07) : étape, statut explicite, bouton actif seulement quand l'étape est
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
    <StickyActionBar role="region" aria-label={libelle} className="justify-between">
      <span className="grid min-w-0">
        <span className="text-[13px] font-semibold text-neutre-700">{etape}</span>
        <span className="truncate text-[15px] font-bold" aria-live="polite">
          {statut}
        </span>
      </span>
      <Button type="submit" form={formulaire} disabled={!complete || enCours}>
        {enCours ? 'Patientez…' : libelle}
      </Button>
    </StickyActionBar>
  );
}
