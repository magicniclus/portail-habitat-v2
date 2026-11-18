'use client';

import type { TeinteDessin } from '@ph/ui/tokens';

/** Pastilles de couleur d'un revêtement (sol, peinture) ; boutons à 44 px. */
export function Nuancier({
  legende,
  teintes,
  active,
  choisir,
}: {
  legende: string;
  teintes: readonly TeinteDessin[];
  active: string | undefined;
  choisir: (t: TeinteDessin) => void;
}) {
  const nom = teintes.find((t) => t.couleur === active)?.libelle ?? 'aucun';
  return (
    <fieldset className="m-0 border-0 p-0">
      <legend className="mb-2 text-[13px] font-semibold">
        {legende} · {nom}
      </legend>
      <div className="flex flex-wrap gap-2">
        {teintes.map((t) => (
          <button
            key={t.id}
            type="button"
            title={t.libelle}
            aria-label={t.libelle}
            aria-pressed={t.couleur === active}
            onClick={() => choisir(t)}
            className={`size-11 cursor-pointer rounded-[10px] border ${t.couleur === active ? 'border-2 border-blanc ring-[2.5px] ring-accent' : 'border-neutre-300'}`}
            style={{ background: t.couleur }}
          />
        ))}
      </div>
    </fieldset>
  );
}
