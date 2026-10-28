import type { Action, Element, PageSite, Section } from './schemas';

/** Ce que la validation d'une action doit connaître du site. */
export interface ContexteLiens {
  /** pageId → ancres présentes sur la page. */
  pages: Record<string, Set<string>>;
  fichiers: Set<string>;
  /** Le site a-t-il un formulaire sur la page courante ou ailleurs ? */
  formulaire: boolean;
}

const RE_TEL = /^\+?[\d\s.()-]{6,20}$/;
const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Erreur d'une action (bouton, image, lien du menu, mot lié) ; `null` si elle est valide. Même code
 * dans l'éditeur (validation en direct) et à la publication (SITE-09).
 */
export function validerAction(a: Action, ctx: ContexteLiens, pageCourante: string): string | null {
  switch (a.type) {
    case 'aucun':
      return null;
    case 'page':
      if (!a.page || !ctx.pages[a.page]) return 'Page introuvable';
      if (a.ancre && !ctx.pages[a.page]!.has(a.ancre)) return 'Section introuvable sur la page';
      return null;
    case 'ancre':
      return a.ancre && ctx.pages[pageCourante]?.has(a.ancre)
        ? null
        : 'Section introuvable sur la page';
    case 'url': {
      if (!a.url) return 'Adresse manquante';
      try {
        const u = new URL(a.url);
        return u.protocol === 'https:' && u.hostname.includes('.')
          ? null
          : 'Adresse https:// obligatoire';
      } catch {
        return 'Adresse invalide';
      }
    }
    case 'tel':
    case 'sms':
    case 'whatsapp':
      return a.tel && RE_TEL.test(a.tel) ? null : 'Numéro de téléphone invalide';
    case 'email':
      return a.email && RE_EMAIL.test(a.email) ? null : 'Adresse email invalide';
    case 'formulaire':
      return ctx.formulaire ? null : 'Aucun formulaire sur le site';
    case 'fichier':
      return a.fichierId && ctx.fichiers.has(a.fichierId) ? null : 'Fichier introuvable';
  }
}

