'use client';

import { TEXTURE_COUVERTURE, texturePhoto, type Revetement } from '@ph/core/dessin';
import { COULEURS_3D, MATERIAUX_DESSIN } from '@ph/ui/tokens';
import {
  DoubleSide,
  CanvasTexture,
  MeshStandardMaterial,
  RepeatWrapping,
  SRGBColorSpace,
  TextureLoader,
  Vector2,
  type Texture,
} from 'three';

/**
 * Matériaux 3D des revêtements (DES-26 en 3D) : couleur du matériau, et pour les carrelages et
 * parquets une texture dessinée à l'échelle réelle (un motif = un carreau ou deux rangs de lames,
 * répété au mètre près). Les UV des géométries sont en mètres.
 */
const CARREAUX = new Set(['carrelage', 'faience', 'pierre', 'dalle', 'parement']);
const LAMES = new Set(['parquet', 'stratifie', 'vinyle', 'bois', 'composite', 'bardage']);

const materiau = (r: Revetement) => MATERIAUX_DESSIN.find((m) => m.id === r.materiauId);
const couleurRevetement = (r: Revetement, defaut: string = COULEURS_3D.mur) =>
  r.famille === 'aucun' ? defaut : (r.couleur ?? materiau(r)?.couleur ?? defaut);

const cache = new Map<string, MeshStandardMaterial>();

function texture(r: Revetement, couleur: string): CanvasTexture | null {
  const lames = LAMES.has(r.famille);
  if (!lames && !CARREAUX.has(r.famille)) return null;
  const f = r.format ?? materiau(r)?.format ?? (lames ? { l: 1200, p: 180 } : { l: 600, p: 600 });
  const decale = (r.pose ?? (lames ? 'decalee' : 'droite')) !== 'droite';
  const joint = r.joint?.couleur ?? materiau(r)?.joint ?? COULEURS_3D.tranche;
  const canvas = document.createElement('canvas');
  // 256 px pour la largeur d'un élément : net sans peser lourd.
  const rangs = decale ? 2 : 1;
  const h = Math.min(512, Math.max(16, Math.round((256 * f.p) / f.l)));
  canvas.width = 256;
  canvas.height = h * rangs;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = couleur;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = joint;
  ctx.lineWidth = Math.max(2, ((r.joint?.largeur ?? 3) / f.l) * canvas.width);
  for (let i = 0; i < rangs; i++) {
    ctx.strokeRect(i % 2 ? -canvas.width / 2 : 0, i * h, canvas.width, h);
    if (i % 2) ctx.strokeRect(canvas.width / 2, i * h, canvas.width, h);
  }
  const t = new CanvasTexture(canvas);
  t.wrapS = RepeatWrapping;
  t.wrapT = RepeatWrapping;
  t.colorSpace = SRGBColorSpace;
  t.repeat.set(1000 / f.l, 1000 / (f.p * rangs));
  if (
    r.pose === 'diagonale' ||
    r.pose === 'chevron' ||
    r.pose === 'point_de_hongrie' ||
    r.pose === 'baton_rompu'
  )
    t.rotation = Math.PI / 4;
  return t;
}

/** Peinture (DES-25) : plus la finition est brillante, plus la lumière s'y reflète. */
const RUGOSITE_PEINTURE = { mat: 0.95, satin: 0.55, brillant: 0.2 } as const;

const chargeur = new TextureLoader();
const images = new Map<string, Texture>();
const DIAGONALES = new Set(['diagonale', 'chevron', 'point_de_hongrie', 'baton_rompu']);

/** Image d'une texture photo, chargée une fois, répétée à sa taille réelle (UV en mètres). */
function image(url: string, tailleMm: number, couleur: boolean, pose?: string): Texture {
  const cle = `${url}|${pose ?? ''}`;
  let t = images.get(cle);
  if (!t) {
    t = chargeur.load(url);
    t.wrapS = RepeatWrapping;
    t.wrapT = RepeatWrapping;
    if (couleur) t.colorSpace = SRGBColorSpace;
    t.repeat.set(1000 / tailleMm, 1000 / tailleMm);
    if (pose && DIAGONALES.has(pose)) t.rotation = Math.PI / 4;
    images.set(cle, t);
  }
  return t;
}

/**
 * Revêtement avec texture photo (D88) : couleur, relief et rugosité réels ; sinon `null`
 * et le motif dessiné prend le relais.
 */
function materiauPhoto(r: Revetement): MeshStandardMaterial | null {
  const p = texturePhoto(r.materiauId);
  if (!p) return null;
  return new MeshStandardMaterial({
    color: COULEURS_3D.blanc,
    map: image(p.couleur, p.taille, true, r.pose),
    normalMap: image(p.relief, p.taille, false, r.pose),
    normalScale: new Vector2(1, 1),
    roughnessMap: image(p.rugosite, p.taille, false, r.pose),
  });
}

/** Matériau partagé pour un revêtement (mis en cache : mêmes revêtements → même matériau). */
export function materiauRevetement(r: Revetement, defaut?: string): MeshStandardMaterial {
  const couleur = couleurRevetement(r, defaut);
  const cle = JSON.stringify([
    r.famille,
    couleur,
    r.format,
    r.pose,
    r.joint,
    r.materiauId,
    r.finition,
  ]);
  let m = cache.get(cle);
  if (!m) {
    const photo = materiauPhoto(r);
    if (photo) {
      cache.set(cle, photo);
      return photo;
    }
    const map = texture(r, couleur);
    m = new MeshStandardMaterial({
      color: map ? COULEURS_3D.blanc : couleur,
      map,
      roughness: r.famille === 'peinture' ? RUGOSITE_PEINTURE[r.finition ?? 'mat'] : 0.75,
    });
    cache.set(cle, m);
  }
  return m;
}

export function materiauUni(couleur: string, options: { transparent?: boolean } = {}) {
  const cle = `uni-${couleur}-${options.transparent ? 't' : ''}`;
  let m = cache.get(cle);
  if (!m) {
    m = new MeshStandardMaterial({
      color: couleur,
      roughness: 0.8,
      // Verre clair : on voit au travers, sans masquer ce qui est derrière.
      ...(options.transparent
        ? { transparent: true, opacity: 0.22, depthWrite: false, roughness: 0.05 }
        : {}),
    });
    cache.set(cle, m);
  }
  return m;
}

/**
 * Couverture de toit (DES-16) : tuiles, ardoises ou bac acier en texture photo (rangs dans le
 * sens de la pente), sinon couleur unie (zinc, toit végétalisé). Visible des deux côtés.
 */
export function materiauCouverture(famille: string, couleur: string): MeshStandardMaterial {
  const cle = `couverture-${famille}-${couleur}`;
  let m = cache.get(cle);
  if (!m) {
    const id = TEXTURE_COUVERTURE[famille];
    m = (
      (id && materiauPhoto({ famille: 'aucun', materiauId: id })) ||
      materiauUni(couleur)
    ).clone();
    m.side = DoubleSide;
    cache.set(cle, m);
  }
  return m;
}
