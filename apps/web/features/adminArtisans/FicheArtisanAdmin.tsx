import { LIBELLES_PLAN, LIBELLES_STATUT_ARTISAN_ADMIN } from '@ph/core/admin';
import { formatDate } from '@ph/core/format';
import type { FicheArtisanAdmin as Fiche } from '@ph/firebase/admin-serveur';
import type { Route } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { DonneePersonnelle } from '@/features/admin/DonneePersonnelle';
import type { SessionAdmin } from '@/server/sessionAdmin';
import { ActionsArtisan } from './ActionsArtisan';

const ONGLETS = [
  ['identite', 'Identité'],
  ['abonnement', 'Abonnement'],
  ['activite', 'Activité'],
  ['sanctions', 'Sanctions'],
  ['notes', 'Notes'],
] as const;

function Ligne({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-trait py-2.5 sm:grid-cols-[180px_minmax(0,1fr)]">
      <dt className="text-sm text-neutre-700">{k}</dt>
      <dd className="m-0 text-base">{children}</dd>
    </div>
  );
}

function Onglet({ f, onglet }: { f: Fiche; onglet: string }) {
  if (onglet === 'abonnement')
    return (
      <>
        <Ligne k="Formule">{LIBELLES_PLAN[f.plan as keyof typeof LIBELLES_PLAN] ?? f.plan}</Ligne>
        <Ligne k="Crédits">{f.credits}</Ligne>
      </>
    );
  if (onglet === 'activite')
    return (
      <>
        <Ligne k="Taux de réponse">
          {f.tauxReponse !== null ? `${Math.round(f.tauxReponse * 100)} %` : '—'}
        </Ligne>
        <Ligne k="Temps de réponse">
          {f.tempsReponseMin !== null ? `${f.tempsReponseMin} min` : '—'}
        </Ligne>
        <Ligne k="Note">{f.note !== null ? `${f.note.toFixed(1)} ★` : 'Aucun avis'}</Ligne>
      </>
    );
  if (onglet === 'sanctions')
    return f.sanctions.length ? (
      f.sanctions.map((x) => (
        <Ligne key={x.le} k={formatDate(x.le)}>
          {x.type}
          {x.levee ? ' (levée)' : ''} · {x.motif}
        </Ligne>
      ))
    ) : (
      <Ligne k="Historique">Aucune sanction</Ligne>
    );
  if (onglet === 'notes')
    return f.notes.length ? (
      f.notes.map((n) => (
        <Ligne key={n.le} k={formatDate(n.le)}>
          {n.texte}
        </Ligne>
      ))
    ) : (
      <Ligne k="Notes">Aucune note</Ligne>
    );
  return null;
}

/** Fiche 360° (ADMIN §2.3) : données personnelles masquées, actions selon les permissions. */
export function FicheArtisanAdmin({
  fiche: f,
  session: s,
  onglet,
}: {
  fiche: Fiche;
  session: SessionAdmin;
  onglet: string;
}) {
  const p = (x: string) => s.permissions.includes(x);
  const lien = (o: string) => `/admin/artisans?id=${f.id}&onglet=${o}` as Route;
  const cible = `artisans/${f.id}`;
  return (
    <section
      aria-label={`Fiche de ${f.nom}`}
      className="grid content-start gap-4 rounded-[16px] border border-trait bg-blanc p-5"
    >
      <header className="grid gap-1">
        <h2 className="m-0 text-[22px]">{f.nom}</h2>
        <p className="m-0 text-sm text-neutre-700">
          SIREN {f.siren} · {f.metier} · {f.ville} · {LIBELLES_STATUT_ARTISAN_ADMIN[f.statut]}
        </p>
      </header>
      {s.role !== 'lecture' ? (
        <ActionsArtisan
          artisanId={f.id}
          nom={f.nom}
          suspendu={f.statut === 'suspendu'}
          aVerifier={f.statut === 'a_verifier'}
          proprietaireUid={f.proprietaireUid}
          droits={{
            verifier: p('artisans.verifier'),
            suspendre: p('artisans.suspendre'),
            crediter: p('credits.crediter'),
            illimite: p('credits.crediter_illimite'),
            voir: s.role === 'superadmin',
          }}
        />
      ) : null}
      <nav aria-label="Onglets de la fiche" className="flex flex-wrap gap-1 border-b border-trait">
        {ONGLETS.map(([id, nom]) => (
          <Link
            key={id}
            href={lien(id)}
            aria-current={id === onglet ? 'page' : undefined}
            className="flex min-h-11 items-center border-b-2 border-transparent px-3 text-sm text-neutre-700 no-underline aria-[current=page]:border-accent-600 aria-[current=page]:font-bold aria-[current=page]:text-texte"
          >
            {nom}
          </Link>
        ))}
      </nav>
      <dl className="m-0">
        {onglet === 'identite' ? (
          <>
            <Ligne k="Email">
              {f.emailMasque ? (
                <DonneePersonnelle
                  masque={f.emailMasque}
                  cible={cible}
                  champ="emailContact"
                  peutAfficher={s.pii}
                />
              ) : (
                '—'
              )}
            </Ligne>
            <Ligne k="Téléphone">
              {f.telephoneMasque ? (
                <DonneePersonnelle
                  masque={f.telephoneMasque}
                  cible={cible}
                  champ="telephonePublic"
                  peutAfficher={s.pii}
                />
              ) : (
                '—'
              )}
            </Ligne>
            <Ligne k="Zone">{f.zone}</Ligne>
            <Ligne k="Vérification">{f.verification}</Ligne>
            <Ligne k="Décennale">
              {f.decennale ? `jusqu’au ${formatDate(f.decennale)}` : 'Non renseignée'}
            </Ligne>
          </>
        ) : (
          <Onglet f={f} onglet={onglet} />
        )}
      </dl>
    </section>
  );
}
