/** Mots vides (ceux de la maquette + « qui, que, quoi », lot 3) et détection d'urgence par défaut (surchargeables par referentiel/recherche/synonymes/global). */
export const MOTS_VIDES = new Set(
  'le la les l un une des de du d au aux a en et ou pour par sur sous avec sans chez dans mon ma mes ton ta tes son sa ses notre nos votre vos leur leurs ce cet cette ces je j me m nous vous il elle on veux voudrais souhaite souhaiterais besoin faire fais faut cherche recherche trouver quel quelle quels quelles combien prix cout coute tarif devis estimation urgent urgence svp qui que quoi'.split(
    ' ',
  ),
);

export const URGENCE =
  /\b(urgence|urgent|vite|rapidement|aujourd'hui|ce soir|de suite|tout de suite|degat)\b/i;

/** Bonus d'une requête identique à un libellé ou à un mot-clé d'intention (pertinence ≥ 95 % au 1er rang). */
export const BONUS_LIBELLE_EXACT = 8;
export const BONUS_MOT_CLE_EXACT = 4;
