'use client';

import { niveauDe, type EtatEditeur } from './etat';

/** « Bien démarrer » (maquette) : 4 étapes cochées d'après le plan lui-même. */
export function GuideDemarrage({ etat }: { etat: EtatEditeur }) {
  const n = niveauDe(etat);
  const etapes = [
    { libelle: 'Tracer ou ajuster les murs', fait: n.murs.length > 0 },
    { libelle: 'Obtenir une pièce fermée', fait: n.pieces.length > 0 },
    { libelle: 'Choisir sols et peintures', fait: n.pieces.some((p) => p.sol.famille !== 'aucun') },
    { libelle: 'Consulter le métré', fait: etat.metreVu },
  ];
  const faites = etapes.filter((e) => e.fait).length;
  return (
    <section
      aria-label="Guide de démarrage"
      className="grid gap-3 rounded-card bg-neutre-100 p-3.5"
    >
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <h2 className="m-0 text-base font-bold">Bien démarrer</h2>
          <p className="m-0 mt-0.5 text-[13px] text-neutre-700">
            {faites} étape{faites > 1 ? 's' : ''} sur {etapes.length}
          </p>
        </div>
      </div>
      <div className="h-1.5 overflow-hidden rounded bg-neutre-200">
        <div
          className="h-full bg-accent transition-[width]"
          style={{ width: `${(faites / etapes.length) * 100}%` }}
        />
      </div>
      <ol className="m-0 grid list-none gap-2 p-0">
        {etapes.map((e, i) => (
          <li key={e.libelle} className="flex items-start gap-2.5 text-sm leading-5">
            <span
              aria-hidden="true"
              className={`flex size-[22px] flex-none items-center justify-center rounded-full text-xs font-bold ${e.fait ? 'bg-succes text-blanc' : 'border-[1.5px] border-neutre-300 text-neutre-800'}`}
            >
              {e.fait ? '✓' : i + 1}
            </span>
            <span className={e.fait ? 'text-neutre-700 line-through' : 'font-semibold'}>
              {e.libelle}
              <span className="sr-only">{e.fait ? ' (fait)' : ' (à faire)'}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
