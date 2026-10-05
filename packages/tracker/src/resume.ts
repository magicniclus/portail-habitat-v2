import {
  abscisseReference,
  appareilPour,
  cleCellule,
  CODES_REPLAY,
  HESITATION_FENETRE_MS,
  HESITATION_MIN_MS,
  palierProfondeur,
  PAUSE_MIN_MS,
  RAGE,
  REPLAY_EVENEMENTS_MAX,
  TRAJET,
} from '@ph/core/comportement';
import type { ResumeVisite } from '@ph/core/schemas';
import { simplifier } from './simplifier';

/**
 * Résumé d'une page vue tenu en mémoire (COMPORTEMENT §2) : logique pure, sans DOM.
 * Les temps sont en ms (horloge monotone), les positions en px dans le document.
 */
export type ContexteVisite = Pick<
  ResumeVisite,
  'sessionId' | 'vueId' | 'page' | 'variante' | 'app' | 'largeur' | 'source' | 'nouvelle'
> & {
  debut: number;
  /** Session tirée au sort pour garder le trajet du curseur (ordinateur seulement). */
  trajets: boolean;
  /** Session tirée au sort pour le replay (sinon gardé seulement si rage ou abandon). */
  replay: boolean;
};

/** Élément visé : clé stable (`data-ph` ou sélecteur court) et nature. */
export type Cible = { cle: string; cliquable: boolean; suivi?: string };
type TypeSortie = ResumeVisite['sortie']['type'];
type Element = ResumeVisite['elements'][string];

/** Un arrêt ne compte pas au-delà de 30 s (onglet laissé ouvert). */
const PAUSE_MAX_MS = 30_000;
/** Un clic sur un lien ne vaut sortie que si la page se ferme dans les 3 s. */
const SORTIE_RECENTE_MS = 3000;
const ajouter = (carte: Record<string, number>, cle: string, n: number) => {
  carte[cle] = (carte[cle] ?? 0) + n;
};

