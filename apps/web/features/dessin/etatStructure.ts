import { poserCoupe } from './etatFacades';
import {
  ajouterMur,
  ajouterNiveau,
  hauteurVersLeHaut,
  mettreFondAEchelle,
  modifierEscalier,
  modifierOuverture,
  murSousLePoint,
  poserEscalier,
  poserFond,
  poserOuverture,
  reglerFond,
  renommerNiveau,
  retirerFond,
  supprimerEscalier,
  supprimerMur,
  supprimerNiveau,
  supprimerObjet,
  supprimerOuverture,
  supprimerExterieur,
  supprimerZone,
  toleranceEnMm,
  type Niveau,
  type Point,
} from '@ph/core/dessin';
import type { Resultat } from '@ph/core/resultat';
import { poserAmenagement } from './etatAmenagement';
import { poserExterieur } from './etatExterieur';
import { poserToit } from './etatToiture';
import {
  contexteNavigateur as ctx,
  sceneDe,
  surNiveau,
  surScene,
  type Action,
  type EtatEditeur,
} from './etatBase';

/** Clic sur le plan selon l'outil : mur, pièce, porte ou fenêtre, escalier, mesure d'échelle. */
function poserPoint(e: EtatEditeur, point: Point): EtatEditeur {
  if (e.outil === 'selection') return e;
  const amenagement =
    poserAmenagement(e, point) ??
    poserToit(e, point) ??
    poserExterieur(e, point) ??
    poserCoupe(e, point);
  if (amenagement) return amenagement;
  if (e.outil === 'ouverture') {
    const cible = murSousLePoint(niveauCourant(e).murs, point, toleranceEnMm(16, e.zoom));
    if (!cible) return { ...e, erreur: 'Cliquez sur un mur pour y poser la porte ou la fenêtre.' };
    const suite = surNiveau(e, (n) =>
      poserOuverture(
        n,
        { murId: cible.mur.id, type: e.typeOuverture, centre: cible.distanceDepuisA },
        ctx,
      ),
    );
    const posee = niveauCourant(suite).ouvertures.at(-1);
    return suite.erreur || !posee
      ? suite
      : { ...suite, selection: { genre: 'ouverture', id: posee.id } };
  }
  if (e.outil === 'escalier') {
    const suite = surNiveau(e, (n) =>
      poserEscalier(
        n,
        {
          type: e.typeEscalier,
          position: point,
          hauteurAMonter: hauteurVersLeHaut(sceneDe(e), e.niveauId),
        },
        ctx,
      ),
    );
    const pose = niveauCourant(suite).escaliers.at(-1);
    return suite.erreur || !pose
      ? suite
      : { ...suite, outil: 'selection', selection: { genre: 'escalier', id: pose.id } };
  }
  if (!e.trace) return { ...e, trace: point, selection: null };
  if (e.outil === 'echelle') return { ...e, trace: null, echelle: { a: e.trace, b: point } };
  if (e.outil === 'mur') {
    const suite = surNiveau(e, (n) =>
      ajouterMur(n, { a: e.trace!, b: point, type: e.typeMur }, ctx),
    );
    // Le tracé continue depuis le dernier point (DES-06) ; refusé : on reste au même endroit.
    return suite.erreur ? { ...suite, trace: e.trace } : { ...suite, trace: point };
  }
  // Pièce rectangulaire d'un geste (DES-12) : deux coins opposés, quatre murs.
  const a = e.trace;
  const coins = [a, { x: point.x, y: a.y }, point, { x: a.x, y: point.y }];
  if (a.x === point.x || a.y === point.y)
    return { ...e, erreur: 'Tracez un rectangle : les deux coins doivent être opposés.' };
  const suite = surNiveau(e, (n) => {
    let courant: Resultat<Niveau> = { ok: true, data: n };
    for (let i = 0; i < 4 && courant.ok; i++)
      courant = ajouterMur(
        courant.data,
        { a: coins[i]!, b: coins[(i + 1) % 4]!, type: 'mur' },
        ctx,
      );
    return courant;
  });
  return { ...suite, trace: null };
}

const niveauCourant = (e: EtatEditeur) =>
  sceneDe(e).niveaux.find((n) => n.id === e.niveauId) ?? sceneDe(e).niveaux[0]!;

