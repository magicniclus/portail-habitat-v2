import { GererAbonnement } from '@/features/facturation/GererAbonnement';

/** Carte enregistrée chez Stripe (jamais saisie ici) ; modification dans le portail client. */
export function MoyenPaiement({
  carte,
  email,
  gerer,
}: {
  carte: { last4: string; marque: string } | null;
  email: string | null;
  gerer: boolean;
}) {
  return (
    <section aria-labelledby="paiement" className="grid gap-3 rounded-card border border-trait p-5">
      <h2 id="paiement" className="m-0 text-xl">
        Moyen de paiement
      </h2>
      {carte ? (
        <p className="m-0 text-[15px]">
          <span className="font-semibold uppercase">{carte.marque}</span> •••• {carte.last4}
        </p>
      ) : (
        <p className="m-0 text-[15px] text-neutre-800">
          Aucune carte enregistrée. Elle le sera au premier paiement, sur la page sécurisée de
          Stripe.
        </p>
      )}
      {email ? <p className="m-0 text-sm text-neutre-700">Factures envoyées à {email}</p> : null}
      {gerer ? <GererAbonnement /> : null}
    </section>
  );
}
