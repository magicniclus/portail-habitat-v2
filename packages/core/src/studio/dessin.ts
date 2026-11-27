import { formatEuros } from '../format';
import { FORMATS_STUDIO, type FormatStudio } from './formats';
import type { Rectangle } from './montage';
import type { EntreeAnimee } from './catalogue';
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
  rotate(angle: number): void;
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

/** Rectangle aux coins arrondis, rempli. */
export function pastille(ctx: Contexte2D, x: number, y: number, l: number, h: number, r: number) {
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
  const base = progression(t, c.debut, c.fin);
  if (base.alpha <= 0) return;
  // Entrée choisie : elle remplace l'animation d'arrivée propre à l'élément.
  const choisie = c.entree ? entreeAnimee(c.entree, t - c.debut) : null;
  const entree = choisie ? 1 : base.entree;
  const alpha = choisie ? choisie.alpha * Math.min(1, (c.fin - t) / SORTIE) : base.alpha;
  ctx.save();
  ctx.globalAlpha = alpha;
  const cx = zone.x + zone.largeur / 2;
  const marge = 60 * k;
  if (choisie) {
    const cy = zone.y + zone.hauteur / 2;
    ctx.translate(cx + choisie.dx * k, cy + choisie.dy * k);
    if (choisie.angle) ctx.rotate(choisie.angle);
    ctx.scale(choisie.echelle, choisie.echelle);
    ctx.translate(-cx, -cy);
  }
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
    case 'demandes': {
      const l = Math.min(zone.largeur - marge * 2, 980 * k);
      const hc = 168 * k;
      const pas = hc + 26 * k;
      const h = c.elements.length * pas;
      const y = yPosition(c.position, zone, h);
      const x = cx - l / 2;
      c.elements.forEach((d, i) => {
        const e = arrivee(t, c, i, c.elements.length);
        if (e <= 0) return;
        const doux = 1 - (1 - e) ** 3;
        ctx.save();
        ctx.globalAlpha = alpha * Math.min(1, e * 2);
        ctx.translate((1 - doux) * 320 * k, y + i * pas);
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = 36 * k;
        ctx.fillStyle = th.clair;
        pastille(ctx, x, 0, l, hc, 30 * k);
        ctx.shadowBlur = 0;
        ctx.fillStyle = th.accent;
        pastille(ctx, x + 26 * k, 26 * k, hc - 52 * k, hc - 52 * k, 24 * k);
        maison(
          ctx,
          x + hc / 2,
          hc / 2,
          hc * 0.62,
          { ...th, accent: th.accentTexte },
          th.accentTexte,
        );
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillStyle = th.accent;
        ctx.font = `800 ${30 * k}px ${th.police}`;
        ctx.fillText('NOUVELLE DEMANDE', x + hc + 6 * k, 28 * k);
        ctx.fillStyle = th.sombre;
        ctx.font = `800 ${46 * k}px ${th.police}`;
        ctx.fillText(d.titre, x + hc + 6 * k, 66 * k);
        ctx.globalAlpha *= 0.7;
        ctx.font = `600 ${32 * k}px ${th.police}`;
        ctx.fillText(d.ville, x + hc + 6 * k, 120 * k);
        ctx.restore();
      });
      break;
    }
    case 'outils': {
      const colonnes = zone.largeur > zone.hauteur ? 3 : 2;
      const rangees = Math.ceil(c.elements.length / colonnes);
      const ecart = 28 * k;
      const lt = Math.min(360 * k, (zone.largeur - marge * 2 - ecart * (colonnes - 1)) / colonnes);
      const ht = 190 * k;
      const h = rangees * ht + (rangees - 1) * ecart;
      const y = yPosition(c.position, zone, h);
      const x0 = cx - (colonnes * lt + (colonnes - 1) * ecart) / 2;
      c.elements.forEach((nom, i) => {
        const e = rebond(arrivee(t, c, i, c.elements.length, 480));
        if (e <= 0) return;
        const x = x0 + (i % colonnes) * (lt + ecart);
        const yi = y + Math.floor(i / colonnes) * (ht + ecart);
        ctx.save();
        ctx.translate(x + lt / 2, yi + ht / 2);
        ctx.scale(e, e);
        ctx.translate(-(x + lt / 2), -(yi + ht / 2));
        ctx.shadowColor = 'rgba(0,0,0,0.25)';
        ctx.shadowBlur = 30 * k;
        ctx.fillStyle = th.clair;
        pastille(ctx, x, yi, lt, ht, 28 * k);
        ctx.shadowBlur = 0;
        ctx.fillStyle = th.accent;
        ctx.beginPath();
        ctx.arc(x + lt / 2, yi + 62 * k, 36 * k, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = th.accentTexte;
        ctx.lineWidth = 8 * k;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(x + lt / 2 - 16 * k, yi + 62 * k);
        ctx.lineTo(x + lt / 2 - 4 * k, yi + 74 * k);
        ctx.lineTo(x + lt / 2 + 18 * k, yi + 50 * k);
        ctx.stroke();
        ctx.fillStyle = th.sombre;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.font = `800 ${38 * k}px ${th.police}`;
        const [premiere, seconde] = lignes(ctx, nom, lt - 30 * k);
        ctx.fillText(premiere ?? '', x + lt / 2, yi + 112 * k);
        if (seconde) {
          ctx.font = `700 ${30 * k}px ${th.police}`;
          ctx.fillText(seconde, x + lt / 2, yi + 150 * k);
        }
        ctx.restore();
      });
      break;
    }
    case 'tampon': {
      const e = Math.min(1, (t - c.debut) / 380);
      const doux = 1 - (1 - e) ** 3;
      const taille = 120 * k;
      ctx.font = `900 ${taille}px ${th.police}`;
      const l = ctx.measureText(c.texte.toUpperCase()).width + 90 * k;
      const h = taille + 70 * k;
      const y = yPosition(c.position, zone, h) + h / 2;
      ctx.translate(cx, y);
      ctx.rotate(-0.1 - (c.entree ? 0 : (1 - doux) * 0.12));
      const ech = c.entree ? 1 : 1 + (1 - doux) * 1.2;
      ctx.scale(ech, ech);
      ctx.globalAlpha = alpha * (c.entree ? 1 : Math.min(1, e * 3));
      ctx.fillStyle = th.clair;
      pastille(ctx, -l / 2, -h / 2, l, h, 22 * k);
      ctx.strokeStyle = th.accent;
      ctx.lineWidth = 12 * k;
      ctx.beginPath();
      ctx.moveTo(-l / 2 + 22 * k, -h / 2 + 14 * k);
      ctx.lineTo(l / 2 - 22 * k, -h / 2 + 14 * k);
      ctx.moveTo(-l / 2 + 22 * k, h / 2 - 14 * k);
      ctx.lineTo(l / 2 - 22 * k, h / 2 - 14 * k);
      ctx.stroke();
      ctx.fillStyle = th.accent;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(c.texte.toUpperCase(), 0, 6 * k);
      break;
    }
    case 'comparaison': {
      const cote = zone.largeur > zone.hauteur;
      const l = cote ? (zone.largeur - marge * 3) / 2 : zone.largeur - marge * 2;
      const hc = 300 * k;
      const total = cote ? hc : hc * 2 + 40 * k;
      const y0 = yPosition('centre', zone, total);
      const cartes = [
        { titre: 'AVANT', texte: c.avant, fond: th.sombre, encre: th.clair, i: 0 },
        { titre: 'APRÈS', texte: c.apres, fond: th.accent, encre: th.accentTexte, i: 1 },
      ];
      for (const x of cartes) {
        const e = arrivee(t, c, x.i, 2, 450);
        if (e <= 0) continue;
        const doux = 1 - (1 - e) ** 3;
        const px = cote ? zone.x + marge + x.i * (l + marge) : zone.x + marge;
        const py = cote ? y0 : y0 + x.i * (hc + 40 * k);
        ctx.save();
        ctx.globalAlpha = alpha * Math.min(1, e * 2);
        ctx.translate(0, (1 - doux) * 80 * k);
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = 36 * k;
        ctx.fillStyle = x.fond;
        pastille(ctx, px, py, l, hc, 32 * k);
        ctx.shadowBlur = 0;
        ctx.fillStyle = x.encre;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.globalAlpha *= 0.75;
        ctx.font = `900 ${34 * k}px ${th.police}`;
        ctx.fillText(x.titre, px + 40 * k, py + 36 * k);
        ctx.globalAlpha = alpha * Math.min(1, e * 2);
        ctx.font = `800 ${54 * k}px ${th.police}`;
        const ls = lignes(ctx, x.texte, l - 80 * k).slice(0, 3);
        ls.forEach((ligne, j) => ctx.fillText(ligne, px + 40 * k, py + 96 * k + j * 62 * k));
        if (x.i === 0 && doux > 0.5) {
          // L'avant est barré.
          ctx.strokeStyle = th.accent;
          ctx.lineWidth = 8 * k;
          ctx.beginPath();
          ctx.moveTo(px + 34 * k, py + 96 * k + ls.length * 31 * k);
          ctx.lineTo(
            px + 34 * k + (l - 68 * k) * Math.min(1, (doux - 0.5) * 2),
            py + 96 * k + ls.length * 31 * k,
          );
          ctx.stroke();
        }
        ctx.restore();
      }
      break;
    }
    case 'fin': {
      ctx.fillStyle = th.sombre;
      ctx.fillRect(zone.x, zone.y, zone.largeur, zone.hauteur);
      const parties = [0, 1, 2].map((i) => 1 - (1 - arrivee(t, c, i, 3, 500)) ** 3);
      const y = zone.y + zone.hauteur * 0.34;
      ctx.save();
      ctx.globalAlpha = alpha * parties[0]!;
      maison(ctx, cx, y - (1 - parties[0]!) * 40 * k, 220 * k, th, th.clair);
      ctx.restore();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.globalAlpha = alpha * parties[1]!;
      ctx.fillStyle = th.clair;
      ctx.font = `800 ${72 * k}px ${th.police}`;
      const ls = lignes(ctx, c.titre, zone.largeur - marge * 3).slice(0, 3);
      const y1 = y + 170 * k + (1 - parties[1]!) * 60 * k;
      ls.forEach((ligne, i) => ctx.fillText(ligne, cx, y1 + i * 82 * k));
      ctx.globalAlpha = alpha * parties[2]!;
      ctx.font = `800 ${46 * k}px ${th.police}`;
      const lb = ctx.measureText(c.bouton).width + 100 * k;
      const yb = y1 + ls.length * 82 * k + 50 * k + (1 - parties[2]!) * 60 * k;
      ctx.fillStyle = th.accent;
      pastille(ctx, cx - lb / 2, yb, lb, 104 * k, 52 * k);
      ctx.fillStyle = th.accentTexte;
      ctx.textBaseline = 'middle';
      ctx.fillText(c.bouton, cx, yb + 54 * k);
      break;
    }
  }
  ctx.restore();
}

