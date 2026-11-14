import {
  appareilsVisibles,
  dessinerCarton,
  dessinerDessousFrise,
  dessinerMiniature,
  dessinerSurcouche,
  dessinerSurcoucheFrise,
  FORMATS_STUDIO,
  type ContexteImage,
  type Frise,
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
    miniatureStudio: (m: { texte: string; accent: string }) => string;
    preparerFrise: (e: {
      frise: Frise;
      lignes: LigneSousTitre[];
      theme: ThemeStudio & { fond: string };
      police: string;
    }) => Promise<void>;
    imageFrise: (t: number) => string;
    dessousFrise: (t: number) => string;
    fondUniFrise: () => string;
    cartonFrise: (texte: string) => string;
    miniatureFrise: (m: { texte: string; accent: string }) => string;
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

window.miniatureStudio = (m) => {
  if (!etat || !ctx || !canevas) throw new Error('surcouche non préparée');
  ctx.clearRect(0, 0, canevas.width, canevas.height);
  dessinerMiniature(ctx as unknown as Contexte2D, m, etat.plan.format, etat.theme);
  return canevas.toDataURL('image/png');
};

let frise: Parameters<Window['preparerFrise']>[0] | null = null;

window.preparerFrise = async (e) => {
  frise = e;
  const { largeur, hauteur } = FORMATS_STUDIO[e.frise.format];
  await window.preparerStudio({
    plan: null as never,
    lignes: e.lignes,
    theme: e.theme,
    police: e.police,
    largeur,
    hauteur,
  });
};

/** Effets et sous-titres de la frise à l'instant `t`, sur fond transparent. */
window.imageFrise = (t) => {
  if (!frise || !ctx || !canevas) throw new Error('surcouche non préparée');
  ctx.clearRect(0, 0, canevas.width, canevas.height);
  dessinerSurcoucheFrise(
    ctx as unknown as ContexteImage,
    frise.frise,
    t,
    frise.lignes,
    frise.theme,
  );
  return canevas.toDataURL('image/png');
};

/**
 * Dessous des pistes vidéo à l'instant `t` (fond animé et appareil), opaque ; chaîne vide quand
 * aucun écran n'est dans un appareil (le robot reprend alors une image de fond uni).
 */
window.dessousFrise = (t) => {
  if (!frise || !ctx || !canevas) throw new Error('surcouche non préparée');
  if (!appareilsVisibles(frise.frise, t).length) return '';
  dessinerDessousFrise(ctx as unknown as ContexteImage, frise.frise, t, frise.theme);
  return canevas.toDataURL('image/png');
};

/** Image de fond uni (le dessous quand aucun appareil n'est à l'image). */
window.fondUniFrise = () => {
  if (!frise || !ctx || !canevas) throw new Error('surcouche non préparée');
  ctx.fillStyle = frise.theme.sombre;
  ctx.fillRect(0, 0, canevas.width, canevas.height);
  return canevas.toDataURL('image/png');
};

/** Carton plein cadre, texte posé (image fixe bouclée par ffmpeg). */
window.cartonFrise = (texte) => {
  if (!frise || !ctx || !canevas) throw new Error('surcouche non préparée');
  ctx.clearRect(0, 0, canevas.width, canevas.height);
  dessinerCarton(
    ctx as unknown as ContexteImage,
    frise.frise.format,
    texte,
    1_500,
    60_000,
    { x: 0, y: 0, largeur: canevas.width, hauteur: canevas.height },
    frise.theme,
  );
  return canevas.toDataURL('image/png');
};

/** Texte de la miniature au format de la frise. */
window.miniatureFrise = (m) => {
  if (!frise || !ctx || !canevas) throw new Error('surcouche non préparée');
  ctx.clearRect(0, 0, canevas.width, canevas.height);
  dessinerMiniature(ctx as unknown as Contexte2D, m, frise.frise.format, frise.theme);
  return canevas.toDataURL('image/png');
};
