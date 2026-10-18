'use client';

import { LIBELLES_STATUT_ARTICLE, type StatutArticle } from '@ph/core/blog';
import { bouton, Button, Input } from '@ph/ui';
import Link from 'next/link';
import { useState } from 'react';
import { routes } from '@/lib/routes';

/** Date du lendemain (jour local), proposée par défaut pour planifier. */
const demain = () => {
  const d = new Date(Date.now() + 86_400_000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Barre de l'éditeur : retour au blog, statut, points bloquants, Enregistrer, Planifier, Publier. */
export function BarreArticle(p: {
  titre: string;
  statut: StatutArticle;
  modifie: boolean;
  bloquants: number;
  enCours: boolean;
  onVoirSeo: () => void;
  onEnregistrer: () => void;
  onPlanifier: (dateIso: string) => void;
  onPublier: () => void;
}) {
  const [date, setDate] = useState(demain);
  return (
    <header className="flex flex-wrap items-center gap-2 border-b border-trait px-3 py-2">
      <Link href={routes.proSiteOnglet('blog')} className={bouton({ variant: 'fantome' })}>
        ← Blog
      </Link>
      <span className="mr-auto grid min-w-0">
        <strong className="truncate">{p.titre || 'Nouvel article'}</strong>
        <span className="text-sm text-neutre-800">
          {LIBELLES_STATUT_ARTICLE[p.statut]} · {p.modifie ? 'non enregistré' : 'enregistré'}
        </span>
      </span>
      {p.bloquants ? (
        <Button variant="fantome" onClick={p.onVoirSeo} className="text-danger">
          {p.bloquants} point{p.bloquants > 1 ? 's' : ''} à corriger
        </Button>
      ) : null}
      <Button variant="secondaire" onClick={p.onEnregistrer} disabled={p.enCours}>
        Enregistrer
      </Button>
      <span className="flex items-center gap-1">
        <Input
          type="date"
          aria-label="Date de publication"
          value={date}
          min={demain()}
          onChange={(e) => setDate(e.target.value)}
          className="w-auto"
        />
        <Button
          variant="secondaire"
          disabled={p.enCours || !date}
          onClick={() => {
            if (p.bloquants) return p.onVoirSeo();
            p.onPlanifier(new Date(`${date}T08:00:00`).toISOString());
          }}
        >
          Planifier
        </Button>
      </span>
      <Button disabled={p.enCours} onClick={() => (p.bloquants ? p.onVoirSeo() : p.onPublier())}>
        Publier
      </Button>
    </header>
  );
}
