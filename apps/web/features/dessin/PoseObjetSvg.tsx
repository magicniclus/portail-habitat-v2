import { objetAPoser, objetDuCatalogue, type Niveau, type Point } from '@ph/core/dessin';
import { COULEURS_PLAN } from '@ph/ui/tokens';
import { niveauDe, type EtatEditeur } from './etat';
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

/**
 * Aperçu en transparence sous le pointeur, avant le clic : l'objet du catalogue choisi, ou la
 * porte ou fenêtre (dès qu'on survole un mur, puis tirée entre les deux clics).
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
      premier={etat.trace ?? pointeur}
      pointeur={pointeur}
      mmParPx={mmParPx}
    />
  );
}
