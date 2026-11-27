import { LIBELLES_STATUT_DEMANDE_ADMIN, libelleExclusion } from '@ph/core/admin';
import { formatDate, formatFourchette } from '@ph/core/format';
import type { FicheDemandeAdmin as Fiche } from '@ph/firebase/admin-serveur';
import { Badge } from '@ph/ui';
import { DonneePersonnelle } from '@/features/admin/DonneePersonnelle';
import type { SessionAdmin } from '@/server/sessionAdmin';
import { ActionsDemande } from './ActionsDemande';

/** Détail d'une demande avec la trace de l'algorithme (`matching/{id}`, ADMIN §2.4). */
export function FicheDemandeAdmin({ d, session: s }: { d: Fiche; session: SessionAdmin }) {
  const p = (x: string) => s.permissions.includes(x);
  return (
    <section
      aria-label={`Demande ${d.reference}`}
      className="grid content-start gap-4 rounded-[16px] border border-trait bg-blanc p-5"
    >
      <header className="grid gap-1">
        <h2 className="m-0 text-[22px]">{d.reference}</h2>
        <p className="m-0 text-sm text-neutre-700">
          {d.prestationId} · {d.ville} · {formatFourchette(d.budget.min, d.budget.max)} ·{' '}
          {formatDate(d.creeLe)} · {LIBELLES_STATUT_DEMANDE_ADMIN[d.statut] ?? d.statut}
          {d.niveau ? ` · niveau ${d.niveau}` : ''}
        </p>
        <p className="m-0 flex flex-wrap items-center gap-2 text-sm">
          Particulier {d.particulier} ·{' '}
          <DonneePersonnelle
            masque={d.emailMasque}
            cible={`demandes/${d.id}`}
            champ="contact.email"
            peutAfficher={s.pii}
          />
          ·{' '}
          <DonneePersonnelle
            masque={d.telephoneMasque}
            cible={`demandes/${d.id}`}
            champ="contact.telephone"
            peutAfficher={s.pii}
          />
        </p>
      </header>
      {s.role !== 'lecture' ? (
        <ActionsDemande
          demandeId={d.id}
          reference={d.reference}
          droits={{
            reattribuer: p('demandes.reattribuer'),
            forcer: p('matching.forcer'),
            annuler: p('demandes.annuler'),
          }}
        />
      ) : null}
      <div className="grid gap-2">
        <h3 className="m-0 text-base">
          Trace de l’algorithme {d.resultat ? `· ${d.resultat}` : '· pas encore calculée'}
        </h3>
        <ul aria-label="Candidats" className="m-0 grid list-none gap-2 p-0">
          {d.candidats.map((c) => (
            <li
              key={c.artisanId}
              className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-trait px-3 py-2 text-sm"
            >
              <span>
                <strong>{c.nom}</strong>
                {c.distance !== null ? ` · ${Math.round(c.distance)} km` : ''}
              </span>
              <span className="flex items-center gap-2">
                {c.exclu ? null : <span>score {Math.round(c.score)}</span>}
                <Badge tone={c.retenu ? 'succes' : c.exclu ? 'danger' : 'neutre'}>
                  {c.retenu
                    ? 'Retenu'
                    : c.exclu
                      ? `Exclu : ${libelleExclusion(c.exclu)}`
                      : 'Écarté'}
                </Badge>
              </span>
            </li>
          ))}
        </ul>
      </div>
      {d.attributions.length ? (
        <div className="grid gap-2">
          <h3 className="m-0 text-base">Artisans sollicités</h3>
          <ul className="m-0 grid list-none gap-1 p-0 text-sm">
            {d.attributions.map((a) => (
              <li key={a.artisanId}>
                {a.nom} · {a.statut}
                {a.exclusive ? ' · exclusive' : ''}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
