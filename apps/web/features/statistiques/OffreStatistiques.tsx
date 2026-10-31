import { EncartPremium } from '@/features/offres/EncartPremium';

/** PRO-07 : sans Fiche Pro, présentation de l'offre à la place du détail (PAIEMENTS §4). */
export function OffreStatistiques({ peutSouscrire }: { peutSouscrire: boolean }) {
  return peutSouscrire ? (
    <EncartPremium
      formule="fiche_pro"
      titre="Les statistiques détaillées sont incluses dans Fiche Pro"
      cta="Voir l'offre Fiche Pro"
      raison="Les statistiques détaillées sont incluses dans Fiche Pro."
      icone="statistiques"
      className="max-w-[720px]"
    >
      Suivez qui consulte votre fiche, combien de visiteurs vous appellent ou demandent un devis, et
      l&apos;évolution de vos vues semaine après semaine.
    </EncartPremium>
  ) : (
    <section
      aria-labelledby="offre-stats"
      className="grid max-w-[640px] gap-2 rounded-2xl border border-trait p-6"
    >
      <h2 id="offre-stats" className="m-0 text-2xl">
        Les statistiques détaillées sont incluses dans Fiche Pro
      </h2>
      <p className="m-0 text-sm text-neutre-800">
        Le propriétaire ou le gérant de l&apos;entreprise peut activer Fiche Pro.
      </p>
    </section>
  );
}
