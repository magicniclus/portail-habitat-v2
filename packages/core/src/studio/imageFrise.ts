import { SCENES_CAPTURE } from './catalogue';
import { dessinerCalques, dessinerSousTitre, type ThemeStudio } from './dessin';
import { FORMATS_STUDIO } from './formats';
import { effetsDe, etatTransition, filtreCssEffets, mouvementEffets } from './effetsFrise';
import { opaciteClip, type Clip, type Frise, type Piste, type SourceClip } from './frise';
import { prolongement } from './operationsFrise';
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

/** Contexte de l'aperçu : filtres CSS et, si le navigateur les a, découpe (balayage). */
export type ContexteFrise = ContexteImage & {
  filter: string;
  rect?: (x: number, y: number, l: number, h: number) => void;
  clip?: () => void;
};

/**
 * Clips vidéo à l'image à `t`, du fond vers l'avant : pistes de bas en haut, et sur une piste
 * la séquence d'avant (prolongée sous la transition) puis la nouvelle.
 */
export function clipsVideoVisibles(
  f: Pick<Frise, 'pistes'>,
  t: number,
): { piste: Piste; clip: Clip; local: number }[] {
  return [...f.pistes]
    .reverse()
    .flatMap((piste) =>
      piste.type !== 'video' || piste.muet
        ? []
        : piste.clips
            .filter((c) => t >= c.debut && t < c.debut + c.duree + prolongement(piste, c))
            .map((clip) => ({ piste, clip, local: t - clip.debut })),
    );
}

