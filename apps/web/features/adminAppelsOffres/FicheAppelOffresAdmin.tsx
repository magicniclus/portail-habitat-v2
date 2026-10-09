import {
  LIBELLES_ACCES_APPEL_OFFRES,
  LIBELLES_DETAIL_CALCUL,
  LIBELLES_MODE_PRIX,
  LIBELLES_STATUT_APPEL_OFFRES,
  PLAFOND_PRIX_COMMERCIAL,
} from '@ph/core/admin';
import { formatDate, formatEuros, formatRelatif } from '@ph/core/format';
import type { FicheAppelOffresAdmin as Fiche } from '@ph/firebase/admin-serveur';
import { Ligne } from '@/features/adminArtisans/OngletsFiche';
import type { SessionAdmin } from '@/server/sessionAdmin';
import { EditeurPrix } from './EditeurPrix';

const ht = (c: number) => formatEuros(c, { suffixe: 'HT' });

/** Détail d'un appel d'offres : prix courant, calcul automatique, historique, éditeur (ADMIN §2.5). */
export function FicheAppelOffresAdmin({
  a,
  session: s,
  maintenant,
}: {
  a: Fiche;
  session: SessionAdmin;
  maintenant: number;
}) {
  const p = (x: string) => s.permissions.includes(x);
  const modifiable = ['brouillon', 'ouvert', 'complet', 'suspendu'].includes(a.statut);
  return (
    <section
      aria-label={a.titre}
      className="grid content-start gap-4 rounded-[16px] border border-trait bg-blanc p-5"
    >
      <header className="grid gap-1">
        <h2 className="m-0 text-[22px]">{a.titre}</h2>
        <p className="m-0 text-sm text-neutre-700">
          {LIBELLES_STATUT_APPEL_OFFRES[a.statut] ?? a.statut} · ouvert{' '}
          {formatRelatif(a.ouvertLe, maintenant)} · clôture le {formatDate(a.ouvertJusquau)}
        </p>
      </header>
      {modifiable && s.role !== 'lecture' ? (
        <EditeurPrix
          id={a.id}
          titre={a.titre}
          actuel={{
            mode: a.mode,
            prixEuros: Math.round(a.prixBaseCentimes / 100),
            prixPremiumEuros: Math.round(a.prixPremiumCentimes / 100),
            credits: a.prixCredits,
            nbDeblocagesMax: a.nbDeblocagesMax,
            acces: a.acces,
            plafondEuros: Math.min(a.plafond, PLAFOND_PRIX_COMMERCIAL) / 100,
          }}
          droits={{
            prix: p('leads.prix'),
            illimite: p('leads.prix_illimite'),
            publier: p('leads.publier'),
          }}
        />
      ) : null}
      <dl className="m-0">
        <Ligne k="Mode">{LIBELLES_MODE_PRIX[a.mode]}</Ligne>
        <Ligne k="Prix">
          {ht(a.prixBaseCentimes)} · Premium {ht(a.prixPremiumCentimes)} · {a.prixCredits} crédits
          {a.promo && a.promoJusquau
            ? ` · promo −${a.promo} % jusqu’au ${formatDate(a.promoJusquau)}`
            : ''}
        </Ligne>
        <Ligne k="Bornes">
          {ht(a.plancher)} à {ht(a.plafond)}
        </Ligne>
        <Ligne k="Déblocages">
          {a.nbDeblocages} sur {a.nbDeblocagesMax} · {LIBELLES_ACCES_APPEL_OFFRES[a.acces]}
        </Ligne>
        <Ligne k="Qualité">{a.qualiteLead} / 100</Ligne>
        {a.detailCalcul ? (
          <Ligne k="Calcul automatique">
            {ht(a.detailCalcul.base)}
            {Object.entries(LIBELLES_DETAIL_CALCUL).map(([k, l]) => {
              const c = a.detailCalcul![k as keyof typeof LIBELLES_DETAIL_CALCUL];
              return c === 1 ? null : ` × ${c} (${l.toLowerCase()})`;
            })}
          </Ligne>
        ) : null}
      </dl>
      <div className="grid gap-2">
        <h3 className="m-0 text-base">Historique des prix</h3>
        {a.historique.length ? (
          <ul aria-label="Historique des prix" className="m-0 grid list-none gap-1 p-0 text-sm">
            {a.historique.map((h) => (
              <li key={`${h.le}-${h.prixHtCentimes}`}>
                {formatDate(h.le)} · {LIBELLES_MODE_PRIX[h.mode as keyof typeof LIBELLES_MODE_PRIX]}{' '}
                · {ht(h.prixHtCentimes)}
                {h.motif ? ` · ${h.motif}` : ''}
              </li>
            ))}
          </ul>
        ) : (
          <p className="m-0 text-sm text-neutre-700">
            Prix calculé automatiquement, jamais modifié.
          </p>
        )}
      </div>
    </section>
  );
}
