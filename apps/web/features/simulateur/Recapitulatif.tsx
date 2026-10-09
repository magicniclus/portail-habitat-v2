import { reponseLisible } from '@ph/core/parcours/reponses';
import { Icone } from './Icone';
import { LIBELLES_ACCES, type Chantier, type PrestationSimulateur, type Reponses } from './types';

/** Réponses déjà données (encadré latéral de la maquette), sans aucun montant. */
export function Recapitulatif({
  prestation: p,
  reponses,
  jusqua,
  chantier,
  onChanger,
}: {
  prestation: PrestationSimulateur;
  reponses: Reponses;
  /** Étape courante : seules les réponses des étapes précédentes sont listées. */
  jusqua: number;
  chantier?: Chantier;
  onChanger: () => void;
}) {
  const lignes = p.champs
    .filter((c) => c.e < jusqua)
    .map((c) => [c.label, reponseLisible(c, reponses[c.id]) || 'Aucune'] as const);
  if (chantier)
    lignes.push(
      ['Code postal', chantier.codePostal || '—'],
      ['Accès', LIBELLES_ACCES[chantier.acces]],
    );
  return (
    <div className="rounded-[16px] bg-blanc p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <Icone trace={p.icone} taille={44} />
        <span>
          <strong className="block text-[17px]">{p.nom}</strong>
          <button
            type="button"
            onClick={onChanger}
            className="inline-flex min-h-11 cursor-pointer items-center border-0 bg-transparent p-0 text-[13.5px] font-semibold text-accent-700"
          >
            Changer de prestation
          </button>
        </span>
      </div>
      {lignes.length ? (
        <>
          <p className="m-0 mb-3 text-[14.5px] font-bold">Vos réponses</p>
          <dl className="m-0 grid gap-2 text-[13.5px] leading-5">
            {lignes.map(([q, r]) => (
              <div key={q} className="flex justify-between gap-3">
                <dt className="text-neutre-700">{q}</dt>
                <dd className="m-0 text-right font-bold">{r}</dd>
              </div>
            ))}
          </dl>
        </>
      ) : null}
    </div>
  );
}
