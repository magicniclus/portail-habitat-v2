import { phraseDemandesRecentes } from '@ph/core/onboarding';
import { cn } from '@ph/ui';

/** Zone affichée, avec le nombre de demandes récentes calculé (plancher sinon). */
export interface ZoneDemandes {
  ville: string;
  rayonKm: number;
  nombre?: number;
}

/**
 * Demandes récentes de la zone, identiques aux étapes 2 et 3 : le nombre suit le rayon (décision du
 * 17/11/2026, `demandesRecentes`), jamais sous `DEMANDES_RECENTES_MIN`.
 * `compact` : version posée en haut de l'écran sur téléphone, visible sans défiler.
 */
export function DemandesRecentes({
  zone,
  compact = false,
}: {
  zone: ZoneDemandes | null;
  compact?: boolean;
}) {
  if (!zone)
    return compact ? null : (
      <div>
        <h2 className="m-0 mb-2.5 text-[clamp(22px,2.4vw,28px)] leading-[1.18]">
          Des demandes déposées chaque jour, partout en France.
        </h2>
        <p className="m-0 text-[15px] leading-[23px] text-neutre-800">
          Choisissez votre ville : vous verrez l’activité autour de chez vous.
        </p>
      </div>
    );
  const p = phraseDemandesRecentes(zone, zone.nombre);
  return (
    <div
      aria-live="polite"
      className={cn(compact && 'rounded-[12px] border border-accent-300 bg-accent-100 px-3.5 py-3')}
    >
      <p
        className={cn(
          'm-0 font-semibold text-texte',
          compact
            ? 'text-[15px] leading-[22px]'
            : 'mb-2.5 text-[clamp(22px,2.4vw,28px)] leading-[1.22]',
        )}
      >
        {p.phrase}
      </p>
      <p
        className={cn(
          'm-0 text-neutre-800',
          compact ? 'mt-1 text-[13px] leading-5' : 'text-[15px] leading-[23px]',
        )}
      >
        {p.precision}
      </p>
    </div>
  );
}

/** Colonne « L'activité de votre secteur » des étapes 2 et 3 (maquettes Onboarding). */
export function ActiviteSecteur({ zone }: { zone: ZoneDemandes | null }) {
  return (
    <>
      {/* Téléphone : la phrase est déjà en haut de l'écran (version compacte). */}
      <div className="max-md:hidden">
        <p className="m-0 mb-2.5 text-xs font-bold tracking-[0.08em] text-accent-700 uppercase">
          L&apos;activité de votre secteur
        </p>
        <DemandesRecentes zone={zone} />
      </div>
      <p className="m-0 text-[13px] leading-5 text-neutre-800">
        Fond de carte ©{' '}
        <a href="https://www.openstreetmap.org/copyright" rel="noopener" target="_blank">
          OpenStreetMap
        </a>
      </p>
    </>
  );
}
