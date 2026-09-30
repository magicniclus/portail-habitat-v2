import {
  etatAbonnement,
  LIBELLES_STATUT_FACTURE,
  NOMS_OFFRE,
  SIEGES_INCLUS,
} from '@ph/core/facturation';
import { formatDate, formatEuros } from '@ph/core/format';
import type { AbonnementPro, FacturePro } from '@ph/firebase/facturation';
import { Badge, bouton, EmptyState } from '@ph/ui';
import Link from 'next/link';
import { routes } from '@/lib/routes';
import { GererAbonnement } from './GererAbonnement';

/** Offre en cours, ou invitation à passer à une offre payante. */
export function OffreActuelle({
  abonnements,
  gerer,
}: {
  abonnements: AbonnementPro[];
  gerer: boolean;
}) {
  if (!abonnements.length)
    return (
      <section aria-labelledby="offre" className="grid gap-3 rounded-card border border-trait p-5">
        <h2 id="offre" className="m-0 text-xl">
          Formule gratuite
        </h2>
        <p className="m-0 text-base text-neutre-800">
          Votre fiche est dans l&apos;annuaire. Passez à une offre payante pour être mis en avant et
          recevoir des demandes garanties.
        </p>
        {gerer ? (
          <div className="flex flex-wrap gap-2">
            <Link href={routes.proAbonnement('premium')} className={bouton()}>
              Passer Premium
            </Link>
            <Link
              href={routes.proAbonnement('visibilite')}
              className={bouton({ variant: 'secondaire' })}
            >
              Activer la Visibilité
            </Link>
          </div>
        ) : null}
      </section>
    );
  return (
    <section aria-labelledby="offre" className="grid gap-3 rounded-card border border-trait p-5">
      <h2 id="offre" className="m-0 text-xl">
        Votre abonnement
      </h2>
      <ul className="m-0 grid list-none gap-3 p-0">
        {abonnements.map((a) => {
          const e = etatAbonnement(a);
          return (
            <li key={a.id} className="grid gap-1">
              <span className="flex flex-wrap items-center gap-2 font-semibold">
                {NOMS_OFFRE[a.produit]} · {a.periode === 'annuel' ? 'annuel' : 'mensuel'}
                <Badge tone={e.ton}>{e.texte}</Badge>
              </span>
              {a.produit === 'premium' ? (
                <span className="text-sm text-neutre-700">
                  {SIEGES_INCLUS.premium + a.sieges} sièges pour votre équipe
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
      {gerer ? <GererAbonnement /> : null}
    </section>
  );
}

export function ListeFactures({ factures }: { factures: FacturePro[] }) {
  return (
    <section aria-labelledby="factures" className="grid gap-3">
      <h2 id="factures" className="m-0 text-xl">
        Factures
      </h2>
      {factures.length === 0 ? (
        <EmptyState titre="Aucune facture pour le moment" />
      ) : (
        <ul className="m-0 grid list-none rounded-card border border-trait p-0">
          {factures.map((f) => (
            <li
              key={f.id}
              className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-trait px-4 py-3 first:border-t-0"
            >
              <span className="flex flex-[1_1_200px] flex-col">
                <span className="font-semibold">{f.numero}</span>
                <span className="text-sm text-neutre-700">{formatDate(f.date, 'long')}</span>
              </span>
              <span className="font-semibold">
                {formatEuros(f.montantTtcCentimes, { decimales: 'toujours', suffixe: 'TTC' })}
              </span>
              <Badge tone={f.statut === 'paid' ? 'succes' : 'attention'}>
                {LIBELLES_STATUT_FACTURE[f.statut] ?? f.statut}
              </Badge>
              {f.lien ? (
                <a
                  href={f.lien}
                  className={bouton({ variant: 'secondaire', taille: 'sm' })}
                  rel="noopener noreferrer"
                  target="_blank"
                  aria-label={`Télécharger la facture ${f.numero}`}
                >
                  Télécharger
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
