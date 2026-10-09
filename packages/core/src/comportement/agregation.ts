import { cleCellule, type Appareil } from './mesure';

/**
 * Agrégation des résumés de visite (COMPORTEMENT §4) : tout est stocké en **compteurs
 * additifs** pour que les cumuls 7, 30 et 90 jours soient de simples sommes de journées.
 * Les taux (part de défilement, temps moyen, conversion si lue) se calculent à l'affichage.
 */
export interface SessionAgregee {
  appareil: Appareil;
  duree: number;
  profondeur: number;
  source: string;
  variante?: string;
  cellulesClics: Record<string, number>;
  cellulesAttention: Record<string, number>;
  sections: Record<string, number>;
  elements: Record<string, { survolMs: number; clics: number; hesitations?: number }>;
  morts: string[];
  rages: string[];
  sortie: { section: string; type: string };
  conversion?: string;
  trajet?: number[];
}

export interface StatSection {
  vues: number;
  /** Sessions restées plus de 3 s sur la section. */
  lues: number;
  tempsTotalMs: number;
  sorties: number;
  conversionsSiLue: number;
}
export interface StatElement {
  clics: number;
  morts: number;
  rages: number;
  hesitations: number;
  survolTotalMs: number;
}

export interface Agregat {
  sessions: number;
  conversions: number;
  dureeMediane: number;
  profondeurMediane: number;
  grilleClics: Record<string, number>;
  grilleAttention: Record<string, number>;
  grilleMouvements: Record<string, number>;
  /** `scroll[i]` : sessions qui atteignent au moins `(i + 1) × 5 %` de la page. */
  scroll: number[];
  sections: Record<string, StatSection>;
  elements: Record<string, StatElement>;
  sources: Record<string, number>;
  variantes: Record<string, number>;
  conversionsVariantes: Record<string, number>;
}

/** Temps de lecture au-delà duquel une section compte comme lue (attribution par section). */
export const LECTURE_MIN_MS = 3000;
export const APPAREILS_AGREGES = ['ordinateur', 'tablette', 'mobile', 'tous'] as const;
export type AppareilAgrege = (typeof APPAREILS_AGREGES)[number];

const ajouter = (carte: Record<string, number>, cle: string, n = 1) => {
  carte[cle] = (carte[cle] ?? 0) + n;
};
const sommer = (cible: Record<string, number>, source: Record<string, number>) => {
  for (const [k, v] of Object.entries(source)) ajouter(cible, k, v);
};

export function mediane(valeurs: readonly number[]): number {
  if (!valeurs.length) return 0;
  const t = [...valeurs].sort((a, b) => a - b);
  const m = t.length >> 1;
  return t.length % 2 ? t[m]! : Math.round((t[m - 1]! + t[m]!) / 2);
}

export const agregatVide = (): Agregat => ({
  sessions: 0,
  conversions: 0,
  dureeMediane: 0,
  profondeurMediane: 0,
  grilleClics: {},
  grilleAttention: {},
  grilleMouvements: {},
  scroll: Array.from({ length: 20 }, () => 0),
  sections: {},
  elements: {},
  sources: {},
  variantes: {},
  conversionsVariantes: {},
});

const section = (a: Agregat, id: string) =>
  (a.sections[id] ??= { vues: 0, lues: 0, tempsTotalMs: 0, sorties: 0, conversionsSiLue: 0 });
const element = (a: Agregat, id: string) =>
  (a.elements[id] ??= { clics: 0, morts: 0, rages: 0, hesitations: 0, survolTotalMs: 0 });

