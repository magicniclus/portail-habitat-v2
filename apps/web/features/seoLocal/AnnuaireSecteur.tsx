import type { FiltresAnnuaireUrl } from '@ph/core/schemas';
import type { ArtisanAnnuaire, ResultatsAnnuaire } from '@ph/firebase/annuaire';
import { Filtres, type OptionsFiltres } from '@/features/annuaire/Filtres';
import { PanneauFiltres } from '@/features/annuaire/PanneauFiltres';
import { Resultats } from '@/features/annuaire/Resultats';

/**
 * L'annuaire complet dans une page de secteur : mêmes filtres, tri et résultats que /artisans,
 * réglés sur le métier et la commune. Changer un filtre ouvre l'annuaire avec ces réglages (pages
 * filtrées non indexées) ; la page de secteur reste en cache, rapide et propre pour Google.
 */
export function AnnuaireSecteur(p: {
  f: FiltresAnnuaireUrl;
  r: ResultatsAnnuaire;
  proches: ArtisanAnnuaire[];
  options: OptionsFiltres;
  nbActifs: number;
  lieu: string;
  nomMetier: (id: string) => string;
  titre: string;
}) {
  return (
    <section aria-labelledby="titre-artisans" className="grid gap-4">
      <h2 id="titre-artisans" className="m-0 text-[clamp(20px,2.4vw,26px)]">
        {p.titre}
      </h2>
      <div className="lg:hidden">
        <PanneauFiltres valeurs={p.f} options={p.options} nbActifs={p.nbActifs} />
      </div>
      <div className="grid items-start gap-x-[clamp(22px,3vw,38px)] gap-y-6 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
        <aside
          data-ph-section="filtres"
          className="sticky top-4.5 hidden max-h-[calc(100vh-36px)] min-h-0 flex-col lg:flex"
        >
          <div className="flex min-h-0 flex-col overflow-hidden rounded-[14px] border border-trait bg-blanc p-4.5">
            <p className="m-0 mb-4 flex-none text-base font-bold">Filtres</p>
            <div className="min-h-0 overflow-y-auto pr-1.5">
              <Filtres valeurs={p.f} options={p.options} id="secteur" />
            </div>
          </div>
        </aside>
        <Resultats f={p.f} r={p.r} proches={p.proches} lieu={p.lieu} nomMetier={p.nomMetier} />
      </div>
    </section>
  );
}
