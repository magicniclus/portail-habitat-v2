import {
  ajouterZoneSol,
  appliquerRevetement,
  dupliquerObjet,
  deplacerObjet,
  modifierObjet,
  poserObjet,
  pointDansPolygone,
  revetirMursDeLaPiece,
  revetirZone,
  tournerObjet,
  type Niveau,
  type Point,
  type Revetement,
} from '@ph/core/dessin';
import type { Resultat } from '@ph/core/resultat';
import {
  contexteNavigateur as ctx,
  niveauDe,
  surNiveau,
  type Action,
  type EtatEditeur,
} from './etatBase';

/** Revêtement d'une zone tracée sans style copié : carrelage blanc 60 × 60. */
const ZONE_DEFAUT: Revetement = { famille: 'carrelage', format: { l: 600, p: 600 } };

/** Clic sur le plan pour les outils d'aménagement : poser un objet, tracer une zone au sol. */
export function poserAmenagement(e: EtatEditeur, point: Point): EtatEditeur | null {
  if (e.outil === 'objet') {
    const suite = surNiveau(e, (n) =>
      poserObjet(n, { catalogueId: e.catalogueId, position: point }, ctx),
    );
    const pose = niveauDe(suite).objets.at(-1);
    return suite.erreur || !pose
      ? suite
      : {
          ...suite,
          outil: 'selection',
          selection: { genre: 'objet', id: pose.id },
          proprietes: true,
        };
  }
  if (e.outil !== 'zone') return null;
  if (!e.trace) return { ...e, trace: point, selection: null };
  const a = e.trace;
  const piece = niveauDe(e).pieces.find((p) => pointDansPolygone(a, p.contour));
  if (!piece) return { ...e, trace: null, erreur: 'Commencez la zone à l’intérieur d’une pièce.' };
  let zoneId = '';
  const suite = surNiveau(e, (n) => {
    const r = ajouterZoneSol(
      n,
      {
        pieceId: piece.id,
        contour: [a, { x: point.x, y: a.y }, point, { x: a.x, y: point.y }],
        revetement: e.pressePapier ?? ZONE_DEFAUT,
      },
      ctx,
    );
    if (!r.ok) return r;
    zoneId = r.data.zoneId;
    const { zoneId: _z, ...niveau } = r.data;
    return { ok: true, data: niveau };
  });
  return suite.erreur
    ? { ...suite, trace: null }
    : { ...suite, trace: null, outil: 'selection', selection: { genre: 'zone', id: zoneId } };
}

/** Coller le style copié sur la sélection : sol d'une pièce, deux faces d'un mur, une zone. */
function coller(e: EtatEditeur): EtatEditeur {
  const s = e.selection;
  const r = e.pressePapier;
  if (!s || !r) return e;
  const commande = (n: Niveau): Resultat<Niveau> => {
    if (s.genre === 'piece')
      return appliquerRevetement(n, { genre: 'piece', pieceId: s.id, surface: 'sol' }, r);
    if (s.genre === 'zone') return revetirZone(n, s.id, r);
    if (s.genre !== 'mur') return { ok: true, data: n };
    const a = appliquerRevetement(n, { genre: 'mur', murId: s.id, face: 'a' }, r);
    return a.ok ? appliquerRevetement(a.data, { genre: 'mur', murId: s.id, face: 'b' }, r) : a;
  };
  return surNiveau(e, commande);
}

/** Actions d'aménagement et de décoration (lot 15f) ; `null` si l'action n'en fait pas partie. */
export function reduireAmenagement(e: EtatEditeur, a: Action): EtatEditeur | null {
  switch (a.type) {
    case 'deplacerObjetDe': {
      const o = niveauDe(e).objets.find((x) => x.id === a.id);
      if (!o) return e;
      const vers = { x: o.position.x + a.delta.x, y: o.position.y + a.delta.y };
      return surNiveau(e, (n) => deplacerObjet(n, a.id, vers), a.geste ?? null);
    }
    case 'tournerObjet':
      return surNiveau(e, (n) => tournerObjet(n, a.id, a.angle));
    case 'tournerSelection':
      return e.selection?.genre === 'objet'
        ? surNiveau(e, (n) => tournerObjet(n, e.selection!.id, 900))
        : e;
    case 'modifierObjet':
      return surNiveau(e, (n) => modifierObjet(n, a.id, a.modif));
    case 'dupliquerObjet': {
      let copieId = '';
      const suite = surNiveau(e, (n) => {
        const r = dupliquerObjet(n, a.id, ctx);
        if (!r.ok) return r;
        copieId = r.data.copieId;
        const { copieId: _c, ...niveau } = r.data;
        return { ok: true, data: niveau };
      });
      return suite.erreur ? suite : { ...suite, selection: { genre: 'objet', id: copieId } };
    }
    case 'revetirMurs':
      return surNiveau(e, (n) => revetirMursDeLaPiece(n, a.pieceId, a.revetement));
    case 'revetirZone':
      return surNiveau(e, (n) => revetirZone(n, a.id, a.revetement));
    case 'copierStyle':
      return { ...e, pressePapier: a.revetement };
    case 'collerStyle':
      return coller(e);
    default:
      return null;
  }
}
