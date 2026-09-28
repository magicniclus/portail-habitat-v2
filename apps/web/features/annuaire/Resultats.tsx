import {
  chipsFiltres,
  ecrireFiltresAnnuaire,
  LIBELLES_TRIS,
  sansFiltres,
  TRIS,
} from '@ph/core/annuaire';
import type { FiltresAnnuaireUrl } from '@ph/core/schemas';
import type { ResultatsAnnuaire } from '@ph/firebase/annuaire';
import { bouton } from '@ph/ui';
import Link from 'next/link';
import { routes } from '@/lib/routes';
import { CarteArtisan } from './CarteArtisan';
import { SelectTri } from './SelectTri';

/** Mention obligatoire (art. L111-7 du Code de la consommation), toujours visible (ANN-03). */
const MENTION_L111_7 =
  'Les profils Premium apparaissent en tête de liste, signalés comme tels. Le classement des autres résultats dépend du tri choisi, de la distance et des avis vérifiés. Aucune position n’est vendue dans la liste standard.';

/** Colonne des résultats : nombre, tri, chips retirables (ANN-02), à la une, liste, état vide (ANN-05). */
export function Resultats({
  f,
  r,
  nomMetier,
}: {
  f: FiltresAnnuaireUrl;
  r: ResultatsAnnuaire;
  nomMetier: (id: string) => string;
}) {
  const total = r.premium.length + r.standards.length;
  const chips = chipsFiltres(f, nomMetier);
  const sansTri = ecrireFiltresAnnuaire({ ...f, tri: 'pertinence' }).slice(1);
  return (
    <div id="resultats" className="min-w-0 scroll-mt-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="m-0 text-[15px]" aria-live="polite">
          <strong>{total}</strong>{' '}
          <span className="text-neutre-800">
            artisan{total > 1 ? 's' : ''} correspond{total > 1 ? 'ent' : ''} à votre recherche
          </span>
        </p>
        <SelectTri
          valeur={f.tri}
          base={sansTri}
          options={TRIS.map((v) => ({ v, libelle: LIBELLES_TRIS[v] }))}
        />
      </div>

      {chips.length ? (
        <ul aria-label="Filtres actifs" className="m-0 mb-4 flex list-none flex-wrap gap-2 p-0">
          {chips.map((c) => (
            <li key={c.cle}>
              <Link
                href={routes.annuaire(ecrireFiltresAnnuaire(c.sans))}
                scroll={false}
                className="inline-flex min-h-11 items-center gap-2 rounded-pill border border-accent-300 bg-accent-100 px-3.5 text-[13.5px] font-semibold text-accent-800 no-underline"
              >
                {c.libelle}
                <span aria-hidden="true" className="text-[15px]">
                  ×
                </span>
                <span className="sr-only"> : retirer ce filtre</span>
              </Link>
            </li>
          ))}
          <li>
            <Link
              href={routes.annuaire(ecrireFiltresAnnuaire(sansFiltres(f)))}
              scroll={false}
              className="inline-flex min-h-11 items-center px-2 text-[13.5px] font-semibold text-accent-700"
            >
              Tout effacer
            </Link>
          </li>
        </ul>
      ) : null}

      {r.premium.length ? (
        <section aria-labelledby="titre-une" className="mb-5.5">
          <h2 id="titre-une" className="m-0 mb-3 flex flex-wrap items-center gap-x-2 text-[15px]">
            <span aria-hidden="true" className="text-premium">
              ★
            </span>{' '}
            Artisans à la une
            <span className="text-[13px] font-normal text-neutre-700">
              — profils Premium, vérifiés et engagés à répondre sous 24 h
            </span>
          </h2>
          <div className="grid gap-3.5">
            {r.premium.map((a) => (
              <CarteArtisan key={a.id} a={a} nomMetier={nomMetier(a.metierPrincipal)} />
            ))}
          </div>
        </section>
      ) : null}

      <div className="grid gap-3">
        {r.standards.map((a) => (
          <CarteArtisan key={a.id} a={a} nomMetier={nomMetier(a.metierPrincipal)} />
        ))}
      </div>

      {total === 0 ? (
        <div className="rounded-[14px] border border-dashed border-neutre-400 p-7.5 text-center">
          <p className="m-0 mb-2 text-[17px] font-bold">
            Aucun artisan ne correspond à ces critères
          </p>
          <p className="m-0 mb-4 text-[15px] leading-[23px] text-neutre-800">
            Élargissez le rayon ou retirez un filtre — ou laissez les artisans venir à vous.
          </p>
          <div className="flex flex-wrap justify-center gap-2.5">
            <Link
              href={routes.annuaire(ecrireFiltresAnnuaire(sansFiltres(f)))}
              className={bouton({ variant: 'secondaire' })}
            >
              Effacer les filtres
            </Link>
            <Link href={routes.simulateur} prefetch={false} className={bouton()}>
              Déposer mon projet
            </Link>
          </div>
        </div>
      ) : null}

      <p className="m-0 mt-5.5 text-[13px] leading-5 text-neutre-700">{MENTION_L111_7}</p>
    </div>
  );
}
