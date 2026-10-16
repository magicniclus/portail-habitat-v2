'use client';

import type { Appareil } from '@ph/core/sites';
import { bouton, Button, cn } from '@ph/ui';
import Link from 'next/link';
import { routes } from '@/lib/routes';

const PANNEAUX = [
  ['calques', 'Calques'],
  ['pages', 'Pages'],
  ['seo', 'SEO'],
  ['navigation', 'Navigation'],
  ['styles', 'Styles'],
  ['ia', 'IA'],
] as const;
export type Panneau = (typeof PANNEAUX)[number][0];

const APPAREILS: [Appareil, string][] = [
  ['desktop', 'Ordinateur'],
  ['tablet', 'Tablette'],
  ['mobile', 'Mobile'],
];

/** Barre du haut : retour, page, appareil, annuler/rétablir, Enregistrer, Publier. */
export function BarreEditeur(p: {
  nomPage: string;
  appareil: Appareil;
  onAppareil: (a: Appareil) => void;
  onAnnuler: () => void;
  onRetablir: () => void;
  peutAnnuler: boolean;
  peutRetablir: boolean;
  onEnregistrer: () => void;
  aEnregistrer: boolean;
  onPublier: () => void;
  enCours: boolean;
}) {
  return (
    <header className="flex flex-wrap items-center gap-2 border-b border-trait px-3 py-2">
      <Link href={routes.proSite} className={bouton({ variant: 'fantome' })}>
        ← Mon site
      </Link>
      <strong className="mr-auto truncate">{p.nomPage}</strong>
      <div role="group" aria-label="Appareil" className="flex gap-1">
        {APPAREILS.map(([a, l]) => (
          <Button
            key={a}
            variant={p.appareil === a ? 'secondaire' : 'fantome'}
            taille="sm"
            aria-pressed={p.appareil === a}
            onClick={() => p.onAppareil(a)}
          >
            {l}
          </Button>
        ))}
      </div>
      <Button
        variant="fantome"
        taille="sm"
        onClick={p.onAnnuler}
        disabled={!p.peutAnnuler}
        aria-label="Annuler (Ctrl Z)"
      >
        ↶
      </Button>
      <Button
        variant="fantome"
        taille="sm"
        onClick={p.onRetablir}
        disabled={!p.peutRetablir}
        aria-label="Rétablir (Ctrl ⇧ Z)"
      >
        ↷
      </Button>
      <Button
        variant="secondaire"
        onClick={p.onEnregistrer}
        disabled={p.enCours || !p.aEnregistrer}
      >
        Enregistrer
      </Button>
      <Button onClick={p.onPublier} disabled={p.enCours}>
        Publier
      </Button>
    </header>
  );
}

/** Barre de gauche : Calques · Pages · SEO · Navigation · Styles. */
export function NavPanneaux({
  actif,
  onChoisir,
}: {
  actif: Panneau;
  onChoisir: (p: Panneau) => void;
}) {
  return (
    <nav aria-label="Panneaux" className="flex flex-wrap gap-1">
      {PANNEAUX.map(([p, l]) => (
        <button
          key={p}
          type="button"
          onClick={() => onChoisir(p)}
          aria-current={actif === p ? 'true' : undefined}
          className={cn(
            'min-h-11 rounded-control px-3 font-semibold',
            actif === p ? 'bg-accent-100 text-accent-800' : 'text-neutre-800',
          )}
        >
          {l}
        </button>
      ))}
    </nav>
  );
}
