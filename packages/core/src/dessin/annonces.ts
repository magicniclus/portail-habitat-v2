import type { Niveau } from '../schemas/dessinScene';
import { objetDuCatalogue } from './catalogue';
import { LIBELLES_ESCALIER } from './escaliers';
import { LIBELLES_FORME_PISCINE } from './exterieur';
import { formatLongueur, formatSurface } from './format';
import { contourPiscine } from './formePiscine';
import { aire } from './geometrie';
import { longueurMur } from './murs';
import { CATALOGUE_OUVERTURES } from './ouvertures';

export type GenreAnnonce =
  | 'mur'
  | 'piece'
  | 'ouverture'
  | 'escalier'
  | 'objet'
  | 'zone'
  | 'terrasse'
  | 'piscine'
  | 'cloture'
  | 'vegetal';

const cm = (mm: number) => `${Math.round(mm / 10)}`;
const VEGETAUX = { arbre: 'Arbre', arbuste: 'Arbuste', haie: 'Haie' } as const;

/**
 * Phrase lue par les lecteurs d'écran quand un élément est choisi (DES-47) : sa nature et ses
 * mesures. Chaîne vide si rien n'est choisi ou si l'élément n'existe plus.
 */
export function descriptionSelection(
  n: Niveau,
  s: { genre: GenreAnnonce; id: string } | null,
): string {
  if (!s) return '';
  const e = n.exterieur;
  switch (s.genre) {
    case 'mur': {
      const m = n.murs.find((x) => x.id === s.id);
      return m
        ? `Mur choisi : ${formatLongueur(longueurMur(m))}, épaisseur ${cm(m.epaisseur)} cm, hauteur ${formatLongueur(m.hauteur)}.`
        : '';
    }
    case 'piece': {
      const p = n.pieces.find((x) => x.id === s.id);
      return p ? `Pièce choisie : ${p.nom}, ${formatSurface(Math.round(aire(p.contour)))}.` : '';
    }
    case 'ouverture': {
      const o = n.ouvertures.find((x) => x.id === s.id);
      return o
        ? `${CATALOGUE_OUVERTURES[o.type].libelle} choisie : ${cm(o.largeur)} × ${cm(o.hauteur)} cm.`
        : '';
    }
    case 'escalier': {
      const x = n.escaliers.find((y) => y.id === s.id);
      return x ? `Escalier choisi : ${LIBELLES_ESCALIER[x.type].toLowerCase()}.` : '';
    }
    case 'objet': {
      const o = n.objets.find((x) => x.id === s.id);
      if (!o) return '';
      const nom = objetDuCatalogue(o.catalogueId)?.libelle ?? 'Objet';
      return `${nom} choisi : ${cm(o.dimensions.l)} × ${cm(o.dimensions.p)} cm, rotation ${Math.round(o.rotation / 10)}°.`;
    }
    case 'zone': {
      const z = n.zonesDeco.find((x) => x.id === s.id);
      return z ? `Zone choisie : ${formatSurface(Math.round(aire(z.contour)))}.` : '';
    }
    case 'terrasse': {
      const t = e.terrasses.find((x) => x.id === s.id);
      return t ? `Terrasse choisie : ${formatSurface(Math.round(aire(t.contour)))}.` : '';
    }
    case 'piscine': {
      const p = e.piscines.find((x) => x.id === s.id);
      return p
        ? `Piscine choisie : ${LIBELLES_FORME_PISCINE[p.forme].toLowerCase()}, ${formatSurface(Math.round(aire(contourPiscine(p))))}.`
        : '';
    }
    case 'cloture': {
      const c = e.clotures.find((x) => x.id === s.id);
      if (!c) return '';
      const l = c.points
        .slice(1)
        .reduce((t, b, i) => t + Math.hypot(b.x - c.points[i]!.x, b.y - c.points[i]!.y), 0);
      return `Clôture choisie : ${formatLongueur(Math.round(l))}.`;
    }
    case 'vegetal': {
      const v = e.vegetation.find((x) => x.id === s.id);
      return v ? `${VEGETAUX[v.type]} choisi : ${formatLongueur(v.diametre)} de diamètre.` : '';
    }
  }
}
