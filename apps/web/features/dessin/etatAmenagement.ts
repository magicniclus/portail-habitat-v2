import {
  ajouterZoneSol,
  coinZone,
  appliquerRevetement,
  dupliquerObjet,
  deplacerObjet,
  modifierObjet,
  harmoniserCuisine,
  colorerCuisine,
  deCuisine,
  orienterObjet,
  poserObjet,
  pointDansPolygone,
  revetirMursDeLaPiece,
  revetirMursExterieurs,
  panDeMur,
  revetirPan,
  revetirZone,
  tournerObjet,
  type Guide,
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
      poserObjet(n, { catalogueId: e.catalogueId, position: point }, ctx, {
        aimant: e.aimant,
        cuisine: e.couleursCuisine,
      }),
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
  // Le second coin reste dans la pièce, comme l'aperçu pendant le tracé.
  const b = coinZone(niveauDe(e), a, point);
  let zoneId = '';
  const suite = surNiveau(e, (n) => {
    const r = ajouterZoneSol(
      n,
      {
        pieceId: piece.id,
        contour: [a, { x: b.x, y: a.y }, b, { x: a.x, y: b.y }],
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

function glisser(e: EtatEditeur, id: string, vers: Point, aimant: boolean, geste?: string) {
  let guides: Guide[] = [];
  const suite = surNiveau(
    e,
    (n) => {
      const r = deplacerObjet(n, id, vers, { aimant });
      if (!r.ok) return r;
      const { guides: g, ...niveau } = r.data;
      guides = g;
      return { ok: true, data: niveau };
    },
    geste ?? null,
  );
  return { ...suite, guides };
}

/** Actions d'aménagement et de décoration (lot 15f) ; `null` si l'action n'en fait pas partie. */
export function reduireAmenagement(e: EtatEditeur, a: Action): EtatEditeur | null {
  switch (a.type) {
    case 'deplacerObjetDe': {
      const o = niveauDe(e).objets.find((x) => x.id === a.id);
      if (!o) return e;
      // Clavier : déplacement précis, sans placement automatique.
      const vers = { x: o.position.x + a.delta.x, y: o.position.y + a.delta.y };
      return glisser(e, a.id, vers, false, a.geste);
    }
    case 'deplacerObjetVers':
      if (!niveauDe(e).objets.some((x) => x.id === a.id)) return e;
      return glisser(e, a.id, a.vers, e.aimant && !a.libre, a.geste);
    case 'orienterObjet':
      return surNiveau(e, (n) => orienterObjet(n, a.id, a.angles), a.geste ?? null);
    case 'tournerObjet':
      return surNiveau(e, (n) => tournerObjet(n, a.id, a.angle));
    case 'tournerSelection':
      return e.selection?.genre === 'objet'
        ? surNiveau(e, (n) => tournerObjet(n, e.selection!.id, 900))
        : e;
    case 'modifierObjet':
      return surNiveau(e, (n) => modifierObjet(n, a.id, a.modif));
    case 'harmoniserCuisine':
      return surNiveau(e, (n) => harmoniserCuisine(n, a.depuis));
    case 'colorerCuisine': {
      const suite = { ...e, couleursCuisine: { ...e.couleursCuisine, ...a.couleurs } };
      return niveauDe(e).objets.some((o) => deCuisine(o.catalogueId))
        ? surNiveau(suite, (n) => colorerCuisine(n, a.couleurs))
        : suite;
    }
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
    case 'revetirPan': {
      // Le mur est coupé aux cloisons : le pan peint reste sélectionné (sa position change).
      const pan = panDeMur(niveauDe(e), a.murId, a.face, a.s);
      let murId = a.murId;
      const suite = surNiveau(e, (n) => {
        const r = revetirPan(n, a, ctx);
        if (!r.ok) return r;
        const { murId: id, ...niveau } = r.data;
        murId = id;
        return { ok: true, data: niveau };
      });
      return suite.erreur || !pan
        ? suite
        : {
            ...suite,
            selection: { genre: 'mur', id: murId, face: a.face, s: a.s - pan.coupe[0] },
          };
    }
    case 'revetirMurs':
      return surNiveau(e, (n) => revetirMursDeLaPiece(n, a.pieceId, a.revetement));
    case 'revetirMursExterieurs':
      return surNiveau(e, (n) => revetirMursExterieurs(n, a.revetement));
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
