import { motsDepuisTexte } from './edition';
import { dureeFrise, type Frise } from './frise';
import { motsFrise } from './imageFrise';
import type { MotTranscrit } from './plan';
import { lignesSousTitres, reglagesSousTitres, type LigneSousTitre } from './sousTitres';

/**
 * Sous-titres de la frise : les mots corrigés à la main s'il y en a, sinon ceux de la voix
 * enregistrée replacés sur la frise.
 */
export function motsSousTitres(
  f: Pick<Frise, 'pistes' | 'motsEdites'>,
  mots: readonly MotTranscrit[],
): MotTranscrit[] {
  return f.motsEdites ? [...f.motsEdites] : motsFrise(f, mots);
}

export function lignesFrise(
  f: Pick<Frise, 'pistes' | 'motsEdites' | 'format'>,
  mots: readonly MotTranscrit[],
): LigneSousTitre[] {
  return lignesSousTitres(motsSousTitres(f, mots), reglagesSousTitres(f.format));
}

const mot40 = (m: MotTranscrit) => ({ ...m, texte: m.texte.slice(0, 40) });

/**
 * Corrige le texte d'une ligne : ses mots sont remplacés par ceux du nouveau texte, répartis
 * sur le même temps. Un texte vide supprime la ligne.
 */
export function modifierLigneSousTitres(
  f: Frise,
  mots: readonly MotTranscrit[],
  index: number,
  texte: string,
): Frise {
  const lignes = lignesFrise(f, mots);
  const l = lignes[index];
  if (!l) return f;
  const nouveaux = motsDepuisTexte(texte, l.fin - l.debut).map((m) => ({
    ...mot40(m),
    debut: m.debut + l.debut,
    fin: m.fin + l.debut,
  }));
  const tous = lignes.flatMap((x, i) => (i === index ? nouveaux : x.mots.map(mot40)));
  return { ...f, motsEdites: tous.slice(0, 3_000), sousTitres: true };
}

/** Sous-titres écrits d'un bloc (montage sans voix transcrite) : répartis sur toute la vidéo. */
export function ecrireSousTitres(f: Frise, texte: string): Frise {
  const mots = motsDepuisTexte(texte, dureeFrise(f)).map(mot40).slice(0, 3_000);
  return { ...f, motsEdites: mots, sousTitres: mots.length > 0 || f.sousTitres };
}

/** Revenir aux mots de la voix (abandonner les corrections). */
export function sousTitresDeLaVoix(f: Frise): Frise {
  const { motsEdites: _retire, ...reste } = f;
  return reste;
}