/**
 * Entrée animée choisie, à `local` ms du début de l'élément : décalage (px à l'échelle 1080),
 * échelle, angle et opacité. Douce par défaut (public : des artisans).
 */
export function entreeAnimee(
  type: EntreeAnimee,
  local: number,
): { dx: number; dy: number; echelle: number; angle: number; alpha: number } {
  const duree = type === 'tampon' ? 380 : type === 'fondu' ? 600 : 520;
  const e = Math.min(1, Math.max(0, local / duree));
  const doux = 1 - (1 - e) ** 3;
  const r = { dx: 0, dy: 0, echelle: 1, angle: 0, alpha: Math.min(1, e * 1.6) };
  if (type === 'monte') r.dy = (1 - doux) * 90;
  if (type === 'glisse') r.dx = (doux - 1) * 240;
  if (type === 'zoom') r.echelle = 0.86 + 0.14 * doux;
  if (type === 'fondu') r.alpha = doux;
  if (type === 'tampon') {
    r.echelle = 1 + (1 - doux) * 1.2;
    r.angle = (doux - 1) * 0.12;
    r.alpha = Math.min(1, e * 3);
  }
  return r;
}

/** Logo (maison) : toit et porte couleur d'accent, murs de la couleur donnée. */
function maison(
  ctx: Contexte2D,
  x: number,
  y: number,
  taille: number,
  th: ThemeStudio,
  murs: string,
) {
  const u = taille / 40;
  ctx.save();
  ctx.translate(x - taille / 2, y - taille / 2);
  ctx.lineWidth = 3.2 * u;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = th.accent;
  ctx.beginPath();
  ctx.moveTo(5 * u, 19.5 * u);
  ctx.lineTo(20 * u, 7 * u);
  ctx.lineTo(35 * u, 19.5 * u);
  ctx.stroke();
  ctx.strokeStyle = murs;
  ctx.beginPath();
  ctx.moveTo(9 * u, 21.5 * u);
  ctx.lineTo(9 * u, 33 * u);
  ctx.lineTo(31 * u, 33 * u);
  ctx.lineTo(31 * u, 21.5 * u);
  ctx.stroke();
  ctx.fillStyle = th.accent;
  ctx.fillRect(17 * u, 25 * u, 6 * u, 8 * u);
  ctx.restore();
}

