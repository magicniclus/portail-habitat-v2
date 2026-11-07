import type { tableauDeBordPro } from '@ph/firebase/comptes';
import { formatNombre } from '@ph/core/format';
import { bouton } from '@ph/ui';
import { CheckCircleIcon, CircleIcon } from '@phosphor-icons/react/ssr';
import type { Route } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { routes } from '@/lib/routes';

type Donnees = Awaited<ReturnType<typeof tableauDeBordPro>>;

const cadre = 'grid gap-3.5 rounded-2xl border border-trait bg-blanc p-5';

/** Liste cochée (étapes de mise en ligne, complétude) : fait → coche orange, sinon cercle. */
function ListeCochee({
  items,
}: {
  items: readonly { cle: string; libelle: ReactNode; fait: boolean }[];
}) {
  return (
    <ul className="m-0 grid list-none gap-2.5 p-0 text-sm leading-[21px]">
      {items.map((i) => (
        <li key={i.cle} className={`flex items-center gap-2.5 ${i.fait ? '' : 'text-neutre-800'}`}>
          {i.fait ? (
            <CheckCircleIcon
              size={20}
              weight="fill"
              className="flex-none text-accent"
              aria-hidden="true"
            />
          ) : (
            <CircleIcon size={20} className="flex-none text-neutre-500" aria-hidden="true" />
          )}
          <span>
            {i.libelle}
            <span className="sr-only">{i.fait ? ' : fait' : ' : à faire'}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

const LIENS_ETAPES: Record<string, Route> = {
  telephone: `${routes.proCompte}#telephone` as Route,
  decennale: `${routes.proFiche}#documents` as Route,
  fiche: routes.proFiche,
};

/** ONB-06 : fiche hors ligne → « 3 étapes pour être en ligne » (email `bienvenue-pro`). */
export function EtapesEnLigne({ m }: { m: Donnees['miseEnLigne'] }) {
  return (
    <section
      aria-labelledby="titre-en-ligne"
      className={`${cadre} border-accent-300 bg-accent-100`}
    >
      <div>
        <h2 id="titre-en-ligne" className="m-0 text-xl">
          3 étapes pour être en ligne
        </h2>
        <p className="m-0 mt-1 text-sm text-neutre-800">
          Votre fiche est hors ligne : les particuliers ne la voient pas encore.{' '}
          {m.restantes ? `Plus que ${m.restantes} étape${m.restantes > 1 ? 's' : ''}.` : ''}
        </p>
      </div>
      <ListeCochee
        items={m.etapes.map((e) => ({
          ...e,
          libelle: e.fait ? (
            e.libelle
          ) : (
            <Link href={LIENS_ETAPES[e.cle]!} className="font-semibold">
              {e.libelle}
            </Link>
          ),
        }))}
      />
    </section>
  );
}

export function Indicateurs({ i, completude }: { i: Donnees['indicateurs']; completude: number }) {
  const cartes = [
    {
      cle: 'demandes',
      libelle: 'Demandes ce mois',
      valeur: formatNombre(i.demandesMois),
      note: '',
    },
    {
      cle: 'note',
      libelle: 'Note moyenne',
      valeur: i.nbAvis ? `${formatNombre(i.noteMoyenne, 1)}/5` : '–',
      note: `${formatNombre(i.nbAvis)} avis`,
    },
    {
      cle: 'reponse',
      libelle: 'Taux de réponse',
      valeur: i.tauxReponse === undefined ? '–' : `${formatNombre(i.tauxReponse * 100)} %`,
      note: 'demandes auxquelles vous avez répondu',
    },
    { cle: 'fiche', libelle: 'Fiche complétée', valeur: `${completude} %`, note: '' },
  ];
  return (
    <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 md:grid-cols-4 md:gap-4">
      {cartes.map((c) => (
        <li key={c.cle} className="grid content-start gap-2 rounded-[14px] border border-trait p-4">
          <span className="text-sm font-semibold text-neutre-800">{c.libelle}</span>
          <span className="text-[30px] leading-none font-bold">{c.valeur}</span>
          {c.note ? <span className="text-[13px] text-neutre-800">{c.note}</span> : null}
        </li>
      ))}
    </ul>
  );
}

export function CarteCompletude({ c }: { c: Donnees['completude'] }) {
  return (
    <section aria-labelledby="titre-completude" className={cadre}>
      <h2 id="titre-completude" className="m-0 text-xl">
        Complétez votre fiche
      </h2>
      <div>
        <div
          role="progressbar"
          aria-label="Fiche complétée"
          aria-valuenow={c.pourcent}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-2 overflow-hidden rounded-pill bg-neutre-300"
        >
          <span className="block h-full bg-accent" style={{ width: `${c.pourcent}%` }} />
        </div>
        <p className="m-0 mt-2 text-[13px] text-neutre-800">
          <strong>{c.pourcent} % complétée</strong> — une fiche complète inspire davantage
          confiance.
        </p>
      </div>
      <ListeCochee items={c.criteres} />
      <Link href={routes.proFiche} className={bouton({ variant: 'secondaire' })}>
        Compléter ma fiche
      </Link>
    </section>
  );
}
