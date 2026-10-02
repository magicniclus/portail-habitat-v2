import { bouton } from '@ph/ui';
import Link from 'next/link';
import { routes } from '@/lib/routes';

/** PRO-07 : hors Premium, présentation de l'offre à la place des statistiques. */
export function OffreStatistiques({ peutSouscrire }: { peutSouscrire: boolean }) {
  return (
    <section
      aria-labelledby="offre-stats"
      className="grid max-w-[640px] gap-4 rounded-2xl border border-accent-300 bg-accent-100 p-6"
    >
      <h2 id="offre-stats" className="m-0 text-2xl">
        Les statistiques sont réservées à Premium
      </h2>
      <p className="m-0 text-base text-neutre-800">
        Suivez qui consulte votre fiche, combien de visiteurs vous appellent ou demandent un devis,
        et l&apos;évolution de vos vues semaine après semaine.
      </p>
      {peutSouscrire ? (
        <Link href={routes.proAbonnementPremium} className={bouton()}>
          Découvrir Premium
        </Link>
      ) : (
        <p className="m-0 text-sm text-neutre-800">
          Le propriétaire ou le gérant de l&apos;entreprise peut activer Premium.
        </p>
      )}
    </section>
  );
}