const RE_MOT_LIE = /\[([^\]]+)\]\(#(L\d+)\)/g;

/** Mots liés d'un texte (`[mot](#L1)`) dont l'action manque. */
export function liensOrphelins(texte: string, liens: Record<string, Action> = {}): string[] {
  return [...texte.matchAll(RE_MOT_LIE)].filter((m) => !liens[m[2]!]).map((m) => m[1]!);
}

/** Mots liés d'un texte, dans l'ordre. */
export const motsLies = (texte: string): { lid: string; mot: string }[] =>
  [...texte.matchAll(RE_MOT_LIE)].map((m) => ({ lid: m[2]!, mot: m[1]! }));

/**
 * « Lier la sélection » : le passage choisi devient `[mot](#Ln)` (premier numéro libre) avec une
 * action vide à régler. `null` si la sélection est vide, touche un lien existant ou un crochet.
 */
export function lierSelection(
  texte: string,
  sel: { debut: number; fin: number },
  liens: Record<string, Action> = {},
): { texte: string; lid: string; liens: Record<string, Action> } | null {
  let { debut, fin } = sel;
  while (debut < fin && /\s/.test(texte[debut]!)) debut++;
  while (fin > debut && /\s/.test(texte[fin - 1]!)) fin--;
  const mot = texte.slice(debut, fin);
  if (!mot || /[[\]()]/.test(mot)) return null;
  for (const m of texte.matchAll(RE_MOT_LIE))
    if (debut < m.index + m[0].length && fin > m.index) return null;
  const pris = new Set([...Object.keys(liens), ...motsLies(texte).map((x) => x.lid)]);
  let n = 1;
  while (pris.has(`L${n}`)) n++;
  const lid = `L${n}`;
  return {
    texte: `${texte.slice(0, debut)}[${mot}](#${lid})${texte.slice(fin)}`,
    lid,
    liens: { ...liens, [lid]: { type: 'aucun' } },
  };
}

/** Retire un mot lié : le mot reste, son action disparaît. */
export function retirerLien(
  texte: string,
  liens: Record<string, Action>,
  lid: string,
): { texte: string; liens: Record<string, Action> } {
  const { [lid]: _retire, ...reste } = liens;
  return {
    texte: texte.replace(RE_MOT_LIE, (tout, mot: string, id: string) => (id === lid ? mot : tout)),
    liens: reste,
  };
}

function* elements(sections: readonly Section[]): Generator<Element> {
  for (const s of sections) for (const r of s.rows) for (const c of r.cols) yield* c.els;
}

/**
 * Fichiers à télécharger (`up:{id}`) cités par les boutons, images et mots liés des pages, et par
 * la navigation : le site public ne charge que ceux-là.
 */
export function fichiersCites(
  pages: Record<string, Pick<PageSite, 'sections'>>,
  nav: { liens: { action: Action }[]; cta: { action: Action } },
): Set<string> {
  const ids = new Set<string>();
  const voir = (a: Action | undefined) => {
    const m = a?.type === 'fichier' ? /^up:([\w-]+)$/.exec(a.fichierId ?? '') : null;
    if (m) ids.add(m[1]!);
  };
  for (const p of Object.values(pages))
    for (const e of elements(p.sections)) {
      if (e.type === 'bouton' || e.type === 'image') voir(e.p.action);
      if (e.type === 'titre' || e.type === 'texte') Object.values(e.p.liens ?? {}).forEach(voir);
    }
  nav.liens.forEach((l) => voir(l.action));
  voir(nav.cta.action);
  return ids;
}

/** Ancres d'une page : sections, lignes, colonnes et éléments avec un identifiant. */
export function ancresDe(sections: readonly Section[]): Set<string> {
  const a = new Set<string>();
  for (const s of sections) {
    if (s.p.ancre) a.add(s.p.ancre);
    for (const r of s.rows) {
      if (r.p.htmlId) a.add(r.p.htmlId);
      for (const c of r.cols) {
        if (c.p.htmlId) a.add(c.p.htmlId);
        for (const e of c.els) if (e.p.htmlId) a.add(e.p.htmlId);
      }
    }
  }
  return a;
}

export interface LienInvalide {
  pageId: string;
  page: string;
  /** Où : « Bouton « Devis gratuit » », « Image », « Menu », « Texte « mot » ». */
  ou: string;
  erreur: string;
}

/**
 * SITE-09 : tous les liens et boutons du site (pages publiées et navigation) ; la publication est
 * refusée tant que la liste n'est pas vide.
 */
export function verifierLiensSite(
  pages: Record<string, Pick<PageSite, 'nom' | 'sections' | 'statut'>>,
  nav: {
    liens: { label: string; action: Action }[];
    cta: { visible: boolean; texte: string; action: Action };
  },
  fichiers: Set<string> = new Set(),
): LienInvalide[] {
  const publiees = Object.entries(pages).filter(([, p]) => p.statut === 'publiee');
  const ctx: ContexteLiens = {
    pages: Object.fromEntries(publiees.map(([id, p]) => [id, ancresDe(p.sections)])),
    fichiers,
    formulaire: publiees.some(([, p]) =>
      [...elements(p.sections)].some((e) => e.type === 'formulaire'),
    ),
  };
  const erreurs: LienInvalide[] = [];
  const noter = (pageId: string, page: string, ou: string, a: Action) => {
    const erreur = validerAction(a, ctx, pageId);
    if (erreur) erreurs.push({ pageId, page, ou, erreur });
  };
  for (const [pageId, p] of publiees)
    for (const e of elements(p.sections)) {
      if (e.type === 'bouton') noter(pageId, p.nom, `Bouton « ${e.p.texte} »`, e.p.action);
      if (e.type === 'image') noter(pageId, p.nom, 'Image', e.p.action);
      if (e.type === 'titre' || e.type === 'texte') {
        for (const [, a] of Object.entries(e.p.liens ?? {})) noter(pageId, p.nom, 'Mot lié', a);
        for (const mot of liensOrphelins(e.p.texte, e.p.liens))
          erreurs.push({
            pageId,
            page: p.nom,
            ou: `Texte « ${mot} »`,
            erreur: 'Lien sans destination',
          });
      }
    }
  const accueil = publiees[0]?.[0] ?? '';
  for (const l of nav.liens) noter(accueil, 'Navigation', `Menu « ${l.label} »`, l.action);
  if (nav.cta.visible) noter(accueil, 'Navigation', `Bouton « ${nav.cta.texte} »`, nav.cta.action);
  return erreurs;
}
