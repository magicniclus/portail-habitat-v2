import { niveau as schemaNiveau, type Niveau } from '../schemas/dessinScene';
import type { Contexte } from './commandes';
import { mursDepuisForme } from './formes';
import { detecterPieces, synchroniserPieces } from './pieces';

/** Aides des tests de Dessin (non exportées par le paquet). */
export function contexteTest(): Contexte {
  let n = 0;
  return { nouvelId: (prefixe) => `${prefixe}_t${String(n++).padStart(4, '0')}` };
}

/** La pièce de la maquette : 10,60 × 8,60 m hors tout, murs de 30 cm, 80,0 m² intérieurs. */
export function niveauMaquette(ctx = contexteTest()): Niveau {
  const r = mursDepuisForme(
    { forme: 'rectangle', largeur: 10_600, profondeur: 8_600 },
    { epaisseur: 300, hauteur: 2_500, nouvelId: ctx.nouvelId },
  );
  if (!r.ok) throw new Error(r.message);
  const vide = schemaNiveau.parse({ id: 'n_rdc0', nom: 'RDC', type: 'rdc', altitude: 0 });
  return {
    ...vide,
    murs: r.data,
    pieces: synchroniserPieces([], detecterPieces(r.data), () => ctx.nouvelId('p')),
  };
}
