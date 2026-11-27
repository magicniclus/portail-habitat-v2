'use client';

import { COULEURS_EXTERIEUR } from '@ph/ui/tokens';
import {
  CanvasTexture,
  Color,
  DoubleSide,
  MeshStandardMaterial,
  RepeatWrapping,
  SRGBColorSpace,
} from 'three';

/** Côté réel couvert par une image de gazon (m) : la texture se répète à cette échelle. */
const COTE = 2;
let image: HTMLCanvasElement | null = null;
let partage: MeshStandardMaterial | null = null;

/** Hasard reproductible : la pelouse est la même à chaque ouverture. */
function hasard(graine: number) {
  let s = graine;
  return () => {
    s = (s * 1_103_515_245 + 12_345) % 2_147_483_648;
    return s / 2_147_483_648;
  };
}

/**
 * Pelouse en 3D : brins dessinés en plusieurs verts (tons du végétal du plan), sur un fond
 * nuancé, répétés tous les 2 m. Une seule image et un seul matériau en mémoire.
 */
function dessin(): HTMLCanvasElement {
  if (!image) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const base = new Color(COULEURS_EXTERIEUR.vegetal);
    const fonce = new Color(COULEURS_EXTERIEUR.vegetalFonce);
    const clair = new Color(COULEURS_EXTERIEUR.gazon);
    ctx.fillStyle = `#${base.clone().lerp(fonce, 0.35).getHexString()}`;
    ctx.fillRect(0, 0, 256, 256);
    const r = hasard(7);
    for (let i = 0; i < 2_600; i++) {
      const teinte =
        r() < 0.5 ? base.clone().lerp(fonce, r()) : base.clone().lerp(clair, r() * 0.5);
      ctx.strokeStyle = `#${teinte.getHexString()}`;
      ctx.lineWidth = 1 + r();
      const [x, y] = [r() * 256, r() * 256];
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (r() - 0.5) * 4, y - 2 - r() * 5);
      ctx.stroke();
    }
    image = canvas;
  }
  return image;
}

/** Gazon pour une géométrie dont les coordonnées de texture sont en mètres. */
export function materiauGazon(): MeshStandardMaterial {
  if (!partage) {
    const t = new CanvasTexture(dessin());
    t.wrapS = t.wrapT = RepeatWrapping;
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = 4;
    t.repeat.set(1 / COTE, 1 / COTE);
    partage = new MeshStandardMaterial({ map: t, roughness: 1, side: DoubleSide });
  }
  return partage;
}
