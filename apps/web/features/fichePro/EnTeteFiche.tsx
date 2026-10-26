import { nomMetier } from '@/features/pro/metiers';
import { Logo } from './Logo';

/**
 * Haut de Ma fiche (maquette) : bannière, logo posé dessus, nom, état en ligne et métiers.
 * `banniere` : zone de la bannière (image et bouton de changement, propres à l'espace pro).
 */
export function EnTeteFiche({
  artisanId,
  nom,
  logoUrl,
  enLigne,
  metiers,
  modifiable,
  banniere,
  ajoutMetier,
}: {
  /** « + » pour ajouter un métier (espace pro, droit de modification). */
  ajoutMetier?: React.ReactNode;
  artisanId: string;
  nom: string;
  logoUrl?: string;
  enLigne: boolean;
  metiers: string[];
  modifiable: boolean;
  banniere: React.ReactNode;
}) {
  return (
    <section
      aria-label="En-tête de la fiche"
      className="overflow-hidden rounded-[16px] border border-trait bg-blanc"
    >
      {banniere}
      <div className="grid gap-4 px-5 pb-5">
        <div className="-mt-10 flex flex-wrap items-end gap-x-4 gap-y-2">
          <Logo
            artisanId={artisanId}
            nom={nom}
            modifiable={modifiable}
            {...(logoUrl ? { logoUrl } : {})}
          />
          <div className="flex min-w-0 flex-wrap items-center gap-3 pb-1">
            <h1 className="m-0 text-[clamp(24px,2.6vw,30px)] leading-tight">{nom}</h1>
            <span
              className={`inline-flex items-center gap-2 rounded-pill border px-3 py-1 text-[13px] font-semibold ${
                enLigne
                  ? 'border-accent-300 bg-accent-100 text-accent-800'
                  : 'border-trait bg-neutre-100 text-neutre-800'
              }`}
            >
              <span
                aria-hidden="true"
                className={`size-2 rounded-full ${enLigne ? 'bg-accent' : 'bg-neutre-500'}`}
              />
              {enLigne ? 'Fiche en ligne' : 'Fiche hors ligne'}
            </span>
          </div>
        </div>
        <ul aria-label="Métiers" className="m-0 flex list-none flex-wrap items-center gap-2 p-0">
          {metiers.map((m) => (
            <li
              key={m}
              className="rounded-pill border border-trait px-3.5 py-1.5 text-sm font-semibold"
            >
              {nomMetier(m) ?? m}
            </li>
          ))}
          {ajoutMetier ? <li>{ajoutMetier}</li> : null}
        </ul>
      </div>
    </section>
  );
}
