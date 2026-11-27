import { LIBELLES_TOITURE, type TypeToiture } from '@ph/core/dessin';
import { COULEURS_COUVERTURE, COULEURS_PLAN } from '@ph/ui/tokens';

/** Silhouette de chaque forme, vue de face (repère 48 × 32). */
const SILHOUETTES: Record<TypeToiture, string> = {
  deux_pans: '6,20 24,5 42,20',
  quatre_pans: '6,20 17,8 31,8 42,20',
  croupe: '6,20 19,9 24,5 29,9 42,20',
  monopente: '6,8 42,15 42,20 6,20',
  plate: '5,17 43,17 43,20 5,20',
  mansarde: '6,20 10,10 18,6 30,6 38,10 42,20',
};

const COUVERTURES = [
  ['tuile', 'Tuiles'],
  ['ardoise', 'Ardoise'],
  ['zinc', 'Zinc'],
  ['bac_acier', 'Bac acier'],
  ['vegetalise', 'Végétalisée'],
] as const;
export type Couverture = (typeof COUVERTURES)[number][0];

const carte =
  'grid min-h-11 cursor-pointer justify-items-center gap-1 rounded-[10px] border-2 bg-blanc p-1.5 text-[13px] font-semibold font-[inherit] text-texte transition-colors hover:bg-neutre-100';
/** Carte de forme : plus serrée (nom et avis doivent tenir sur un téléphone, à trois de front). */
const carteForme =
  'grid min-h-11 cursor-pointer content-between justify-items-center gap-1 rounded-[10px] border-2 bg-blanc px-0.5 py-1.5 text-[12px] leading-tight font-semibold font-[inherit] text-texte transition-colors hover:bg-neutre-100';
const etat = (oui: boolean) => (oui ? 'border-accent bg-accent-100' : 'border-neutre-200');

/**
 * Formes de toit en pictogrammes (DES-16) : un clic pose ou change le toit. Les formes
 * conseillées pour cette maison passent devant ; les autres restent possibles, signalées
 * « Pas optimal » avec la raison (sous la grille quand on la choisit).
 */
export function FormesToit({
  actif,
  choisir,
  conseils,
}: {
  actif: TypeToiture | null;
  choisir: (t: TypeToiture) => void;
  conseils: Record<TypeToiture, string | null>;
}) {
  const types = (Object.keys(LIBELLES_TOITURE) as TypeToiture[]).sort(
    (a, b) => Number(conseils[a] !== null) - Number(conseils[b] !== null),
  );
  const raison = actif ? conseils[actif] : null;
  return (
    <div className="grid gap-2">
      <div role="group" aria-label="Forme du toit" className="grid grid-cols-3 gap-2">
        {types.map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={actif === t}
            aria-describedby={`conseil-toit-${t}`}
            title={conseils[t] ?? undefined}
            className={`${carteForme} ${etat(actif === t)}`}
            onClick={() => choisir(t)}
          >
            <svg viewBox="0 0 48 32" aria-hidden="true" className="h-8 w-12">
              <rect
                x={9}
                y={20}
                width={30}
                height={10}
                fill={COULEURS_COUVERTURE.facade}
                stroke={COULEURS_PLAN.mur}
              />
              <polygon
                points={SILHOUETTES[t]}
                fill={COULEURS_COUVERTURE.tuile}
                stroke={COULEURS_PLAN.mur}
                strokeLinejoin="round"
              />
            </svg>
            {LIBELLES_TOITURE[t]}
            <span
              id={`conseil-toit-${t}`}
              className={`rounded-full px-1 text-[10px] whitespace-nowrap leading-4 font-semibold ${conseils[t] === null ? 'bg-succes-fond text-succes' : 'bg-neutre-100 text-neutre-700'}`}
            >
              {conseils[t] === null ? 'Conseillé' : 'Pas optimal'}
            </span>
          </button>
        ))}
      </div>
      {raison ? (
        <p
          role="status"
          className="m-0 rounded-[10px] bg-attention-fond px-3 py-2 text-[13px] leading-5 text-texte"
        >
          Pas optimal pour cette maison. {raison}
        </p>
      ) : null}
    </div>
  );
}

/** Couverture en pastilles de couleur. */
export function CouverturesToit({
  actif,
  choisir,
}: {
  actif: Couverture;
  choisir: (c: Couverture) => void;
}) {
  return (
    <div role="group" aria-label="Couverture" className="grid grid-cols-3 gap-2">
      {COUVERTURES.map(([c, libelle]) => (
        <button
          key={c}
          type="button"
          aria-pressed={actif === c}
          className={`${carte} ${etat(actif === c)}`}
          onClick={() => choisir(c)}
        >
          <span
            aria-hidden="true"
            className="size-6 rounded-full ring-1 ring-neutre-300"
            style={{ backgroundColor: COULEURS_COUVERTURE[c] }}
          />
          {libelle}
        </button>
      ))}
    </div>
  );
}
