import type { FiltresAnnuaireUrl } from '@ph/core/schemas';
import { Button, classesChip } from '@ph/ui';
import Link from 'next/link';
import { routes } from '@/lib/routes';

const RACCOURCIS = [
  'Salle de bain',
  'Tableau électrique',
  'Peinture intérieure',
  'Pompe à chaleur',
  'Toiture',
];
const champ =
  'flex min-h-[52px] items-center gap-2.5 rounded-[10px] border border-neutre-400 bg-blanc px-3 focus-within:border-accent focus-within:outline-2 focus-within:outline-accent-300';

/**
 * Recherche de l'annuaire : formulaire GET sans JavaScript, les autres filtres sont conservés
 * (champs cachés). Les recherches fréquentes sont de simples liens.
 */
export function BarreRecherche({ f }: { f: FiltresAnnuaireUrl }) {
  const conserves = {
    metier: f.metier.join(','),
    rayon: f.rayon !== 20 ? String(f.rayon) : '',
    note: f.note ? String(f.note) : '',
    labels: f.labels.join(','),
    dispo: f.dispo !== 'tous' ? f.dispo : '',
    budget: f.budget !== 'tous' ? f.budget : '',
    tri: f.tri !== 'pertinence' ? f.tri : '',
  };
  return (
    <>
      <form
        action="/artisans"
        role="search"
        className="flex flex-wrap items-end gap-2.5 rounded-[14px] bg-blanc p-3 shadow-md"
      >
        <label className={`${champ} flex-[1_1_260px]`}>
          <span className="sr-only">Métier, entreprise ou prestation</span>
          <input
            type="search"
            name="q"
            defaultValue={f.q}
            enterKeyHint="search"
            placeholder="Métier, entreprise ou prestation — ex. « douche italienne »"
            className="min-h-11 min-w-0 flex-1 border-0 bg-transparent text-base outline-none"
          />
        </label>
        <label className={`${champ} flex-[1_1_180px]`}>
          <span className="sr-only">Ville ou code postal</span>
          <input
            type="text"
            name="ville"
            defaultValue={f.ville}
            autoComplete="address-level2"
            placeholder="Ville ou code postal"
            className="min-h-11 min-w-0 flex-1 border-0 bg-transparent text-base outline-none"
          />
        </label>
        {Object.entries(conserves).map(([nom, valeur]) =>
          valeur ? <input key={nom} type="hidden" name={nom} value={valeur} /> : null,
        )}
        <Button type="submit" taille="lg" className="min-h-[52px]">
          Rechercher
        </Button>
      </form>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-[13.5px] text-neutre-800">Recherches fréquentes :</span>
        {RACCOURCIS.map((r) => (
          <Link
            key={r}
            href={routes.annuaire(`?q=${encodeURIComponent(r)}`)}
            className={`${classesChip} text-[13.5px]`}
          >
            {r}
          </Link>
        ))}
      </div>
    </>
  );
}
