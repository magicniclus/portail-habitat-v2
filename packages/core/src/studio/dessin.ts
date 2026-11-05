import { formatEuros } from '../format';
import { FORMATS_STUDIO, type FormatStudio } from './formats';
import type { Rectangle } from './montage';
import type { Calque } from './plan';
import type { LigneSousTitre } from './sousTitres';

/**
 * Calques 2D du Studio (textes, compteurs, notifications…) dessinés image par image sur un
 * canevas. La même fonction sert à l'aperçu (navigateur) et au rendu final (serveur) : ce que
 * l'on voit est ce que l'on obtient. Les couleurs viennent du thème (tokens de @ph/ui).
 */

/** Sous-ensemble de CanvasRenderingContext2D utilisé (navigateur et @napi-rs/canvas). */
export interface Contexte2D {
  fillStyle: unknown;
  strokeStyle: unknown;
  lineWidth: number;
  lineJoin: string;
  font: string;
  textAlign: string;
  textBaseline: string;
  globalAlpha: number;
  shadowColor: string;
  shadowBlur: number;
  save(): void;
  restore(): void;
  translate(x: number, y: number): void;
  scale(x: number, y: number): void;
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  closePath(): void;
  arc(x: number, y: number, r: number, a: number, b: number): void;
  fill(): void;
  stroke(): void;
  fillRect(x: number, y: number, l: number, h: number): void;
  fillText(t: string, x: number, y: number): void;
  strokeText(t: string, x: number, y: number): void;
  measureText(t: string): { width: number };
}

export interface ThemeStudio {
  accent: string;
  accentTexte: string;
  sombre: string;
  clair: string;
  succes: string;
  police: string;
}

const ENTREE = 280;
const SORTIE = 200;

/** Courbe d'entrée (rebond léger) et de sortie, de 0 à 1. */
export function progression(
  t: number,
  debut: number,
  fin: number,
): { entree: number; alpha: number } {
  if (t < debut || t >= fin) return { entree: 0, alpha: 0 };
  const e = Math.min(1, (t - debut) / ENTREE);
  const s = Math.min(1, (fin - t) / SORTIE);
  // easeOutBack : petit dépassement, très lisible sur téléphone.
  const c = 1.4;
  const entree = 1 + (c + 1) * (e - 1) ** 3 + c * (e - 1) ** 2;
  return { entree, alpha: Math.min(e * 2, 1) * s };
}

const lisse = (x: number) => 1 - (1 - Math.min(1, Math.max(0, x))) ** 3;

function pastille(ctx: Contexte2D, x: number, y: number, l: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + l - r, y);
  ctx.arc(x + l - r, y + r, r, -Math.PI / 2, 0);
  ctx.lineTo(x + l, y + h - r);
  ctx.arc(x + l - r, y + h - r, r, 0, Math.PI / 2);
  ctx.lineTo(x + r, y + h);
  ctx.arc(x + r, y + h - r, r, Math.PI / 2, Math.PI);
  ctx.lineTo(x, y + r);
  ctx.arc(x + r, y + r, r, Math.PI, Math.PI * 1.5);
  ctx.closePath();
  ctx.fill();
}

/** Coupe un texte en lignes qui tiennent dans `largeur`. */
function lignes(ctx: Contexte2D, texte: string, largeur: number): string[] {
  const r: string[] = [];
  let l = '';
  for (const mot of texte.split(/\s+/)) {
    const essai = l ? `${l} ${mot}` : mot;
    if (l && ctx.measureText(essai).width > largeur) {
      r.push(l);
      l = mot;
    } else l = essai;
  }
  if (l) r.push(l);
  return r;
}

function yPosition(position: 'haut' | 'centre' | 'bas', zone: Rectangle, hauteur: number) {
  if (position === 'haut') return zone.y + zone.hauteur * 0.12;
  if (position === 'centre') return zone.y + (zone.hauteur - hauteur) / 2;
  return zone.y + zone.hauteur * 0.78 - hauteur;
}

const nombre = (n: number) => new Intl.NumberFormat('fr-FR').format(n);

