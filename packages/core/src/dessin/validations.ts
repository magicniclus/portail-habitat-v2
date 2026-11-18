import type { Niveau } from '../schemas/dessinScene';

/**
 * Alertes de conception (indicatives, jamais bloquantes ni juridiques) : DES-15, DES-18.
 */
export interface Alerte {
  code: 'blondel' | 'hauteur_marche' | 'giron' | 'echappee' | 'garde_corps';
  elementId: string;
  message: string;
}

/** Hauteur d'échappée minimale sous plafond au-dessus d'un escalier, en mm. */
const ECHAPPEE_MIN = 1_900;

export function alertesEscaliers(
  n: Pick<Niveau, 'escaliers'>,
  hauteurNiveauSuperieur?: number,
): Alerte[] {
  return n.escaliers.flatMap((e) => {
    const h = e.hauteurAMonter / e.nbMarches;
    const blondel = 2 * h + e.giron;
    const alertes: Alerte[] = [];
    if (blondel < 600 || blondel > 640)
      alertes.push({
        code: 'blondel',
        elementId: e.id,
        message: `Escalier peu confortable : 2 hauteurs + 1 giron = ${Math.round(blondel / 10)} cm (idéal 60 à 64 cm).`,
      });
    if (h < 150 || h > 210)
      alertes.push({
        code: 'hauteur_marche',
        elementId: e.id,
        message: `Hauteur de marche de ${Math.round(h / 10)} cm (conseillé 15 à 21 cm).`,
      });
    if (e.giron < 210)
      alertes.push({
        code: 'giron',
        elementId: e.id,
        message: 'Giron inférieur à 21 cm : marches courtes.',
      });
    if (
      hauteurNiveauSuperieur !== undefined &&
      hauteurNiveauSuperieur < ECHAPPEE_MIN &&
      e.type !== 'meunier'
    )
      alertes.push({
        code: 'echappee',
        elementId: e.id,
        message: 'Moins de 1,90 m de hauteur libre au-dessus de l’escalier.',
      });
    return alertes;
  });
}

/** Une terrasse à plus d'un mètre du sol sans garde-corps est signalée. */
export const alertesTerrasses = (n: Niveau): Alerte[] =>
  n.exterieur.terrasses
    .filter((t) => t.hauteur > 1_000 && !t.gardeCorps)
    .map((t) => ({
      code: 'garde_corps' as const,
      elementId: t.id,
      message: 'Terrasse à plus d’un mètre du sol : un garde-corps est obligatoire.',
    }));
