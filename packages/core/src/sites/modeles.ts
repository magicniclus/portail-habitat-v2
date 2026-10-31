import { DEFAUTS_COLONNE, elementDuCatalogue } from './catalogue';
import { siteParDefaut, type FicheSite } from './defaut';
import type { Navigation, PageSite, Section, Theme } from './schemas';

/** Mise en page du bandeau d'accueil propre à chaque modèle. */
type Hero = 'split' | 'photo' | 'sombre' | 'minimal';

export interface ModeleSite {
  id: string;
  nom: string;
  description: string;
  /** Index dans `palettesSites` (`@ph/ui/tokens`) : les couleurs restent dans les tokens. */
  palette: number;
  polices: Theme['polices'];
  rayonBoutons: Theme['rayonBoutons'];
  ton: Theme['ton'];
  hero: Hero;
}

/** Les 6 modèles fournis (SITE_INTERNET §4.7, maquette « Editeur de Site », D47). */
export const MODELES_SITE: readonly ModeleSite[] = [
  {
    id: 'classique',
    nom: 'Artisan classique',
    description: 'Clair, photo à droite, très lisible',
    palette: 0,
    polices: 'archivo',
    rayonBoutons: 8,
    ton: 'pro',
    hero: 'split',
  },
  {
    id: 'premium',
    nom: 'Premium photo',
    description: 'Grandes photos assombries, élégant',
    palette: 4,
    polices: 'dmserif',
    rayonBoutons: 2,
    ton: 'chaleureux',
    hero: 'photo',
  },
  {
    id: 'urgence',
    nom: 'Dépannage 24/7',
    description: 'Fond sombre, boutons très visibles',
    palette: 1,
    polices: 'barlow',
    rayonBoutons: 999,
    ton: 'direct',
    hero: 'sombre',
  },
  {
    id: 'minimal',
    nom: 'Minimal',
    description: 'Beaucoup de blanc, typographie fine',
    palette: 3,
    polices: 'dmserif',
    rayonBoutons: 2,
    ton: 'pro',
    hero: 'minimal',
  },
  {
    id: 'chaleureux',
    nom: 'Chaleureux',
    description: 'Tons sable et vert, rassurant',
    palette: 2,
    polices: 'dmserif',
    rayonBoutons: 8,
    ton: 'chaleureux',
    hero: 'split',
  },
  {
    id: 'franc',
    nom: 'Bleu franc',
    description: 'Moderne, photo plein écran',
    palette: 5,
    polices: 'archivo',
    rayonBoutons: 999,
    ton: 'direct',
    hero: 'photo',
  },
];

export const modeleSite = (id: string) => MODELES_SITE.find((m) => m.id === id);

/** Pages que le site de départ sait construire à partir de la fiche. */
const REFAITES: readonly PageSite['type'][] = ['accueil', 'contact', 'mentions'];

const BANDEAU = 'Bandeau';
const AVIS = 'Avis clients';
const PIED = 'Pied de page';
const PAD_BANDEAU = { desktop: 80, tablet: 60, mobile: 40 };
const PAD_PHOTO = { desktop: 130, tablet: 96, mobile: 64 };
const PAD_MINIMAL = { desktop: 110, tablet: 80, mobile: 52 };

type Element = Section['rows'][number]['cols'][number]['els'][number];
const elements = (x: Section) => x.rows.flatMap((l) => l.cols.flatMap((c) => c.els));

/**
 * Bandeau : nommé ainsi, ou première zone de la page avec le titre principal (h1) et un bouton
 * (une page de texte, comme les mentions légales, n'a pas de bandeau).
 */
const estBandeau = (x: Section, i: number) => {
  if (x.p.nom === BANDEAU) return true;
  const els = elements(x);
  return (
    i === 0 &&
    els.some((e) => e.type === 'titre' && e.p.niveau === 'h1') &&
    els.some((e) => e.type === 'bouton')
  );
};
const estAvis = (x: Section) => x.p.nom === AVIS || elements(x).some((e) => e.type === 'avis');

const MASQUE = { desktop: true, tablet: true, mobile: true };
const VISIBLE = { desktop: false, tablet: false, mobile: false };
const aImage = (c: Section['rows'][number]['cols'][number]) =>
  c.els.some((e) => e.type === 'image');

/**
 * Bandeau remis en « photo à droite » : la colonne photo masquée par un modèle photo ou minimal
 * réapparaît (ou est recréée pour un bandeau photo d'avant). Rend chaque modèle indépendant du
 * précédent.
 */
