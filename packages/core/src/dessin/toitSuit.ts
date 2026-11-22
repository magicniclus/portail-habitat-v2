import type { Niveau, Scene } from '../schemas/dessinScene';
import { definirToiture } from './commandesToit';
import { niveauSuperieur, niveauxTries } from './niveaux';
import { emprisesToit } from './toitures';

/** Niveau muni du toit `modele` (forme, pentes, couverture, débord), sans ses éléments. */
function avecToitDe(n: Niveau, modele: NonNullable<Niveau['toiture']>): Niveau | null {
  const neuf = definirToiture(n, modele.type);
  if (!neuf.ok) return null;
  return {
    ...n,
    toiture: {
      ...neuf.data.toiture!,
      pentes: modele.pentes,
      debord: modele.debord,
      couverture: modele.couverture,
      faitageAngle: modele.faitageAngle,
    },
  };
}

/** Partie du niveau sans rien au-dessus (qu'un toit couvrirait). */
const decouvert = (n: Niveau, dessus: Niveau | null, modele: NonNullable<Niveau['toiture']>) => {
  const essai = n.toiture ? n : avecToitDe(n, modele);
  return Boolean(essai && emprisesToit(essai, dessus).length);
};

/**
 * Le toit suit les murs (DES-16) : quand une modification découvre une partie d'un niveau
 * (murs de l'étage effacés, par exemple), ce niveau reçoit le même toit que la maison. Un
 * niveau dont on a retiré le toit exprès le garde retiré tant que la maison ne change pas.
 */
export function toituresSuivies(avant: Scene, apres: Scene): Scene {
  const modele = [...niveauxTries(apres)].reverse().find((n) => n.toiture)?.toiture;
  if (!modele) return apres;
  let change = false;
  const niveaux = apres.niveaux.map((n) => {
    if (n.toiture || n.type === 'sous_sol' || n.murs.length < 3) return n;
    const dessus = niveauSuperieur(apres, n.id);
    const ancien = avant.niveaux.find((x) => x.id === n.id);
    const ancienDessus = ancien ? niveauSuperieur(avant, n.id) : null;
    // Rien n'a bougé ici ni juste au-dessus : on respecte le choix fait (pas de toit).
    if (ancien && ancien.murs === n.murs && ancienDessus?.murs === dessus?.murs) return n;
    if (!decouvert(n, dessus, modele)) return n;
    if (ancien && decouvert(ancien, ancienDessus, modele)) return n;
    const couvert = avecToitDe(n, modele);
    if (!couvert) return n;
    change = true;
    return couvert;
  });
  return change ? { ...apres, niveaux } : apres;
}
