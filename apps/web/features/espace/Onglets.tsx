import type { Route } from 'next';
import Link from 'next/link';
import { routes } from '@/lib/routes';

export type Onglet = 'projets' | 'plans' | 'avis' | 'compte';

const ONGLETS: { id: Onglet; libelle: string; href: Route }[] = [
  { id: 'projets', libelle: 'Mes projets', href: routes.monEspace },
  { id: 'plans', libelle: 'Mes plans', href: routes.monEspacePlans },
  { id: 'avis', libelle: 'Mes avis', href: routes.monEspaceAvis },
  { id: 'compte', libelle: 'Mon compte', href: routes.monEspaceCompte },
];

/**
 * Onglets de l'espace : de vrais liens (retour arrière, ouverture dans un nouvel onglet).
 * « Mes plans » (Dessin) n'apparaît que si le flag `dessin` est actif (`avecPlans`).
 */
export function Onglets({ actif, avecPlans = false }: { actif: Onglet; avecPlans?: boolean }) {
  return (
    <nav
      aria-label="Mon espace"
      className="flex gap-1 overflow-x-auto rounded-[12px] border border-trait p-1"
    >
      {ONGLETS.filter((o) => o.id !== 'plans' || avecPlans).map((o) => (
        <Link
          key={o.id}
          href={o.href}
          aria-current={o.id === actif ? 'page' : undefined}
          className={`inline-flex min-h-11 items-center rounded-[9px] px-3.5 text-[15px] font-semibold whitespace-nowrap no-underline ${o.id === actif ? 'bg-accent text-blanc' : 'text-texte hover:bg-neutre-100'}`}
        >
          {o.libelle}
        </Link>
      ))}
    </nav>
  );
}
