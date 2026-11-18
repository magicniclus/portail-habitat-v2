import {
  ajouterAllee,
  ajouterPiscine,
  ajouterTerrasse,
  ajouterVegetal,
  accrocherALaLimite,
  definirParcelle,
  modifierExterieur,
  parcelleAutour,
  supprimerExterieur,
  tracerCloture,
  type Niveau,
  type Point,
} from '@ph/core/dessin';
import type { Resultat } from '@ph/core/resultat';
import {
  contexteNavigateur as ctx,
  sceneDe,
  surNiveau,
  surScene,
  type Action,
  type EtatEditeur,
} from './etatBase';

/** Applique une commande qui renvoie aussi l'identifiant créé ; le sélectionne. */
function creer(
  e: EtatEditeur,
  commande: (n: Niveau) => Resultat<Niveau & { elementId: string }>,
  genre: 'terrasse' | 'piscine' | 'cloture' | 'vegetal',
): EtatEditeur {
  let id = '';
  const suite = surNiveau(e, (n) => {
    const r = commande(n);
    if (!r.ok) return r;
    const { elementId: cree, ...niveau } = r.data;
    id = cree;
    return { ok: true, data: niveau };
  });
  if (suite.erreur) return { ...suite, trace: null };
  return genre === 'cloture'
    ? suite
    : { ...suite, trace: null, outil: 'selection', selection: { genre, id }, proprietes: true };
}

/**
 * Clic sur le plan avec l'outil « extérieur » (DES-18 à DES-20) : terrasse, allée et parcelle
 * en deux coins ; piscine et végétaux d'un clic ; clôture point par point (Échap pour finir).
 */
export function poserExterieur(e: EtatEditeur, point: Point): EtatEditeur | null {
  if (e.outil !== 'exterieur') return null;
  const el = e.elementExterieur;
  if (el === 'piscine')
    return creer(e, (n) => ajouterPiscine(n, point, e.formePiscine, ctx), 'piscine');
  if (el === 'arbre' || el === 'arbuste' || el === 'haie')
    return creer(e, (n) => ajouterVegetal(n, point, el, ctx, { aimant: e.aimant }), 'vegetal');
  // Clôture : chaque point s'aligne sur la limite de parcelle toute proche.
  if (el === 'cloture') point = accrocherALaLimite(sceneDe(e), point, e.aimant);
  if (!e.trace) return { ...e, trace: point, selection: null };
  const a = e.trace;
  if (el === 'cloture') {
    let id = e.clotureEnCours ?? undefined;
    const suite = surNiveau(e, (n) => {
      const r = tracerCloture(n, { ...(id ? { id } : {}), a, b: point, type: e.typeCloture }, ctx);
      if (!r.ok) return r;
      const { elementId: cree, ...niveau } = r.data;
      id = cree;
      return { ok: true, data: niveau };
    });
    return suite.erreur ? suite : { ...suite, trace: point, clotureEnCours: id ?? null };
  }
  if (el === 'terrasse')
    return creer(e, (n) => ajouterTerrasse(n, a, point, ctx, { aimant: e.aimant }), 'terrasse');
  if (el === 'allee') return { ...surNiveau(e, (n) => ajouterAllee(n, a, point)), trace: null };
  return { ...surScene(e, (s) => definirParcelle(s, a, point)), trace: null, outil: 'selection' };
}

/** Actions de l'extérieur ; `null` si l'action n'en fait pas partie. */
export function reduireExterieur(e: EtatEditeur, a: Action): EtatEditeur | null {
  switch (a.type) {
    case 'modifierExterieur':
      return surNiveau(e, (n) => modifierExterieur(n, a.genre, a.id, a.modif));
    case 'supprimerExterieur':
      return surNiveau(e, (n) => supprimerExterieur(n, a.genre, a.id));
    case 'parcelleAutour':
      return surScene(e, (s) => parcelleAutour(s));
    default:
      return null;
  }
}
