import {
  LIBELLES_ELEMENT,
  trouverNoeud,
  type Element,
  type Ligne,
  type PageSite,
  type Section,
} from '@ph/core/sites';
import type { NiveauEditeur } from '@ph/ui/tokens';

/** Action d'une barre de sélection (aperçu et panneau de droite). */
export type OpSelection = 'haut' | 'bas' | 'gauche' | 'droite' | 'dupliquer' | 'supprimer' | 'bloc';
interface ActionSelection {
  op: OpSelection;
  label: string;
}

export interface InfoSelection {
  id: string;
  niveau: NiveauEditeur;
  nom: string;
  actions: ActionSelection[];
  /** Bouton sous la sélection dans l'aperçu (« + Zone », « + Section », « + Contenu »). */
  ajout?: { op: 'zone' | 'section' | 'contenu'; label: string };
}

const nomElement = (e: Element) => LIBELLES_ELEMENT[e.type];

/**
 * Nom, niveau et actions de la sélection (maquette Editeur de Site) : les blocs se déplacent à
 * gauche et à droite, une section propose « Ajouter un bloc », la navigation se retire du site.
 */
export function infoSelection(page: PageSite, id: string | null): InfoSelection | null {
  if (!id) return null;
  if (id === 'nav')
    return {
      id,
      niveau: 'nav',
      nom: 'Navigation',
      actions: [{ op: 'supprimer', label: 'Retirer le menu du site' }],
    };
  const f = trouverNoeud(page, id);
  if (!f) return null;
  const niveau: NiveauEditeur = f.niveau;
  const nom =
    f.niveau === 'zone'
      ? (f.noeud as Section).p.nom || `Zone ${f.i + 1}`
      : f.niveau === 'section'
        ? `Section ${f.i + 1}`
        : f.niveau === 'bloc'
          ? `Bloc ${f.i + 1}`
          : nomElement(f.noeud as Element);
  const actions: ActionSelection[] = [];
  if (f.niveau === 'section' && (f.noeud as Ligne).cols.length < 6)
    actions.push({ op: 'bloc', label: 'Ajouter un bloc' });
  if (f.niveau === 'bloc')
    actions.push(
      { op: 'gauche', label: 'Vers la gauche' },
      { op: 'droite', label: 'Vers la droite' },
    );
  else actions.push({ op: 'haut', label: 'Monter' }, { op: 'bas', label: 'Descendre' });
  actions.push(
    { op: 'dupliquer', label: 'Dupliquer (Ctrl D)' },
    { op: 'supprimer', label: 'Supprimer (Suppr)' },
  );
  return {
    id,
    niveau,
    nom,
    actions,
    ...(f.niveau === 'zone'
      ? { ajout: { op: 'zone', label: '+ Zone' } as const }
      : f.niveau === 'section'
        ? { ajout: { op: 'section', label: '+ Section' } as const }
        : { ajout: { op: 'contenu', label: '+ Contenu' } as const }),
  };
}

/** Badge de l'aperçu : « Zone · Bandeau », « Section 1 · 6/6 », « Bloc 2 », « Titre ». */
export function badgeSelection(page: PageSite, info: InfoSelection): string {
  if (info.niveau === 'nav') return 'Navigation · globale';
  if (info.niveau === 'zone') return `Zone · ${info.nom}`;
  if (info.niveau === 'section') {
    const l = trouverNoeud(page, info.id)?.noeud as Ligne | undefined;
    return l ? `${info.nom} · ${l.cols.map((c) => c.w).join('/')}` : info.nom;
  }
  return info.nom;
}
