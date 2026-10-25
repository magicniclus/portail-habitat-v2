import { intensiteZone } from '@ph/core/onboarding';

/**
 * Colonne « L'activité de votre secteur », identique aux étapes 2 et 3 (maquettes Onboarding) :
 * estimation des demandes de la zone, intensité et note de transparence.
 */
export function ActiviteSecteur({
  zone,
  total,
  source,
  nomMetier,
}: {
  zone: { ville: string; rayonKm: number } | null;
  total: number | null;
  source: 'reel' | 'modele' | null;
  nomMetier: string;
}) {
  return (
    <>
      <div aria-live="polite">
        <p className="m-0 mb-2.5 text-xs font-bold tracking-[0.08em] text-accent-700 uppercase">
          L&apos;activité de votre secteur
        </p>
        {zone && total ? (
          <>
            <h2 className="m-0 mb-2.5 text-[clamp(22px,2.4vw,28px)] leading-[1.18] font-normal">
              <strong>
                ≈ {total} demandes {source === 'reel' ? 'déposées' : 'estimées'}
              </strong>{' '}
              ce mois-ci pour un {nomMetier.toLowerCase()} à {zone.ville}, dans un rayon de{' '}
              {zone.rayonKm} km.
            </h2>
            <p className="m-0 inline-flex items-center gap-2 rounded-pill bg-blanc px-3 py-1.5 text-sm font-semibold text-accent-700">
              <span aria-hidden="true" className="size-2 rounded-full bg-accent" />
              {intensiteZone(total)}
            </p>
          </>
        ) : (
          <>
            <h2 className="m-0 mb-2.5 text-[clamp(22px,2.4vw,28px)] leading-[1.18]">
              Des demandes déposées chaque jour, partout en France.
            </h2>
            <p className="m-0 text-[15px] leading-[23px] text-neutre-800">
              Saisissez votre ville : nous affichons une estimation du nombre de demandes pour votre
              métier dans votre rayon d&apos;intervention.
            </p>
          </>
        )}
      </div>
      <p className="m-0 text-[13px] leading-5 text-neutre-800">
        <strong>Transparence :</strong>{' '}
        {source === 'reel'
          ? 'chiffres des 30 derniers jours pour votre métier et votre zone.'
          : 'estimation basée sur la population de la zone, la saison et la part de votre métier ; remplacée par le décompte réel dès 3 mois d’historique.'}{' '}
        Fond de carte ©{' '}
        <a href="https://www.openstreetmap.org/copyright" rel="noopener" target="_blank">
          OpenStreetMap
        </a>
      </p>
    </>
  );
}
