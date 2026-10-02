import { LIBELLES_STATUT_ARTISAN_ADMIN } from '@ph/core/admin';
import { formatDate } from '@ph/core/format';
import type { FicheArtisanAdmin as Fiche } from '@ph/firebase/admin-serveur';
import type { Route } from 'next';
import Link from 'next/link';
import { DonneePersonnelle } from '@/features/admin/DonneePersonnelle';
import type { SessionAdmin } from '@/server/sessionAdmin';
import { ActionsArtisan } from './ActionsArtisan';
import { Ligne, OngletFiche } from './OngletsFiche';

const ONGLETS = [
  ['identite', 'Identité'],
  ['documents', 'Documents'],
  ['abonnement', 'Abonnement'],
  ['equipe', 'Équipe'],
  ['activite', 'Activité'],
  ['sanctions', 'Sanctions'],
  ['notes', 'Notes'],
] as const;

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
          <OngletFiche
            f={f}
            onglet={onglet}
            peutValider={p('documents.valider')}
            peutNoter={s.role !== 'lecture'}
          />
        )}
      </dl>
    </section>
  );
}