function dessinerUn(
  ctx: Contexte2D,
  c: Calque,
  t: number,
  zone: Rectangle,
  k: number,
  th: ThemeStudio,
) {
  const { entree, alpha } = progression(t, c.debut, c.fin);
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  const cx = zone.x + zone.largeur / 2;
  const marge = 60 * k;
  switch (c.type) {
    case 'texte': {
      const taille = { accroche: 86, titre: 64, chiffre: 150, note: 42 }[c.style] * k;
      ctx.font = `800 ${taille}px ${th.police}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const ls = lignes(ctx, c.texte, zone.largeur - marge * 2);
      const interligne = taille * 1.12;
      const h = ls.length * interligne;
      const y = yPosition(c.position, zone, h);
      ctx.translate(cx, y + h / 2);
      ctx.scale(entree, entree);
      ctx.translate(-cx, -(y + h / 2));
      if (c.style === 'accroche' || c.style === 'note') {
        const l = Math.max(...ls.map((x) => ctx.measureText(x).width)) + 56 * k;
        ctx.fillStyle = c.style === 'accroche' ? th.accent : th.sombre;
        pastille(ctx, cx - l / 2, y - 20 * k, l, h + 40 * k, 28 * k);
        ctx.fillStyle = c.style === 'accroche' ? th.accentTexte : th.clair;
      } else {
        ctx.lineJoin = 'round';
        ctx.lineWidth = 14 * k;
        ctx.strokeStyle = th.sombre;
        ls.forEach((x, i) => ctx.strokeText(x, cx, y + i * interligne));
        ctx.fillStyle = c.style === 'chiffre' ? th.accent : th.clair;
      }
      ls.forEach((x, i) => ctx.fillText(x, cx, y + i * interligne));
      break;
    }
    case 'compteur': {
      const avance = lisse((t - c.debut) / Math.max(1, (c.fin - c.debut) * 0.6));
      const v = Math.round(c.de + (c.a - c.de) * avance);
      const texte = c.euros ? formatEuros(v) : nombre(v);
      const taille = 150 * k;
      const h = taille + 70 * k;
      const y = yPosition(c.position, zone, h);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.font = `900 ${taille}px ${th.police}`;
      ctx.lineJoin = 'round';
      ctx.lineWidth = 16 * k;
      ctx.strokeStyle = th.sombre;
      ctx.strokeText(texte, cx, y);
      ctx.fillStyle = th.accent;
      ctx.fillText(texte, cx, y);
      ctx.font = `700 ${48 * k}px ${th.police}`;
      ctx.lineWidth = 10 * k;
      ctx.strokeText(c.libelle, cx, y + taille + 10 * k);
      ctx.fillStyle = th.clair;
      ctx.fillText(c.libelle, cx, y + taille + 10 * k);
      break;
    }
    case 'notification': {
      const l = zone.largeur - marge * 2;
      const h = 190 * k;
      const y = zone.y + 70 * k - (1 - entree) * 260 * k;
      ctx.shadowColor = 'rgba(0,0,0,0.35)';
      ctx.shadowBlur = 40 * k;
      ctx.fillStyle = th.clair;
      pastille(ctx, zone.x + marge, y, l, h, 36 * k);
      ctx.shadowBlur = 0;
      ctx.fillStyle = th.accent;
      pastille(ctx, zone.x + marge + 30 * k, y + 40 * k, 110 * k, 110 * k, 26 * k);
      // Maison stylisée (logo) dans la pastille.
      ctx.strokeStyle = th.accentTexte;
      ctx.lineWidth = 9 * k;
      ctx.lineJoin = 'round';
      const ix = zone.x + marge + 85 * k;
      const iy = y + 95 * k;
      ctx.beginPath();
      ctx.moveTo(ix - 32 * k, iy - 2 * k);
      ctx.lineTo(ix, iy - 30 * k);
      ctx.lineTo(ix + 32 * k, iy - 2 * k);
      ctx.moveTo(ix - 22 * k, iy - 8 * k);
      ctx.lineTo(ix - 22 * k, iy + 28 * k);
      ctx.lineTo(ix + 22 * k, iy + 28 * k);
      ctx.lineTo(ix + 22 * k, iy - 8 * k);
      ctx.stroke();
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillStyle = th.sombre;
      ctx.font = `800 ${46 * k}px ${th.police}`;
      ctx.fillText(c.titre, zone.x + marge + 170 * k, y + 38 * k);
      ctx.font = `500 ${38 * k}px ${th.police}`;
      const [premiere] = lignes(ctx, c.texte, l - 200 * k);
      ctx.fillText(premiere ?? '', zone.x + marge + 170 * k, y + 100 * k);
      break;
    }
    case 'liste': {
      const taille = 52 * k;
      const pas = taille * 1.9;
      const h = c.elements.length * pas;
      const y = yPosition(c.position, zone, h);
      const duree = c.fin - c.debut;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.font = `800 ${taille}px ${th.police}`;
      c.elements.forEach((e, i) => {
        const apparait = c.debut + (i * duree * 0.6) / c.elements.length;
        if (t < apparait) return;
        const a = lisse((t - apparait) / 250);
        ctx.globalAlpha = alpha * a;
        const yi = y + i * pas;
        ctx.fillStyle = th.sombre;
        pastille(ctx, zone.x + marge, yi, zone.largeur - marge * 2, pas - 18 * k, 24 * k);
        ctx.fillStyle = th.succes;
        ctx.beginPath();
        ctx.arc(zone.x + marge + 55 * k, yi + (pas - 18 * k) / 2, 30 * k, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = th.clair;
        ctx.fillText('✓', zone.x + marge + 38 * k, yi + (pas - 18 * k) / 2);
        ctx.fillText(e, zone.x + marge + 110 * k, yi + (pas - 18 * k) / 2);
      });
      break;
    }
    case 'barre': {
      const l = zone.largeur - marge * 2;
      const h = 150 * k;
      const y = yPosition(c.position, zone, h);
      const avance = lisse((t - c.debut) / Math.max(1, (c.fin - c.debut) * 0.6)) * (c.valeur / 100);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.font = `800 ${46 * k}px ${th.police}`;
      ctx.lineJoin = 'round';
      ctx.lineWidth = 10 * k;
      ctx.strokeStyle = th.sombre;
      ctx.strokeText(c.libelle, zone.x + marge, y);
      ctx.fillStyle = th.clair;
      ctx.fillText(c.libelle, zone.x + marge, y);
      ctx.fillStyle = th.sombre;
      pastille(ctx, zone.x + marge, y + 70 * k, l, 56 * k, 28 * k);
      ctx.fillStyle = th.accent;
      if (avance > 0)
        pastille(ctx, zone.x + marge, y + 70 * k, Math.max(56 * k, l * avance), 56 * k, 28 * k);
      break;
    }
    case 'fleche': {
      const x = zone.x + c.x * zone.largeur;
      const y = zone.y + c.y * zone.hauteur;
      const recul = (1 - entree) * 120 * k + Math.sin(t / 160) * 10 * k;
      ctx.translate(x, y + recul);
      ctx.fillStyle = th.accent;
      ctx.strokeStyle = th.sombre;
      ctx.lineWidth = 8 * k;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-55 * k, 80 * k);
      ctx.lineTo(-20 * k, 80 * k);
      ctx.lineTo(-20 * k, 170 * k);
      ctx.lineTo(20 * k, 170 * k);
      ctx.lineTo(20 * k, 80 * k);
      ctx.lineTo(55 * k, 80 * k);
      ctx.closePath();
      ctx.stroke();
      ctx.fill();
      break;
    }
    case 'surlignage': {
      const x = zone.x + c.x * zone.largeur;
      const y = zone.y + c.y * zone.hauteur;
      const l = c.largeur * zone.largeur;
      const h = c.hauteur * zone.hauteur;
      const e = 1 + (1 - entree) * 0.25;
      ctx.translate(x + l / 2, y + h / 2);
      ctx.scale(e, e);
      ctx.strokeStyle = th.accent;
      ctx.lineWidth = 10 * k;
      ctx.beginPath();
      ctx.moveTo(-l / 2, -h / 2);
      ctx.lineTo(l / 2, -h / 2);
      ctx.lineTo(l / 2, h / 2);
      ctx.lineTo(-l / 2, h / 2);
      ctx.closePath();
      ctx.stroke();
      break;
    }
  }
  ctx.restore();
}

/** Calques d'un plan à l'instant `tPlan` (ms depuis le début du plan). */
export function dessinerCalques(
  ctx: Contexte2D,
  calques: readonly Calque[],
  tPlan: number,
  format: FormatStudio,
  zone: Rectangle,
  theme: ThemeStudio,
) {
  const k = Math.min(FORMATS_STUDIO[format].largeur, FORMATS_STUDIO[format].hauteur) / 1080;
  for (const c of calques) dessinerUn(ctx, c, tPlan, zone, k, theme);
}

/**
 * Sous-titre karaoké : la ligne en cours, le mot prononcé en couleur d'accent. Placé au-dessus de
 * la caméra quand elle est en bas.
 */
export function dessinerSousTitre(
  ctx: Contexte2D,
  ligne: LigneSousTitre | undefined,
  t: number,
  format: FormatStudio,
  basZone: number,
  theme: ThemeStudio,
) {
  if (!ligne || t < ligne.debut || t > ligne.fin + 120) return;
  const { largeur } = FORMATS_STUDIO[format];
  const k = Math.min(largeur, FORMATS_STUDIO[format].hauteur) / 1080;
  const textes = ligne.mots.map((m) => m.texte.toUpperCase());
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = theme.sombre;
  // Taille réduite si la ligne dépasse 90 % de la largeur : jamais de mot coupé au bord.
  let taille = 70 * k;
  const mesurer = () => {
    ctx.font = `900 ${taille}px ${theme.police}`;
    const espace = Math.max(ctx.measureText(' ').width, taille * 0.28);
    const total =
      textes.reduce((n, x) => n + ctx.measureText(x).width, 0) + espace * (textes.length - 1);
    return { espace, total };
  };
  let { espace, total } = mesurer();
  if (total > largeur * 0.9) {
    taille *= (largeur * 0.9) / total;
    ({ espace, total } = mesurer());
  }
  ctx.lineWidth = taille * 0.22;
  let x = (largeur - total) / 2;
  const y = basZone - 90 * k;
  ligne.mots.forEach((m, i) => {
    const txt = textes[i]!;
    const actif = t >= m.debut && t < (ligne.mots[i + 1]?.debut ?? ligne.fin + 120);
    const pop = actif ? 1 + 0.08 * (1 - lisse((t - m.debut) / 120)) : 1;
    const l = ctx.measureText(txt).width;
    ctx.save();
    ctx.translate(x + l / 2, y);
    ctx.scale(pop, pop);
    ctx.strokeText(txt, -l / 2, 0);
    ctx.fillStyle = actif ? theme.accent : theme.clair;
    ctx.fillText(txt, -l / 2, 0);
    ctx.restore();
    x += l + espace;
  });
  ctx.restore();
}