export function dessinerFrise(
  ctx: ContexteFrise,
  f: Frise,
  t: number,
  sources: Readonly<Record<string, SourceImage>>,
  lignes: readonly LigneSousTitre[],
  theme: ThemeStudio & { fond: string },
) {
  const { largeur: L, hauteur: H } = FORMATS_STUDIO[f.format];
  ctx.fillStyle = theme.sombre;
  ctx.fillRect(0, 0, L, H);
  for (const { piste, clip, local } of clipsVideoVisibles(f, t)) {
    const base = rectangleClip(f.format, clip);
    const effets = effetsDe(piste, clip);
    const tr = etatTransition(clip.transition, local);
    const mv = mouvementEffets(effets, local);
    const echelle = tr.echelle * mv.echelle;
    const r: Rectangle = {
      x: base.x + tr.dx * L + mv.dx - (base.largeur * (echelle - 1)) / 2,
      y: base.y + tr.dy * H + mv.dy - (base.hauteur * (echelle - 1)) / 2,
      largeur: base.largeur * echelle,
      hauteur: base.hauteur * echelle,
    };
    const dans = Math.min(local, clip.duree);
    const fondu = clip.fondus;
    const entree = fondu?.entree ? Math.min(1, dans / fondu.entree) : 1;
    const sortie = fondu?.sortie ? Math.min(1, (clip.duree - dans) / fondu.sortie) : 1;
    ctx.save();
    if (tr.revele < 1 && ctx.rect && ctx.clip) {
      ctx.beginPath();
      ctx.rect(r.x, r.y, r.largeur * tr.revele, r.hauteur);
      ctx.clip();
    }
    ctx.globalAlpha = Math.max(0, opaciteClip(clip, dans) * entree * sortie * tr.alpha);
    const css = [filtreCss(clip.filtres), ...filtreCssEffets(effets)].filter((x) => x !== 'none');
    if (tr.flou) css.push(`blur(${tr.flou}px)`);
    ctx.filter = css.length ? css.join(' ') : 'none';
    if (effets.includes('miroir')) {
      ctx.translate(2 * r.x + r.largeur, 0);
      ctx.scale(-1, 1);
    }
    if (clip.source.type === 'carton') {
      ctx.filter = 'none';
      dessinerCarton(ctx, f.format, clip.source.texte, dans, clip.duree, r, theme);
    } else {
      const cle = cleSource(clip.source);
      const s = cle ? sources[cle] : undefined;
      const src = clip.source;
      if (!s?.largeur && src.type === 'capture') {
        // Écran pas encore filmé (ou en chargement) : une carte le dit, au lieu d'un vide.
        const cap = f.captures.find((x) => x.id === src.captureId);
        ctx.fillStyle = theme.fond;
        ctx.fillRect(r.x, r.y, r.largeur, r.hauteur);
        dessinerCalques(
          ctx,
          [
            {
              type: 'texte',
              texte: cap
                ? SCENES_CAPTURE[cap.scene].libelle.slice(0, 80)
                : 'Écran de Portail Travaux',
              style: 'titre',
              position: 'centre',
              debut: 0,
              fin: 60_000,
            },
            {
              type: 'texte',
              texte: 'Écran filmé par le robot à la fabrication',
              style: 'note',
              position: 'bas',
              debut: 0,
              fin: 60_000,
            },
          ],
          1_500,
          f.format,
          r,
          theme,
        );
      }
      if (s?.largeur && s.hauteur) {
        const c = couverture(s, base);
        const dessiner = (dx: number) =>
          ctx.drawImage(
            s.image as never,
            c.x,
            c.y,
            c.largeur,
            c.hauteur,
            r.x + dx,
            r.y,
            r.largeur,
            r.hauteur,
          );
        dessiner(0);
        if (effets.includes('rgb')) {
          // Décalage RGB (aperçu) : deux fantômes de part et d'autre.
          ctx.globalAlpha *= 0.3;
          dessiner(-8);
          dessiner(8);
        }
      }
    }
    ctx.filter = 'none';
    ctx.globalAlpha = 1;
    if (effets.includes('vignette')) {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(r.x, r.y, r.largeur, r.hauteur * 0.08);
      ctx.fillRect(r.x, r.y + r.hauteur * 0.92, r.largeur, r.hauteur * 0.08);
    }
    if (effets.includes('grain')) {
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      for (let i = 0; i < 60; i++) {
        const k = (i * 7919 + Math.floor(t / 40) * 104729) % 10007;
        ctx.fillRect(r.x + (k % 97) * (r.largeur / 97), r.y + (k % 89) * (r.hauteur / 89), 3, 3);
      }
    }
    if (tr.voile) {
      ctx.fillStyle = tr.voile.couleur === 'noir' ? theme.sombre : theme.clair;
      ctx.globalAlpha = tr.voile.alpha;
      ctx.fillRect(base.x, base.y, base.largeur, base.hauteur);
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
  for (const { piste, clip } of [...clipsActifs(f, t)].reverse())
    if (piste.type === 'texte' && !piste.muet) dessinerEffet(ctx, f, clip, t, theme);
  if (f.sousTitres) dessinerSousTitresFrise(ctx, f, t, lignes, theme);
}

/** Un effet animé (clip d'une piste d'effets) à sa place, décalage compris. */
export function dessinerEffet(
  ctx: ContexteImage,
  f: Pick<Frise, 'format'>,
  clip: Clip,
  t: number,
  theme: ThemeStudio,
) {
  if (clip.source.type !== 'effet') return;
  const { largeur: L, hauteur: H } = FORMATS_STUDIO[f.format];
  ctx.save();
  ctx.translate((clip.decalage?.x ?? 0) * L, (clip.decalage?.y ?? 0) * H);
  dessinerCalques(
    ctx,
    [{ ...clip.source.calque, debut: 0, fin: clip.duree }],
    t - clip.debut,
    f.format,
    { x: 0, y: 0, largeur: L, hauteur: H },
    theme,
  );
  ctx.restore();
}

/** La ligne de sous-titres en cours, à sa place (décalage compris). */
export function dessinerSousTitresFrise(
  ctx: ContexteImage,
  f: Pick<Frise, 'format' | 'decalageSousTitres'>,
  t: number,
  lignes: readonly LigneSousTitre[],
  theme: ThemeStudio,
) {
  const { largeur: L, hauteur: H } = FORMATS_STUDIO[f.format];
  const ligne = lignes.find((l) => t >= l.debut && t <= l.fin + 120);
  ctx.save();
  ctx.translate((f.decalageSousTitres?.x ?? 0) * L, (f.decalageSousTitres?.y ?? 0) * H);
  dessinerSousTitre(ctx, ligne, t, f.format, Math.round(H * 0.82), theme);
  ctx.restore();
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
