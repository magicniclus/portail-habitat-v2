import type { Revetement } from '@ph/core/dessin';
import { COULEURS_PLAN, MATERIAUX_DESSIN } from '@ph/ui/tokens';

/**
 * Motifs des sols vus de dessus (DES-26) : carrelage avec joints, lames de parquet, poses
 * droite, décalée, diagonale ou à chevrons (approchée). Unités : mm, comme le plan.
 */
const CARREAUX = new Set(['carrelage', 'faience', 'pierre', 'dalle', 'parement']);
const LAMES = new Set(['parquet', 'stratifie', 'vinyle', 'bois', 'composite', 'bardage']);

const materiau = (r: Revetement) => MATERIAUX_DESSIN.find((m) => m.id === r.materiauId);
const couleurDe = (r: Revetement) => r.couleur ?? materiau(r)?.couleur ?? COULEURS_PLAN.pieceVide;
const jointDe = (r: Revetement) =>
  r.joint?.couleur ?? materiau(r)?.joint ?? COULEURS_PLAN.etiquetteTrait;

const motifPossible = (r: Revetement) => CARREAUX.has(r.famille) || LAMES.has(r.famille);

/** Identifiant stable d'un motif (même revêtement → même motif, partagé). */
function idMotif(r: Revetement): string {
  const f = r.format ?? materiau(r)?.format;
  const cle = [r.famille, couleurDe(r), jointDe(r), f?.l, f?.p, r.pose ?? 'droite'].join('-');
  return `motif-${cle.replace(/[^a-z0-9-]/gi, '')}`;
}

/** Remplissage SVG d'un sol : motif si la famille en a un, sinon la couleur. */
export const remplissage = (r: Revetement) =>
  r.famille === 'aucun'
    ? COULEURS_PLAN.pieceVide
    : motifPossible(r)
      ? `url(#${idMotif(r)})`
      : couleurDe(r);

function Motif({ r, mmParPx }: { r: Revetement; mmParPx: number }) {
  const lames = LAMES.has(r.famille);
  const f = r.format ?? materiau(r)?.format ?? (lames ? { l: 1200, p: 180 } : { l: 600, p: 600 });
  const pose = r.pose ?? (lames ? 'decalee' : 'droite');
  // Joint lisible à tout zoom : au moins un pixel.
  const trait = Math.max(r.joint?.largeur ?? 3, mmParPx);
  const decale = pose !== 'droite';
  const rotation =
    pose === 'diagonale' ||
    pose === 'chevron' ||
    pose === 'point_de_hongrie' ||
    pose === 'baton_rompu'
      ? 45
      : 0;
  const h = decale ? 2 * f.p : f.p;
  return (
    <pattern
      id={idMotif(r)}
      patternUnits="userSpaceOnUse"
      width={f.l}
      height={h}
      patternTransform={rotation ? `rotate(${rotation})` : undefined}
    >
      <rect width={f.l} height={h} fill={couleurDe(r)} />
      <g stroke={jointDe(r)} strokeWidth={trait} fill="none">
        <line x1={0} y1={0} x2={f.l} y2={0} />
        <line x1={0} y1={0} x2={0} y2={f.p} />
        {decale ? (
          <>
            <line x1={0} y1={f.p} x2={f.l} y2={f.p} />
            <line x1={f.l / 2} y1={f.p} x2={f.l / 2} y2={2 * f.p} />
          </>
        ) : null}
      </g>
    </pattern>
  );
}

/** Définitions des motifs utilisés par les sols et les zones du niveau. */
export function DefsMotifs({
  revetements,
  mmParPx,
}: {
  revetements: Revetement[];
  mmParPx: number;
}) {
  const uniques = new Map(revetements.filter(motifPossible).map((r) => [idMotif(r), r]));
  return (
    <defs>
      {[...uniques.values()].map((r) => (
        <Motif key={idMotif(r)} r={r} mmParPx={mmParPx} />
      ))}
    </defs>
  );
}