/** Agrège les résumés d'une journée (un appareil, ou `tous` : sans cartes, layouts différents). */
export function agregerSessions(
  sessions: readonly SessionAgregee[],
  appareil: AppareilAgrege,
): Agregat {
  const a = agregatVide();
  const retenues = appareil === 'tous' ? sessions : sessions.filter((s) => s.appareil === appareil);
  for (const s of retenues) {
    a.sessions++;
    const converti = !!s.conversion;
    if (converti) a.conversions++;
    ajouter(a.sources, s.source);
    const variante = s.variante ?? 'A';
    ajouter(a.variantes, variante);
    if (converti) ajouter(a.conversionsVariantes, variante);
    for (let i = 0; i < 20; i++) if (s.profondeur >= (i + 1) * 5) a.scroll[i]!++;
    if (appareil !== 'tous') {
      sommer(a.grilleClics, s.cellulesClics);
      sommer(a.grilleAttention, s.cellulesAttention);
      const t = s.trajet ?? [];
      for (let i = 0; i + 1 < t.length; i += 2)
        ajouter(a.grilleMouvements, cleCellule(t[i]!, t[i + 1]!));
    }
    const vues = new Set([
      ...Object.keys(s.sections),
      ...(s.sortie.section ? [s.sortie.section] : []),
    ]);
    for (const id of vues) {
      const st = section(a, id);
      const ms = s.sections[id] ?? 0;
      st.vues++;
      st.tempsTotalMs += ms;
      if (ms > LECTURE_MIN_MS) {
        st.lues++;
        if (converti) st.conversionsSiLue++;
      }
    }
    if (s.sortie.section && s.sortie.type !== 'conversion') section(a, s.sortie.section).sorties++;
    for (const [id, e] of Object.entries(s.elements)) {
      const st = element(a, id);
      st.clics += e.clics;
      st.survolTotalMs += e.survolMs;
      st.hesitations += e.hesitations ?? 0;
    }
    for (const id of s.morts) element(a, id).morts++;
    for (const id of s.rages) element(a, id).rages++;
  }
  a.dureeMediane = mediane(retenues.map((s) => s.duree));
  a.profondeurMediane = mediane(retenues.map((s) => s.profondeur));
  return a;
}

/**
 * Cumul de plusieurs journées : sommes des compteurs ; les médianes deviennent la moyenne des
 * médianes du jour pondérée par les sessions (approximation, signalée dans l'admin).
 */
export function fusionnerAgregats(liste: readonly Agregat[]): Agregat {
  const a = agregatVide();
  let duree = 0;
  let profondeur = 0;
  for (const j of liste) {
    a.sessions += j.sessions;
    a.conversions += j.conversions;
    duree += j.dureeMediane * j.sessions;
    profondeur += j.profondeurMediane * j.sessions;
    sommer(a.grilleClics, j.grilleClics);
    sommer(a.grilleAttention, j.grilleAttention);
    sommer(a.grilleMouvements, j.grilleMouvements);
    j.scroll.forEach((n, i) => (a.scroll[i]! += n));
    for (const [id, s] of Object.entries(j.sections)) {
      const st = section(a, id);
      for (const k of Object.keys(s) as (keyof StatSection)[]) st[k] += s[k];
    }
    for (const [id, e] of Object.entries(j.elements)) {
      const st = element(a, id);
      for (const k of Object.keys(e) as (keyof StatElement)[]) st[k] += e[k];
    }
    sommer(a.sources, j.sources);
    sommer(a.variantes, j.variantes);
    sommer(a.conversionsVariantes, j.conversionsVariantes);
  }
  if (a.sessions) {
    a.dureeMediane = Math.round(duree / a.sessions);
    a.profondeurMediane = Math.round(profondeur / a.sessions);
  }
  return a;
}

/** Part des sorties par section (hors conversions), de la plus forte à la plus faible. */
export function partsSorties(a: Agregat) {
  const total = Object.values(a.sections).reduce((n, s) => n + s.sorties, 0);
  return Object.entries(a.sections)
    .filter(([, s]) => s.sorties > 0)
    .map(([id, s]) => ({ section: id, part: s.sorties / total }))
    .sort((x, y) => y.part - x.part);
}