function supprimerSelection(e: EtatEditeur, confirme: boolean): EtatEditeur {
  const s = e.selection;
  if (!s || s.genre === 'piece') return e;
  // Mur porteur (DES-07) : jamais supprimé d'un geste, l'avertissement est confirmé d'abord.
  const mur = s.genre === 'mur' ? niveauCourant(e).murs.find((m) => m.id === s.id) : undefined;
  if (mur?.porteur && !confirme)
    return {
      ...e,
      erreur:
        'Mur porteur : il soutient la maison. Supprimez-le depuis ses propriétés, après confirmation, et demandez l’avis d’un professionnel.',
      proprietes: true,
    };
  if (
    s.genre === 'terrasse' ||
    s.genre === 'piscine' ||
    s.genre === 'cloture' ||
    s.genre === 'vegetal'
  )
    return {
      ...surNiveau(e, (n) => supprimerExterieur(n, s.genre as 'terrasse', s.id)),
      selection: null,
    };
  const commandes: Record<
    Exclude<typeof s.genre, 'piece' | 'terrasse' | 'piscine' | 'cloture' | 'vegetal'>,
    (n: Niveau) => Resultat<Niveau>
  > = {
    mur: (n) => supprimerMur(n, s.id, ctx),
    ouverture: (n) => supprimerOuverture(n, s.id),
    escalier: (n) => supprimerEscalier(n, s.id),
    objet: (n) => supprimerObjet(n, s.id),
    zone: (n) => supprimerZone(n, s.id),
  };
  const commande = commandes[s.genre];
  return { ...surNiveau(e, commande), selection: null };
}

/** Actions de structure (lot 15e) ; `null` si l'action n'en fait pas partie. */
export function reduireStructure(e: EtatEditeur, a: Action): EtatEditeur | null {
  switch (a.type) {
    case 'poserPoint':
      return poserPoint(e, a.point);
    case 'supprimerSelection':
      return supprimerSelection(e, a.confirme === true);
    case 'modifierOuverture':
      return surNiveau(e, (n) => modifierOuverture(n, a.id, a.modif));
    case 'modifierEscalier':
      return surNiveau(e, (n) => modifierEscalier(n, a.id, a.modif));
    case 'changerNiveau':
      return {
        ...e,
        niveauId: a.niveauId,
        selection: null,
        trace: null,
        ajustement: e.ajustement + 1,
      };
    case 'ajouterNiveau': {
      const r = ajouterNiveau(sceneDe(e), { type: a.niveau, copierMurs: a.copierMurs }, ctx);
      if (!r.ok) return { ...e, erreur: r.message };
      const { niveauId, ...scene } = r.data;
      return { ...surScene(e, () => ({ ok: true, data: scene })), niveauId, selection: null };
    }
    case 'renommerNiveau':
      return surScene(e, (s) => renommerNiveau(s, a.niveauId, a.nom));
    case 'supprimerNiveau': {
      const suite = surScene(e, (s) => supprimerNiveau(s, a.niveauId));
      if (suite.erreur) return suite;
      const reste = sceneDe(suite).niveaux;
      const niveauId = reste.some((n) => n.id === e.niveauId) ? e.niveauId : reste[0]!.id;
      return { ...suite, niveauId, selection: null };
    }
    case 'poserFond':
      return surScene(e, (s) => ({
        ok: true,
        data: poserFond(s, { storagePath: a.storagePath, niveauId: e.niveauId }),
      }));
    case 'reglerFond':
      return surScene(
        e,
        (s) => ({ ok: true, data: reglerFond(s, { opacite: a.opacite }) }),
        'opacite-fond',
      );
    case 'retirerFond':
      return surScene(e, (s) => ({ ok: true, data: retirerFond(s) }));
    case 'mettreAEchelle': {
      if (!e.echelle) return e;
      const { a: p1, b: p2 } = e.echelle;
      const suite = surScene(e, (s) => mettreFondAEchelle(s, p1, p2, a.distance));
      return suite.erreur ? suite : { ...suite, echelle: null, outil: 'selection' };
    }
    default:
      return null;
  }
}
