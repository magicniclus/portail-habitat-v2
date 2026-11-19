import { echec, succes, type Resultat } from '../resultat';
import type { Niveau, Objet, Point, Scene } from '../schemas/dessinScene';
import { objetDuCatalogue } from './catalogue';
import type { Contexte } from './commandes';
import { arrondir, distance } from './geometrie';

/**
 * Annotations (DES-31) : cotes libres (deux points, longueur affichée) et textes posés sur le
 * plan. Calques (DES-30) : ce que le plan 2D affiche, enregistré avec la scène.
 */
export function ajouterCote(
  n: Niveau,
  a: Point,
  b: Point,
  ctx: Contexte,
): Resultat<Niveau & { elementId: string }> {
  if (distance(a, b) < 50) return echec('ENTREE_INVALIDE', { message: 'Cote trop courte.' });
  if (n.cotes.length >= 500)
    return echec('PRECONDITION', { message: '500 cotes au plus par niveau.' });
  const id = ctx.nouvelId('c');
  return succes({
    ...n,
    cotes: [...n.cotes, { id, a: arrondir(a), b: arrondir(b), decalage: 0 }],
    elementId: id,
  });
}

export function ajouterTexte(
  n: Niveau,
  position: Point,
  contenu: string,
  ctx: Contexte,
): Resultat<Niveau & { elementId: string }> {
  const propre = contenu.trim().slice(0, 200);
  if (!propre) return echec('ENTREE_INVALIDE', { message: 'Texte vide.' });
  if (n.textes.length >= 500)
    return echec('PRECONDITION', { message: '500 textes au plus par niveau.' });
  const id = ctx.nouvelId('t');
  return succes({
    ...n,
    textes: [...n.textes, { id, position: arrondir(position), contenu: propre, taille: 14 }],
    elementId: id,
  });
}

export function modifierTexte(
  n: Niveau,
  id: string,
  modif: { contenu?: string; taille?: number; position?: Point },
): Resultat<Niveau> {
  const t = n.textes.find((x) => x.id === id);
  if (!t) return echec('INTROUVABLE');
  const contenu = modif.contenu === undefined ? t.contenu : modif.contenu.trim().slice(0, 200);
  if (!contenu) return echec('ENTREE_INVALIDE', { message: 'Texte vide.' });
  const taille =
    modif.taille === undefined ? t.taille : Math.min(72, Math.max(8, Math.round(modif.taille)));
  const position = modif.position ? arrondir(modif.position) : t.position;
  return succes({
    ...n,
    textes: n.textes.map((x) => (x.id === id ? { ...x, contenu, taille, position } : x)),
  });
}

export function supprimerAnnotation(
  n: Niveau,
  genre: 'cote' | 'texte',
  id: string,
): Resultat<Niveau> {
  if (genre === 'cote') {
    if (!n.cotes.some((c) => c.id === id)) return echec('INTROUVABLE');
    return succes({ ...n, cotes: n.cotes.filter((c) => c.id !== id) });
  }
  if (!n.textes.some((t) => t.id === id)) return echec('INTROUVABLE');
  return succes({ ...n, textes: n.textes.filter((t) => t.id !== id) });
}

export type CalqueScene = 'mobilier' | 'electricite' | 'plomberie' | 'annotations' | 'fondImage';
export const LIBELLES_CALQUE: Record<CalqueScene, string> = {
  mobilier: 'Mobilier',
  electricite: 'Électricité',
  plomberie: 'Plomberie et chauffage',
  annotations: 'Cotes libres et textes',
  fondImage: 'Plan importé',
};

/** Affiche ou masque un calque du plan (DES-30), enregistré avec la scène. */
export const basculerCalque = (s: Scene, cle: CalqueScene): Scene => ({
  ...s,
  calques: { ...s.calques, [cle]: !s.calques[cle] },
});

/** Calque d'un objet : électricité, plomberie et chauffage, sinon mobilier. */
export function calqueObjet(
  o: Pick<Objet, 'catalogueId'>,
): 'mobilier' | 'electricite' | 'plomberie' {
  const c = objetDuCatalogue(o.catalogueId)?.categorie;
  return c === 'electricite' ? 'electricite' : c === 'chauffage' ? 'plomberie' : 'mobilier';
}

/** Objets affichés sur le plan selon les calques. */
export const objetsVisibles = (objets: readonly Objet[], calques: Scene['calques']) =>
  objets.filter((o) => calques[calqueObjet(o)]);
