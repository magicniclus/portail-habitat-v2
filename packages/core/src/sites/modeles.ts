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

const BANDEAU = 'Bandeau';
const AVIS = 'Avis clients';
const PIED = 'Pied de page';

/** Variante de mise en page d'une section selon le modèle (logique `varianter` de la maquette). */
function varianter(s: Section, hero: Hero): Section {
  const x: Section = structuredClone(s);
  const r = x.rows[0];
  if (x.p.nom === BANDEAU && r) {
    const image = r.cols[1]?.els.find((e) => e.type === 'image');
    if (hero === 'photo' && image?.type === 'image' && image.p.src) {
      x.p = {
        ...x.p,
        fondType: 'image',
        fondImage: image.p.src,
        voile: 'sombre',
        voileOpacite: 62,
        padY: { desktop: 130, tablet: 96, mobile: 64 },
      };
      r.cols = [{ ...r.cols[0]!, w: 8 }];
    }
    if (hero === 'sombre') x.p.fond = 'sombre';
    if (hero === 'minimal')
      x.p = { ...x.p, fond: 'blanc', padY: { desktop: 110, tablet: 80, mobile: 52 } };
  }
  if (hero === 'minimal' && x.p.nom !== PIED)
    x.p = { ...x.p, fond: x.p.nom === AVIS ? 'clair' : 'blanc', fondType: 'couleur' };
  if (hero === 'sombre' && x.p.nom === AVIS) x.p.fond = 'sombre';
  if (hero === 'sombre')
    for (const l of x.rows)
      for (const c of l.cols)
        for (const e of c.els)
          if (e.type === 'bouton' && e.p.variante === 'plein') e.p.couleur = 'accent';
  return x;
}

/**
 * « Appliquer à tout le site » (thème + mise en page de chaque page, textes et photos gardés) ou
 * « Couleurs et polices seulement » (`tout` faux : le thème seul). Le site reçu n'est pas modifié ;
 * l'appelant applique un modèle au site d'avant le premier modèle, pour ne pas cumuler les variantes.
 */
export function appliquerModeleSite<
  S extends { theme: Theme; navigation: Navigation; pages: Record<string, PageSite> },
>(site: S, m: ModeleSite, palette: Theme['palette'], tout: boolean): S {
  const theme: Theme = { palette, polices: m.polices, rayonBoutons: m.rayonBoutons, ton: m.ton };
  if (!tout || m.hero === 'split') return { ...site, theme };
  const pages = Object.fromEntries(
    Object.entries(site.pages).map(([id, p]) => [
      id,
      { ...p, sections: p.sections.map((s) => varianter(s, m.hero)) },
    ]),
  );
  return { ...site, theme, pages };
}
