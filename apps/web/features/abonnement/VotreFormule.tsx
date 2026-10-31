import { etatAbonnement } from '@ph/core/facturation';
import { NOMS_FORMULE, siegesInclus, type Formule } from '@ph/core/paiements';
import type { AbonnementPro } from '@ph/firebase/facturation';
import { Badge } from '@ph/ui';
import { CheckCircleIcon } from '@phosphor-icons/react/ssr';
import Link from 'next/link';
import { routes } from '@/lib/routes';
import { GererAbonnement } from '@/features/facturation/GererAbonnement';
import { BandeauOffre } from '@/features/offres/BandeauOffre';

const POINTS_GRATUIT = [
  'Fiche artisan dans votre zone',
  'Demandes reçues depuis votre fiche',
  'Avis clients, devis et factures',
  'Site sur portailtravaux.fr',
];

/**
 * « Votre formule » (maquette Mon Abonnement) : la formule de l'artisan seulement, jamais un
 * catalogue (PAIEMENTS §4). Les autres offres apparaissent dans les outils, quand elles servent.
 */
export function VotreFormule({
  formule,
  abonnement,
  gerer,
}: {
  formule: Formule;
  abonnement: AbonnementPro | undefined;
  gerer: boolean;
}) {
  const payante = formule !== 'gratuit';
  const etat = abonnement ? etatAbonnement(abonnement) : null;
  const points = POINTS_GRATUIT;
  return (
    <section
      aria-labelledby="formule"
      className="grid gap-4 rounded-[18px] border border-accent-200 bg-blanc p-5 shadow-[0_14px_36px_-24px_var(--accent)] sm:p-6"
    >
      <h2 id="formule" className="m-0 text-xl">
        Votre formule
      </h2>
      {payante ? (
        <BandeauOffre formule={formule} />
      ) : (
        <>
          <p className="m-0 flex flex-wrap items-baseline justify-between gap-2">
            <strong className="text-2xl">{NOMS_FORMULE[formule]}</strong>
            <span className="font-semibold text-neutre-800">0 €</span>
          </p>
          <ul className="m-0 grid list-none gap-1.5 p-0 text-[15px]">
            {points.map((p) => (
              <li key={p} className="flex items-start gap-2">
                <CheckCircleIcon
                  size={20}
                  weight="fill"
                  aria-hidden="true"
                  className="flex-none text-accent"
                />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      {formule === 'tout_inclus' && abonnement ? (
        <p className="m-0 text-sm text-neutre-700">
          {siegesInclus(formule) + abonnement.sieges} sièges pour votre équipe
        </p>
      ) : null}
      {etat ? (
        <p className="m-0">
          <Badge tone={etat.ton}>{etat.texte}</Badge>
        </p>
      ) : (
        <p className="m-0 text-sm text-neutre-700">
          Aucun paiement. Les options apparaissent dans vos outils quand elles vous sont utiles.
        </p>
      )}
      {gerer && abonnement ? (
        <div className="flex flex-wrap items-start gap-3">
          <GererAbonnement />
          {abonnement.statut === 'active' && !abonnement.annulationFinPeriode ? (
            <Link href={routes.proResiliation} className="flex min-h-11 items-center text-sm">
              Résilier mon abonnement
            </Link>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
