import {
  emprise,
  hauteurVersLeHaut,
  marchesDroites,
  murSousLePoint,
  objetAPoser,
  objetDuCatalogue,
  pointSurMur,
  poserEscalier,
  toleranceEnMm,
  type Niveau,
  type Point,
  type TypeEscalier,
  MODELES_ESCALIER,
} from '@ph/core/dessin';
import { ApercuEscalierTrace } from './EscalierTraceSvg';
import { COULEURS_PLAN } from '@ph/ui/tokens';
import { niveauDe, sceneDe, type EtatEditeur } from './etat';
import { points } from './svg';
import { PoseOuvertureSvg } from './PoseOuvertureSvg';
import { GuidesSvg } from './GuidesSvg';
import { SymboleObjetSvg } from './SymboleObjet';

/**
 * Objet en cours de pose (DES-22) : il suit le pointeur en transparence, déjà placé comme il
 * le sera au clic (contre un mur, dans un angle), avec les guides de son accroche.
 */
function PoseObjetSvg({
  niveau,
  catalogueId,
  pointeur,
  aimant,
}: {
  niveau: Niveau;
  catalogueId: string;
  pointeur: Point;
  aimant: boolean;
}) {
  const r = objetAPoser(niveau, catalogueId, pointeur, { aimant });
  const c = objetDuCatalogue(catalogueId);
  if (!r || !c) return null;
  const o = r.objet;
  return (
    <g pointerEvents="none" data-testid="pose-objet">
      <GuidesSvg guides={r.guides} />
      <g
        transform={`translate(${o.position.x} ${o.position.y}) rotate(${o.rotation / 10})`}
        className="stroke-accent"
        opacity={0.6}
      >
        <SymboleObjetSvg
          symbole={c.symbole}
          l={o.dimensions.l}
          p={o.dimensions.p}
          couleur={COULEURS_PLAN.etiquette}
        />
      </g>
    </g>
  );
}

const traitApercu = { vectorEffect: 'non-scaling-stroke' as const, fill: 'none' };

/** Escalier en cours de pose (DES-15) : emprise et marches sous le pointeur, en transparence. */
function PoseEscalierSvg({
  niveau,
  type,
  pointeur,
  hauteur,
}: {
  niveau: Niveau;
  type: TypeEscalier;
  pointeur: Point;
  hauteur: number;
}) {
  const r = poserEscalier(
    niveau,
    { type, position: pointeur, hauteurAMonter: hauteur },
    { nouvelId: (p) => `${p}_apercu` },
  );
  const e = r.ok ? r.data.escaliers.at(-1) : undefined;
  if (!e) return null;
  return (
    <g pointerEvents="none" className="stroke-accent" opacity={0.65} data-testid="pose-escalier">
      <polygon
        points={points(emprise(e))}
        {...traitApercu}
        fill={COULEURS_PLAN.etiquette}
        strokeWidth={1.5}
      />
      {marchesDroites(e).map(([p, q], i) => (
        <line key={i} x1={p.x} y1={p.y} x2={q.x} y2={q.y} {...traitApercu} strokeWidth={1} />
      ))}
    </g>
  );
}

/**
 * Aperçu en transparence sous le pointeur, avant le clic : l'objet du catalogue choisi,
 * l'escalier, ou la porte ou fenêtre (collée au mur le plus proche dès qu'on s'en approche, puis
 * tirée entre les deux clics).
 */
export function ApercuPose({
  etat,
  pointeur,
  mmParPx,
}: {
  etat: EtatEditeur;
  pointeur: Point | null;
  mmParPx: number;
}) {
  if (!pointeur) return null;
  const n = niveauDe(etat);
  // Escalier à tracer : il se dessine jusqu'au pointeur (DES-15).
  if (etat.outil === 'escalier' && MODELES_ESCALIER[etat.modeleEscalier].trace)
    return <ApercuEscalierTrace etat={etat} pointeur={pointeur} mmParPx={mmParPx} />;
  if (etat.outil === 'escalier')
    return (
      <PoseEscalierSvg
        niveau={n}
        type={MODELES_ESCALIER[etat.modeleEscalier].type ?? etat.typeEscalier}
        pointeur={pointeur}
        hauteur={hauteurVersLeHaut(sceneDe(etat), etat.niveauId)}
      />
    );
  // Avant le premier clic : la menuiserie se colle au mur le plus proche (même tolérance que le
  // clic), pour qu'on la voie avant d'être pile sur le mur.
  const proche = etat.trace ? null : murSousLePoint(n.murs, pointeur, toleranceEnMm(16, etat.zoom));
  const premier =
    etat.trace ?? (proche ? pointSurMur(proche.mur, proche.distanceDepuisA) : pointeur);
  return etat.outil === 'objet' ? (
    <PoseObjetSvg
      niveau={n}
      catalogueId={etat.catalogueId}
      pointeur={pointeur}
      aimant={etat.aimant}
    />
  ) : (
    <PoseOuvertureSvg
      niveau={n}
      type={etat.typeOuverture}
      premier={premier}
      pointeur={pointeur}
      mmParPx={mmParPx}
    />
  );
}
