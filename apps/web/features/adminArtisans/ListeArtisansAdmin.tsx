import {
  LIBELLES_FILTRE_ARTISANS,
  LIBELLES_PLAN,
  LIBELLES_STATUT_ARTISAN_ADMIN,
} from '@ph/core/admin';
import type { FiltreArtisans, LigneArtisanAdmin } from '@ph/firebase/admin-serveur';
import { Badge, Input, type Tone } from '@ph/ui';
import type { Route } from 'next';
import Link from 'next/link';

const TONS: Record<LigneArtisanAdmin['statut'], Tone> = {
  en_ligne: 'succes',
  a_verifier: 'attention',
  suspendu: 'danger',
  hors_ligne: 'neutre',
};

const url = (p: Record<string, string | undefined>) =>
  `/admin/artisans?${new URLSearchParams(
    Object.entries(p).filter((e): e is [string, string] => Boolean(e[1])),
  )}` as Route;

/** Liste des entreprises : filtres, recherche par nom, SIREN ou ville (maquette « Admin Artisans »). */
export function ListeArtisansAdmin({
  lignes,
  filtre,
  q,
  selection,
}: {
  lignes: LigneArtisanAdmin[];
  filtre: FiltreArtisans;
  q: string;
  selection: string | null;
}) {
  return (
    <div className="grid gap-3">
      <form action="/admin/artisans" className="grid gap-2">
        <input type="hidden" name="f" value={filtre} />
        <label className="sr-only" htmlFor="recherche-artisans">
          Rechercher une entreprise
        </label>
        <Input
          id="recherche-artisans"
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Nom, SIREN, ville…"
        />
      </form>
      <nav aria-label="Filtres" className="flex flex-wrap gap-2">
        {(Object.keys(LIBELLES_FILTRE_ARTISANS) as FiltreArtisans[]).map((f) => (
          <Link
            key={f}
            href={url({ f, q })}
            aria-current={f === filtre ? 'true' : undefined}
            className="flex min-h-11 items-center rounded-pill border border-trait px-4 text-sm font-semibold text-texte no-underline aria-[current=true]:border-accent-700 aria-[current=true]:bg-accent-700 aria-[current=true]:text-blanc"
          >
            {LIBELLES_FILTRE_ARTISANS[f]}
          </Link>
        ))}
      </nav>
      <p className="m-0 text-sm text-neutre-800">
        {lignes.length} entreprise{lignes.length > 1 ? 's' : ''}
      </p>
      <ul aria-label="Entreprises" className="m-0 grid list-none gap-2 p-0">
        {lignes.map((l) => (
          <li key={l.id}>
            <Link
              href={url({ f: filtre, q, id: l.id })}
              aria-current={l.id === selection ? 'true' : undefined}
              className="grid gap-1 rounded-[12px] border border-trait bg-blanc p-3 text-texte no-underline aria-[current=true]:border-accent-500 aria-[current=true]:bg-accent-100"
            >
              <span className="flex flex-wrap items-center justify-between gap-2">
                <strong>{l.nom}</strong>
                <Badge tone={TONS[l.statut]}>{LIBELLES_STATUT_ARTISAN_ADMIN[l.statut]}</Badge>
              </span>
              <span className="text-[13px] text-neutre-700">
                {l.metier} · {l.ville}
                {l.note !== null ? ` · ★ ${l.note.toFixed(1)}` : ''} ·{' '}
                {LIBELLES_PLAN[l.plan as keyof typeof LIBELLES_PLAN] ?? l.plan}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
