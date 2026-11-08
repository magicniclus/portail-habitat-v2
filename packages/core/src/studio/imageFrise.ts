import { dessinerCalques, dessinerSousTitre, type ThemeStudio } from './dessin';
import { FORMATS_STUDIO } from './formats';
import { opaciteClip, type Clip, type Frise, type Piste, type SourceClip } from './frise';
import type { ContexteImage, SourceImage } from './image';
import { couverture, type Rectangle } from './montage';
import type { MotTranscrit } from './plan';
import type { LigneSousTitre } from './sousTitres';

/**
 * Image d'une frise multipistes à l'instant `t` (aperçu de l'éditeur ; même composition pour le
 * rendu) : pistes vidéo de bas en haut (la plus haute devant), chaque clip dans son cadre avec
 * son opacité et ses filtres, puis les effets animés et les sous-titres.
 */

/** Clé de la source d'un clip dans le dictionnaire des images chargées. */
export function cleSource(s: SourceClip): string | null {
  if (s.type === 'media') return `media:${s.mediaId}`;
  if (s.type === 'prise') return `prise:${s.fichier}`;
  if (s.type === 'capture') return `capture:${s.captureId}`;
  return null;
}

/** Temps dans la source (ms) à l'instant `t` de la frise. */
export function tempsSource(c: Clip, t: number): number {
  const debut = 'debutSource' in c.source ? c.source.debutSource : 0;
  return debut + (t - c.debut) * (c.vitesse ?? 1);
}

/** Clips visibles ou audibles à `t`, de la piste du haut à celle du bas. */
export function clipsActifs(f: Pick<Frise, 'pistes'>, t: number): { piste: Piste; clip: Clip }[] {
  return f.pistes.flatMap((piste) =>
    piste.clips
      .filter((c) => t >= c.debut && t < c.debut + c.duree)
      .map((clip) => ({ piste, clip })),
  );
}

/** Filtres image en CSS (aperçu) ; le rendu ffmpeg en donne l'équivalent. */
export function filtreCss(f: Clip['filtres']): string {
  if (!f) return 'none';
  const p: string[] = [];
  if (f.luminosite !== undefined) p.push(`brightness(${1 + f.luminosite})`);
  if (f.contraste !== undefined) p.push(`contrast(${f.contraste})`);
  if (f.saturation !== undefined) p.push(`saturate(${f.saturation})`);
  if (f.noirEtBlanc) p.push('grayscale(1)');
  if (f.flou) p.push(`blur(${f.flou}px)`);
  if (f.chaleur && f.chaleur > 0) p.push(`sepia(${f.chaleur})`);
  return p.length ? p.join(' ') : 'none';
}

/** Place d'un clip dans l'image (pixels) : son cadre, sinon toute l'image. */
export function rectangleClip(format: Frise['format'], clip: Pick<Clip, 'cadre'>): Rectangle {
  const { largeur: L, hauteur: H } = FORMATS_STUDIO[format];
  return clip.cadre
    ? {
        x: Math.round(clip.cadre.x * L),
        y: Math.round(clip.cadre.y * H),
        largeur: Math.round(clip.cadre.largeur * L),
        hauteur: Math.round(clip.cadre.hauteur * H),
      }
    : { x: 0, y: 0, largeur: L, hauteur: H };
}

