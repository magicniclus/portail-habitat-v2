import {
  ajouterNiveau,
  deplacerNiveau,
  reglerNiveau,
  renommerNiveau,
  supprimerNiveau,
} from '@ph/core/dessin';
import {
  contexteNavigateur as ctx,
  sceneDe,
  surScene,
  type Action,
  type EtatEditeur,
} from './etatBase';

/** Niveaux (DES-04, DES-05) : choisir, ajouter, renommer, régler, réordonner, supprimer. */
export function reduireNiveaux(e: EtatEditeur, a: Action): EtatEditeur | null {
  switch (a.type) {
    case 'changerNiveau':
      return {
        ...e,
        niveauId: a.niveauId,
        selection: null,
        trace: null,
        ajustement: e.ajustement + 1,
      };
    case 'ajouterNiveau': {
      const r = ajouterNiveau(sceneDe(e), { type: a.niveau, copierMurs: a.copierMurs }, ctx);
      if (!r.ok) return { ...e, erreur: r.message };
      const { niveauId, ...scene } = r.data;
      return { ...surScene(e, () => ({ ok: true, data: scene })), niveauId, selection: null };
    }
    case 'renommerNiveau':
      return surScene(e, (s) => renommerNiveau(s, a.niveauId, a.nom));
    case 'reglerNiveau':
      return surScene(e, (s) => reglerNiveau(s, a.niveauId, a.reglages));
    case 'deplacerNiveau':
      return surScene(e, (s) => deplacerNiveau(s, a.niveauId, a.sens));
    case 'supprimerNiveau': {
      const suite = surScene(e, (s) => supprimerNiveau(s, a.niveauId));
      if (suite.erreur) return suite;
      const reste = sceneDe(suite).niveaux;
      const niveauId = reste.some((n) => n.id === e.niveauId) ? e.niveauId : reste[0]!.id;
      return { ...suite, niveauId, selection: null };
    }
    default:
      return null;
  }
}
