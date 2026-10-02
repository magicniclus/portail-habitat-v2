import { LIBELLES_PLAN } from '@ph/core/admin';
import { LIBELLES_TYPE_DOCUMENT } from '@ph/core/espace-pro';
import { formatDate } from '@ph/core/format';
import type { FicheArtisanAdmin as Fiche } from '@ph/firebase/admin-serveur';
import { Button, Field, Textarea } from '@ph/ui';
import type { ReactNode } from 'react';
import { ajouterNote } from './actions';
import { DecisionDocument } from './DecisionDocument';

export function Ligne({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-trait py-2.5 sm:grid-cols-[180px_minmax(0,1fr)]">
      <dt className="text-sm text-neutre-700">{k}</dt>
      <dd className="m-0 text-base">{children}</dd>
    </div>
  );
}

const STATUTS_DOCUMENT: Record<string, string> = {
  en_attente: 'à vérifier',
  valide: 'validé',
  refuse: 'refusé',
  expire: 'expiré',
};

function Documents({ f, peutValider }: { f: Fiche; peutValider: boolean }) {
  if (!f.documents.length) return <Ligne k="Documents">Aucun document déposé</Ligne>;
  return f.documents.map((d) => {
    const libelle = LIBELLES_TYPE_DOCUMENT[d.type] ?? d.type;
    return (
      <Ligne key={d.id} k={libelle}>
        <span className="grid gap-2">
          <span>
            <a href={`/admin/documents/${f.id}/${d.id}`} target="_blank" rel="noreferrer">
              {d.nomFichier}
            </a>{' '}
            · déposé le {formatDate(d.deposeLe)} · {STATUTS_DOCUMENT[d.statut] ?? d.statut}
            {d.motifRefus ? ` (${d.motifRefus})` : ''}
          </span>
          {d.statut === 'en_attente' && peutValider ? (
            <DecisionDocument artisanId={f.id} documentId={d.id} libelle={libelle} />
          ) : null}
        </span>
      </Ligne>
    );
  });
}

function Notes({ f, peutNoter }: { f: Fiche; peutNoter: boolean }) {
  return (
    <>
      {f.notes.length ? (
        f.notes.map((n) => (
          <Ligne key={n.le} k={formatDate(n.le)}>
            {n.texte}
          </Ligne>
        ))
      ) : (
        <Ligne k="Notes">Aucune note</Ligne>
      )}
      {peutNoter ? (
        <form action={ajouterNote} className="grid gap-2 pt-3">
          <input type="hidden" name="artisanId" value={f.id} />
          <Field label="Nouvelle note interne">
            <Textarea name="texte" rows={3} required minLength={2} />
          </Field>
          <Button type="submit" variant="secondaire">
            Ajouter la note
          </Button>
        </form>
      ) : null}
    </>
  );
}

/** Onglets de la fiche 360° autres qu'Identité (ADMIN §2.3). */
export function OngletFiche({
  f,
  onglet,
  peutValider,
  peutNoter,
}: {
  f: Fiche;
  onglet: string;
  peutValider: boolean;
  peutNoter: boolean;
}) {
  if (onglet === 'documents') return <Documents f={f} peutValider={peutValider} />;
  if (onglet === 'notes') return <Notes f={f} peutNoter={peutNoter} />;
  if (onglet === 'abonnement')
    return (
      <>
        <Ligne k="Formule">{LIBELLES_PLAN[f.plan as keyof typeof LIBELLES_PLAN] ?? f.plan}</Ligne>
        <Ligne k="Crédits">{f.credits}</Ligne>
      </>
    );
  if (onglet === 'equipe')
    return (
      <>
        <Ligne k="Sièges">
          {f.equipe.filter((m) => m.statut === 'actif').length} sur {f.siegesMax}
        </Ligne>
        {f.equipe.map((m) => (
          <Ligne key={m.uid} k={m.nom}>
            {m.role} · {m.statut}
          </Ligne>
        ))}
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
  return null;
}