export function dessinerFrise(
  ctx: ContexteImage & { filter: string },
  f: Frise,
  t: number,
  sources: Readonly<Record<string, SourceImage>>,
  lignes: readonly LigneSousTitre[],
  theme: ThemeStudio & { fond: string },
) {
  const { largeur: L, hauteur: H } = FORMATS_STUDIO[f.format];
  ctx.fillStyle = theme.sombre;
  ctx.fillRect(0, 0, L, H);
  const actifs = clipsActifs(f, t);
  // De bas en haut : la dernière piste vidéo d'abord, la première par-dessus.
  for (const { piste, clip } of [...actifs].reverse()) {
    if (piste.type !== 'video' || piste.muet) continue;
    const local = t - clip.debut;
    const r = rectangleClip(f.format, clip);
    const fondu = clip.fondus;
    const entree = fondu?.entree ? Math.min(1, local / fondu.entree) : 1;
    const sortie = fondu?.sortie ? Math.min(1, (clip.duree - local) / fondu.sortie) : 1;
    ctx.save();
    ctx.globalAlpha = Math.max(0, opaciteClip(clip, local) * entree * sortie);
    ctx.filter = filtreCss(clip.filtres);
    if (clip.source.type === 'carton') {
      ctx.filter = 'none';
      dessinerCarton(ctx, f.format, clip.source.texte, local, clip.duree, r, theme);
    } else {
      const cle = cleSource(clip.source);
      const s = cle ? sources[cle] : undefined;
      if (s?.largeur && s.hauteur) {
        const c = couverture(s, r);
        ctx.drawImage(
          s.image as never,
          c.x,
          c.y,
          c.largeur,
          c.hauteur,
          r.x,
          r.y,
          r.largeur,
          r.hauteur,
        );
      }
    }
    ctx.restore();
  }
  ctx.filter = 'none';
  dessinerSurcoucheFrise(ctx, f, t, lignes, theme);
}

/** Carton plein cadre : fond et texte centré (aperçu, et image fixe du rendu). */
export function dessinerCarton(
  ctx: ContexteImage,
  format: Frise['format'],
  texte: string,
  local: number,
  duree: number,
  r: Rectangle,
  theme: ThemeStudio & { fond: string },
) {
  ctx.fillStyle = theme.fond;
  ctx.fillRect(r.x, r.y, r.largeur, r.hauteur);
  dessinerCalques(
    ctx,
    [{ type: 'texte', texte, style: 'accroche', position: 'centre', debut: 0, fin: duree }],
    local,
    format,
    r,
    theme,
  );
}

/**
 * Ce qui passe devant toutes les pistes vidéo : effets animés des pistes d'effets et
 * sous-titres. Le robot le dessine seul, sur fond transparent, image par image.
 */
export function dessinerSurcoucheFrise(
  ctx: ContexteImage,
  f: Frise,
  t: number,
  lignes: readonly LigneSousTitre[],
  theme: ThemeStudio,
) {
  const { largeur: L, hauteur: H } = FORMATS_STUDIO[f.format];
  const tout: Rectangle = { x: 0, y: 0, largeur: L, hauteur: H };
  for (const { piste, clip } of [...clipsActifs(f, t)].reverse()) {
    if (piste.type !== 'texte' || piste.muet || clip.source.type !== 'effet') continue;
    dessinerCalques(
      ctx,
      [{ ...clip.source.calque, debut: 0, fin: clip.duree }],
      t - clip.debut,
      f.format,
      tout,
      theme,
    );
  }
  if (f.sousTitres) {
    const ligne = lignes.find((l) => t >= l.debut && t <= l.fin + 120);
    dessinerSousTitre(ctx, ligne, t, f.format, Math.round(H * 0.82), theme);
  }
}

/**
 * Mots prononcés replacés sur la frise : ceux de la voix enregistrée, par les clips qui la
 * font entendre (début de source, vitesse) ; base des sous-titres.
 */
export function motsFrise(f: Pick<Frise, 'pistes'>, mots: readonly MotTranscrit[]): MotTranscrit[] {
  const r: MotTranscrit[] = [];
  for (const p of f.pistes) {
    if (p.muet) continue;
    for (const c of p.clips) {
      if (c.source.type !== 'prise' || c.source.fichier !== 'voix' || c.muet) continue;
      const v = c.vitesse ?? 1;
      const de = c.source.debutSource;
      const a = de + c.duree * v;
      for (const m of mots) {
        const milieu = (m.debut + m.fin) / 2;
        if (milieu < de || milieu >= a) continue;
        r.push({
          texte: m.texte,
          debut: Math.round(c.debut + (Math.max(m.debut, de) - de) / v),
          fin: Math.round(c.debut + (Math.min(m.fin, a) - de) / v),
        });
      }
    }
  }
  return r.sort((x, y) => x.debut - y.debut);
}