/** Arrivée décalée d'un élément d'une suite (0 à 1), de `i` sur `n` dans la première moitié. */
const arrivee = (t: number, c: { debut: number; fin: number }, i: number, n: number, ms = 420) => {
  const depart = c.debut + (i * (c.fin - c.debut) * 0.5) / Math.max(1, n);
  return Math.min(1, Math.max(0, (t - depart) / ms));
};
const rebond = (e: number) => (e <= 0 ? 0 : 1 + 2.4 * (e - 1) ** 3 + 1.4 * (e - 1) ** 2);

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

/**
 * Miniature (image de couverture) : par-dessus l'image choisie, un dégradé sombre en bas et le
 * texte en très gros, le mot mis en avant en couleur d'accent.
 */
export function dessinerMiniature(
  ctx: Contexte2D,
  m: { texte: string; accent: string },
  format: FormatStudio,
  theme: ThemeStudio,
) {
  const { largeur, hauteur } = FORMATS_STUDIO[format];
  const k = Math.min(largeur, hauteur) / 1080;
  ctx.save();
  const bandes = 24;
  for (let i = 0; i < bandes; i++) {
    ctx.globalAlpha = (i / bandes) * 0.85;
    ctx.fillStyle = theme.sombre;
    ctx.fillRect(
      0,
      hauteur * 0.45 + (i * hauteur * 0.55) / bandes,
      largeur,
      (hauteur * 0.55) / bandes + 1,
    );
  }
  ctx.globalAlpha = 1;
  let taille = 150 * k;
  ctx.font = `900 ${taille}px ${theme.police}`;
  const mots = m.texte.toUpperCase().split(/\s+/);
  let ls = lignes(ctx, mots.join(' '), largeur * 0.88);
  while (ls.length > 3 && taille > 70 * k) {
    taille -= 10 * k;
    ctx.font = `900 ${taille}px ${theme.police}`;
    ls = lignes(ctx, mots.join(' '), largeur * 0.88);
  }
  const accent = m.accent.toUpperCase();
  const interligne = taille * 1.02;
  const y0 = hauteur * 0.9 - ls.length * interligne;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.lineJoin = 'round';
  ctx.lineWidth = taille * 0.16;
  ctx.strokeStyle = theme.sombre;
  ls.forEach((ligne, i) => {
    const largeurLigne = ctx.measureText(ligne).width;
    let x = (largeur - largeurLigne) / 2;
    const y = y0 + i * interligne;
    for (const mot of ligne.split(' ')) {
      const l = ctx.measureText(mot).width;
      ctx.strokeText(mot, x, y);
      ctx.fillStyle =
        accent && mot.replace(/[^\p{L}\p{N}]/gu, '') === accent.replace(/[^\p{L}\p{N}]/gu, '')
          ? theme.accent
          : theme.clair;
      ctx.fillText(mot, x, y);
      x += l + ctx.measureText(' ').width;
    }
  });
  ctx.restore();
}