export function creerResume(ctx: ContexteVisite) {
  const appareil = appareilPour(ctx.largeur);
  const pointeur = appareil === 'ordinateur';
  const clics: Record<string, number> = {};
  const attention: Record<string, number> = {};
  const sections: Record<string, number> = {};
  const elements: Record<string, Element> = {};
  const champs: Record<string, number> = {};
  const morts = new Set<string>();
  const rages = new Set<string>();
  const trajet: number[] = [];
  const replay: ResumeVisite['replay'] & object = [];
  let recents: { t: number; x: number; y: number }[] = [];
  let attentes: { suivi: string; fin: number }[] = [];
  let curseur: { t: number; x: number; y: number; suivi?: () => string | undefined } | undefined;
  let dernierPoint = { t: -Infinity, x: 0, y: 0 };
  let profondeur = 0;
  let hauteur = 0;
  let derniereSection = '';
  let dernierChamp: string | undefined;
  let envoye = false;
  let converti: ResumeVisite['conversion'];
  let sortie: { type: TypeSortie; t: number } | undefined;
  let intention = false;

  const element = (suivi: string) => (elements[suivi] ??= { survolMs: 0, clics: 0 });
  const evenement = (t: number, code: number, x: number, y: number) => {
    if (replay.length < REPLAY_EVENEMENTS_MAX) replay.push([Math.round(t - ctx.debut), code, x, y]);
  };
  const xRef = (x: number, largeurDoc: number) => abscisseReference(x, largeurDoc, appareil);

  /** Fin d'un arrêt du curseur : attention pondérée par la durée, hésitation éventuelle. */
  const finArret = (t: number, largeurDoc: number, carte = attention, liste = attentes) => {
    if (!curseur) return;
    const duree = Math.min(PAUSE_MAX_MS, t - curseur.t);
    if (duree < PAUSE_MIN_MS) return;
    ajouter(carte, cleCellule(xRef(curseur.x, largeurDoc), curseur.y), duree);
    const suivi = curseur.suivi?.();
    if (suivi && duree >= HESITATION_MIN_MS) liste.push({ suivi, fin: t });
  };
  let largeurCourante = ctx.largeur;

  return {
    appareil,

    clic(t: number, x: number, y: number, largeurDoc: number, cible: Cible, positionne = true) {
      if (cible.suivi) {
        element(cible.suivi).clics++;
        const suivi = cible.suivi;
        attentes = attentes.filter((a) => a.suivi !== suivi || t - a.fin > HESITATION_FENETRE_MS);
      }
      if (!positionne) return;
      const xr = xRef(x, largeurDoc);
      ajouter(clics, cleCellule(xr, y), 1);
      evenement(t, CODES_REPLAY.clic, xr, Math.round(y));
      if (!cible.cliquable) morts.add(cible.cle);
      recents = recents.filter(
        (c) => t - c.t <= RAGE.fenetreMs && Math.hypot(c.x - x, c.y - y) <= RAGE.rayonPx,
      );
      if (recents.length + 1 >= RAGE.clics) {
        rages.add(cible.cle);
        recents = [];
      } else recents.push({ t, x, y });
    },

    /** Déplacement du curseur (ordinateur) ; `suivi` donne l'élément suivi survolé, à la demande. */
    position(
      t: number,
      x: number,
      y: number,
      largeurDoc: number,
      suivi?: () => string | undefined,
    ) {
      if (!pointeur) return;
      largeurCourante = largeurDoc;
      finArret(t, largeurDoc);
      curseur = { t, x, y, suivi };
      if (
        t - dernierPoint.t < TRAJET.intervalleMs ||
        Math.hypot(x - dernierPoint.x, y - dernierPoint.y) <= TRAJET.deplacementMinPx
      )
        return;
      dernierPoint = { t, x, y };
      const xr = xRef(x, largeurDoc);
      if (ctx.trajets && trajet.length < 4000) trajet.push(xr, Math.round(y));
      evenement(t, CODES_REPLAY.mouvement, xr, Math.round(y));
    },

    defilement(t: number, basVisible: number, hauteurDoc: number, haut: number) {
      profondeur = Math.max(profondeur, palierProfondeur(basVisible, hauteurDoc));
      hauteur = Math.max(hauteur, Math.round(hauteurDoc));
      evenement(t, CODES_REPLAY.defilement, 0, Math.round(haut));
    },

    survol(suivi: string, ms: number) {
      element(suivi).survolMs += Math.round(ms);
    },
    section(id: string, ms: number) {
      if (ms > 0) ajouter(sections, id, Math.round(ms));
    },
    sectionVisible(id: string) {
      derniereSection = id;
    },
    champ(nom: string, ms: number) {
      ajouter(champs, nom, Math.round(ms));
      dernierChamp = nom;
    },
    formulaireEnvoye() {
      envoye = true;
    },
    conversion(objectif: NonNullable<ResumeVisite['conversion']>) {
      converti = objectif;
    },
    sortie(type: TypeSortie, t: number) {
      sortie = { type, t };
    },
    intention() {
      intention = true;
    },

    resume(t: number): ResumeVisite {
      // Copies : un envoi de secours ne doit pas compter deux fois l'arrêt en cours.
      const attentionFinale = { ...attention };
      const attentesFinales = [...attentes];
      finArret(t, largeurCourante, attentionFinale, attentesFinales);
      const elementsFinal = structuredClone(elements);
      for (const a of attentesFinales) {
        const e = (elementsFinal[a.suivi] ??= { survolMs: 0, clics: 0 });
        e.hesitations = (e.hesitations ?? 0) + 1;
      }
      const abandon = envoye || converti ? undefined : dernierChamp;
      const type: TypeSortie = converti
        ? 'conversion'
        : sortie && t - sortie.t <= SORTIE_RECENTE_MS
          ? sortie.type
          : 'fermeture';
      return {
        v: 1,
        sessionId: ctx.sessionId,
        vueId: ctx.vueId,
        page: ctx.page,
        ...(ctx.variante ? { variante: ctx.variante } : {}),
        app: ctx.app,
        appareil,
        largeur: ctx.largeur,
        hauteur,
        source: ctx.source,
        nouvelle: ctx.nouvelle,
        duree: Math.max(0, Math.round(t - ctx.debut)),
        profondeur,
        cellulesClics: { ...clics },
        cellulesAttention: attentionFinale,
        sections: { ...sections },
        elements: elementsFinal,
        morts: [...morts],
        rages: [...rages],
        champs: { ...champs },
        ...(abandon ? { abandon } : {}),
        sortie: { section: derniereSection, type, intention },
        ...(converti ? { conversion: converti } : {}),
        ...(ctx.trajets && pointeur ? { trajet: simplifier(trajet, TRAJET.pointsMax) } : {}),
        ...(ctx.replay || rages.size || abandon ? { replay: [...replay] } : {}),
      };
    },
  };
}
