import { dessinerCalques, dessinerSousTitre, type Contexte2D, type ThemeStudio } from './dessin';
import { FORMATS_STUDIO } from './formats';
import { couverture, disposition, positionSource, type Rectangle } from './montage';
import type { PlanMontage } from './plan';
import type { LigneSousTitre } from './sousTitres';

/**
 * Une image de la vidéo finale à l'instant `t`. Le fond (écran, caméra, capture) est dessiné ici
 * pour l'aperçu ; le rendu final le compose avec ffmpeg aux mêmes rectangles (`disposition`,
 * `couverture`) puis pose par-dessus la même surcouche (`dessinerSurcouche`).
 */
export interface SourceImage {
  image: unknown;
  largeur: number;
  hauteur: number;
}
export interface ContexteImage extends Contexte2D {
  drawImage(
    image: never,
    sx: number,
    sy: number,
    sl: number,
    sh: number,
    dx: number,
    dy: number,
    dl: number,
    dh: number,
  ): void;
}

const ligneA = (lignes: readonly LigneSousTitre[], t: number) =>
  lignes.find((l) => t >= l.debut && t <= l.fin + 120);

/** Bas de la zone libre pour les sous-titres : au-dessus de la caméra quand elle est en bas. */
export function basSousTitres(plan: PlanMontage, t: number): number {
  const { hauteur } = FORMATS_STUDIO[plan.format];
  const x = plan.plans[positionSource(plan, t).index]!;
  const d = disposition(plan.format, x.visuel, x.camera);
  if (
    d.camera &&
    d.principal &&
    d.camera.y > 0 &&
    d.camera.largeur === FORMATS_STUDIO[plan.format].largeur
  )
    return d.camera.y;
  return Math.round(hauteur * 0.82);
}

/** Carton, calques et sous-titres (ce qui est posé par-dessus les images). */
export function dessinerSurcouche(
  ctx: Contexte2D,
  plan: PlanMontage,
  t: number,
  lignes: readonly LigneSousTitre[],
  theme: ThemeStudio & { fond: string },
) {
  const pos = positionSource(plan, t);
  const x = plan.plans[pos.index]!;
  const { largeur, hauteur } = FORMATS_STUDIO[plan.format];
  const d = disposition(plan.format, x.visuel, x.camera);
  const zone: Rectangle = d.principal ?? { x: 0, y: 0, largeur, hauteur };
  if (x.visuel === 'carton' && x.carton) {
    ctx.save();
    ctx.fillStyle = theme.fond;
    ctx.fillRect(zone.x, zone.y, zone.largeur, zone.hauteur);
    ctx.restore();
    dessinerCalques(
      ctx,
      [
        {
          type: 'texte',
          texte: x.carton,
          style: 'accroche',
          position: 'centre',
          debut: 0,
          fin: x.source.fin - x.source.debut,
        },
      ],
      pos.tPlan,
      plan.format,
      zone,
      theme,
    );
  }
  dessinerCalques(ctx, x.calques, pos.tPlan, plan.format, zone, theme);
  if (plan.sousTitres)
    dessinerSousTitre(ctx, ligneA(lignes, t), t, plan.format, basSousTitres(plan, t), theme);
}

function poser(
  ctx: ContexteImage,
  s: SourceImage | undefined,
  r: Rectangle,
  zoom?: PlanMontage['plans'][number]['zoom'],
) {
  if (!s || !s.largeur || !s.hauteur) return;
  const c = couverture(s, r, zoom);
  ctx.drawImage(s.image as never, c.x, c.y, c.largeur, c.hauteur, r.x, r.y, r.largeur, r.hauteur);
}

/** Image complète (aperçu de l'admin) : fond noir, visuel, caméra, puis la surcouche. */
export function dessinerImage(
  ctx: ContexteImage,
  plan: PlanMontage,
  t: number,
  sources: { ecran?: SourceImage; camera?: SourceImage; captures: Record<string, SourceImage> },
  lignes: readonly LigneSousTitre[],
  theme: ThemeStudio & { fond: string },
) {
  const { largeur, hauteur } = FORMATS_STUDIO[plan.format];
  const x = plan.plans[positionSource(plan, t).index]!;
  const d = disposition(plan.format, x.visuel, x.camera);
  ctx.fillStyle = theme.sombre;
  ctx.fillRect(0, 0, largeur, hauteur);
  if (d.principal) {
    if (x.visuel === 'ecran') poser(ctx, sources.ecran, d.principal, x.zoom);
    if (x.visuel === 'capture' && x.captureId)
      poser(ctx, sources.captures[x.captureId], d.principal, x.zoom);
  }
  if (d.camera) poser(ctx, sources.camera, d.camera);
  dessinerSurcouche(ctx, plan, t, lignes, theme);
}
