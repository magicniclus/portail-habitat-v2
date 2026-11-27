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

const LIEN_DOCUMENTS = `${routes.proFiche}#documents` as Route;

/**
 * État de la fiche sous l'accueil et en haut du tableau de bord : en ligne (ou en vérification) et
 * « Assurance non vérifiée » tant que la décennale n'est pas validée, avec le lien pour l'envoyer.
 */
export function EtatFiche({
  enLigne,
  assurance,
}: {
  enLigne: boolean;
  assurance: Donnees['assurance'];
}) {
  const items = [
    {
      cle: 'en-ligne',
      fait: enLigne,
      libelle: enLigne ? (
        'Votre fiche est en ligne : les particuliers de votre zone peuvent vous écrire.'
      ) : (
        <Link href={routes.proFiche} className="font-semibold">
          Votre fiche est hors ligne
        </Link>
      ),
    },
    {
      cle: 'assurance',
      fait: assurance === 'verifiee',
      libelle:
        assurance === 'verifiee' ? (
          'Assurance vérifiée'
        ) : assurance === 'en_verification' ? (
          'Assurance non vérifiée : votre attestation est en cours de vérification.'
        ) : (
          <>
            Assurance non vérifiée ·{' '}
            <Link href={LIEN_DOCUMENTS} className="font-semibold">
              {assurance === 'a_renvoyer'
                ? 'Renvoyer mon attestation'
                : 'Envoyer mon attestation d’assurance'}
            </Link>
          </>
        ),
    },
  ];
  return (
    <section aria-label="État de votre fiche" className={cadre}>
      <ListeCochee items={items} />
    </section>
  );
}

/**
 * Espace tout neuf (ni présentation, ni demande, ni avis) : un accueil et un seul bouton, à la
 * place des indicateurs et graphiques à zéro (décision du 15/11/2026).
 */
export function AccueilNeuf({ prenom, action }: { prenom: string; action: ReactNode }) {
  return (
    <section
      aria-labelledby="titre-accueil"
      className="grid justify-items-start gap-4 rounded-2xl border border-accent-300 bg-accent-100 p-[clamp(20px,4vw,36px)]"
    >
      <h1
        id="titre-accueil"
        className="m-0 text-[clamp(26px,3.4vw,38px)] leading-[1.1] tracking-[-0.01em]"
      >
        Bienvenue{prenom ? ` ${prenom}` : ''}, votre espace est prêt
      </h1>
      <p className="m-0 max-w-[56ch] text-[17px] leading-[27px] text-neutre-800">
        Présentez votre entreprise en deux minutes : l’IA rédige votre accroche et votre
        présentation à partir de vos métiers et de votre ville. Vous relisez, vous enregistrez.
      </p>
      {action}
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
