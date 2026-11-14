import { majNoeud, type Appareil, type PageSite } from '@ph/core/sites';
import type { ProprietesEditeur } from '../proprietes';
import type { useMediatheque } from '../useApercuCliquable';
import type { useBrouillonSite } from '../useBrouillonSite';
import type { ContexteReglages } from './contexte';

/** Contexte des réglages de droite, assemblé depuis l'état de l'éditeur. */
export function contexteReglages(e: {
  s: ReturnType<typeof useBrouillonSite>;
  pageId: string;
  appareil: Appareil;
  m: ReturnType<typeof useMediatheque>;
  props: ProprietesEditeur;
  selection: string | null;
  majPage: (f: (p: PageSite) => PageSite) => void;
  ouvrirAjout: ContexteReglages['ouvrirAjout'];
  setAppareil: (a: Appareil) => void;
  basculerMenu: () => void;
  demanderIa: (demande: string) => void;
}): ContexteReglages {
  const { s, m, selection } = e;
  return {
    pages: s.b.pages,
    pageId: e.pageId,
    palette: s.b.theme.palette,
    appareil: e.appareil,
    medias: m.medias,
    artisanId: e.props.artisanId,
    onMedia: m.onMedia,
    fichiers: m.fichiers,
    onFichier: m.onFichier,
    ancrerZone: s.ancrerZone,
    ...(s.b.navigation.tel.numero ? { telephone: s.b.navigation.tel.numero } : {}),
    erreurAction: s.erreurAction(e.pageId, new Set(Object.keys(m.fichiers))),
    categoriesBlog: e.props.blog.classement.categories,
    maj: (r) => {
      if (selection) e.majPage((p) => majNoeud(p, selection, r));
    },
    ouvrirAjout: e.ouvrirAjout,
    onAppareil: e.setAppareil,
    basculerMenu: e.basculerMenu,
    demanderIa: e.demanderIa,
  };
}
