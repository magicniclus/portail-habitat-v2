import {
  dessinerSurcouche,
  type Contexte2D,
  type LigneSousTitre,
  type PlanMontage,
  type ThemeStudio,
} from '@ph/core/studio';

/**
 * Chargé dans Chromium par le robot de rendu : dessine la surcouche (carton, calques, sous-titres)
 * d'une image et la renvoie en PNG transparent. Même code que l'aperçu de l'admin.
 */
declare global {
  interface Window {
    preparerStudio: (e: {
      plan: PlanMontage;
      lignes: LigneSousTitre[];
      theme: ThemeStudio & { fond: string };
      police: string;
      largeur: number;
      hauteur: number;
    }) => Promise<void>;
    imageStudio: (t: number) => string;
  }
}

let etat: Parameters<Window['preparerStudio']>[0] | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let canevas: HTMLCanvasElement | null = null;

window.preparerStudio = async (e) => {
  etat = e;
  const police = new FontFace('Archivo', `url(data:font/woff2;base64,${e.police})`, {
    weight: '800',
  });
  document.fonts.add(await police.load());
  canevas = document.createElement('canvas');
  canevas.width = e.largeur;
  canevas.height = e.hauteur;
  document.body.appendChild(canevas);
  ctx = canevas.getContext('2d');
};

window.imageStudio = (t) => {
  if (!etat || !ctx || !canevas) throw new Error('surcouche non préparée');
  ctx.clearRect(0, 0, canevas.width, canevas.height);
  dessinerSurcouche(ctx as unknown as Contexte2D, etat.plan, t, etat.lignes, etat.theme);
  return canevas.toDataURL('image/png');
};