function bandeauScinde(x: Section) {
  const r = x.rows[0];
  const photo = x.p.fondType === 'image' ? x.p.fondImage : '';
  x.p = { ...x.p, fondType: 'couleur', fondImage: '', voileOpacite: 0 };
  if (!r) return;
  const colPhoto = r.cols.find(aImage);
  const texte = r.cols.find((c) => !aImage(c)) ?? r.cols[0]!;
  if (colPhoto) {
    if (!colPhoto.p.masque.desktop) return;
    r.cols = r.cols.map((c) =>
      c === colPhoto
        ? { ...c, w: 6, p: { ...c.p, masque: VISIBLE } }
        : c === texte
          ? { ...c, w: 6 }
          : c,
    );
    return;
  }
  if (!photo) return;
  const image = elementDuCatalogue('image', `${texte.id}-photo`, { src: photo }) as Element;
  r.cols = [
    { ...texte, w: 6 },
    { id: `${texte.id}-p`, w: 6, p: { ...DEFAUTS_COLONNE }, els: [image] },
  ];
}

/** Variante de mise en page d'une zone selon le modèle (logique `varianter` de la maquette). */
function varianter(s: Section, i: number, hero: Hero): Section {
  const x: Section = structuredClone(s);
  const r = x.rows[0];
  if (estBandeau(x, i) && r) {
    const image = r.cols.flatMap((c) => c.els).find((e) => e.type === 'image' && e.p.src);
    const photo =
      image?.type === 'image' ? image.p.src : x.p.fondType === 'image' ? x.p.fondImage : '';
    bandeauScinde(x);
    // Photo et minimal : texte centré sur toute la largeur (vignettes de la galerie).
    const centre = hero === 'photo' || hero === 'minimal';
    if (centre)
      r.cols = r.cols.map((c) =>
        aImage(c) ? { ...c, p: { ...c.p, masque: MASQUE } } : { ...c, w: 12 },
      );
    if (hero === 'photo' && photo)
      x.p = {
        ...x.p,
        fond: 'clair',
        fondType: 'image',
        fondImage: photo,
        voile: 'sombre',
        voileOpacite: 62,
        padY: PAD_PHOTO,
      };
    else {
      // Sans photo, le modèle photo garde son grand bandeau, sur la couleur principale.
      x.p.fond = { split: 'clair', photo: 'primaire', sombre: 'sombre', minimal: 'blanc' }[hero];
      x.p.padY = hero === 'photo' ? PAD_PHOTO : hero === 'minimal' ? PAD_MINIMAL : PAD_BANDEAU;
    }
    for (const e of elements(x)) {
      if ('align' in e.p && e.type !== 'image') e.p.align = centre ? 'center' : 'left';
      // Centré : un bouton par ligne (comme la zone « Bandeau sur photo ») ; sinon côte à côte.
      if (e.type === 'bouton') e.p.enLigne = !centre;
    }
  } else if (estAvis(x)) {
    x.p.fond = hero === 'sombre' ? 'sombre' : hero === 'minimal' ? 'clair' : 'blanc';
  } else if (hero === 'minimal' && x.p.nom !== PIED) {
    x.p = { ...x.p, fond: 'blanc', fondType: 'couleur' };
  }
  // Boutons pleins : accent pour « Dépannage 24/7 », couleur principale pour les autres modèles.
  for (const e of elements(x))
    if (e.type === 'bouton' && e.p.variante === 'plein')
      e.p.couleur =
        hero === 'sombre' ? 'accent' : e.p.couleur === 'accent' ? 'primaire' : e.p.couleur;
  return x;
}

/**
 * « Appliquer à tout le site » (SITE_INTERNET §4.7 : refait la mise en page, garde les données de
 * la fiche) ou « Couleurs et polices seulement » (`tout` faux : le thème seul). Avec la fiche,
 * l'accueil, le contact et les mentions sont reconstruits comme le site de départ, puis mis au
 * style du modèle ; les autres pages gardent leurs zones, mises au style du modèle. Le nom, l'adresse
 * et le référencement de chaque page sont gardés. Le site reçu n'est pas modifié.
 */
export function appliquerModeleSite<
  S extends { theme: Theme; navigation: Navigation; pages: Record<string, PageSite> },
>(site: S, m: ModeleSite, palette: Theme['palette'], tout: boolean, fiche?: FicheSite): S {
  const theme: Theme = { palette, polices: m.polices, rayonBoutons: m.rayonBoutons, ton: m.ton };
  if (!tout) return { ...site, theme };
  const depart = fiche ? Object.values(siteParDefaut(fiche, palette).pages) : [];
  const pages = Object.fromEntries(
    Object.entries(site.pages).map(([id, p]) => {
      const refaite = depart.find((d) => d.type === p.type && REFAITES.includes(p.type));
      const sections = refaite ? structuredClone(refaite.sections) : p.sections;
      return [id, { ...p, sections: sections.map((s, i) => varianter(s, i, m.hero)) }];
    }),
  );
  return { ...site, theme, pages };
}
