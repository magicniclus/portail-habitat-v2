import type { Navigation } from './schemas';

type Requis<T> = { [K in keyof T]-?: Exclude<T[K], undefined> };
export type NavigationComplete = Omit<Navigation, 'logo' | 'cta' | 'mobile'> &
  Requis<Pick<Navigation, 'align' | 'texte' | 'hauteur'>> & {
    logo: Requis<Navigation['logo']>;
    cta: Requis<Navigation['cta']>;
    mobile: Requis<Navigation['mobile']>;
  };

/**
 * Navigation avec tous ses réglages (maquette Editeur de Site) : les sites créés avant ces
 * réglages reçoivent les valeurs par défaut, sans migration des données.
 */
export function navigationComplete(n: Navigation): NavigationComplete {
  return {
    ...n,
    logo: {
      ...n.logo,
      taille: n.logo.taille ?? { desktop: 40, tablet: 36, mobile: 32 },
      fond: n.logo.fond ?? 'primaire',
    },
    align: n.align ?? 'centre',
    cta: { ...n.cta, texteCouleur: n.cta.texteCouleur ?? 'auto' },
    texte: n.texte ?? 'auto',
    hauteur: n.hauteur ?? { desktop: 16, tablet: 14, mobile: 12 },
    mobile: {
      sens: n.mobile.sens,
      burger: n.mobile.burger ?? 'droite',
      traits: n.mobile.traits ?? 'auto',
      cta: n.mobile.cta ?? false,
      tel: n.mobile.tel ?? false,
      fond: n.mobile.fond ?? 'blanc',
      taille: n.mobile.taille ?? 20,
      separateurs: n.mobile.separateurs ?? true,
      ctaMenu: n.mobile.ctaMenu ?? true,
      barreAppel: n.mobile.barreAppel ?? true,
    },
  };
}
