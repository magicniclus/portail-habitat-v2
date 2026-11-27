import { DEFAUTS_COLONNE, DEFAUTS_LIGNE, DEFAUTS_SECTION, elementDuCatalogue } from './catalogue';
import { slugifier } from '../format/slug';
import { ancresDe } from './actions';
import { copieSection } from './edition';
import type { Element, PageSite, Section, TypeElement } from './schemas';

/**
 * Structure d'une page dans l'éditeur (maquette Editeur de Site) : zone › section › bloc ›
 * élément, soit `sections` › `rows` › `cols` › `els` dans le modèle. Fonctions pures sur des
 * copies : l'historique de l'éditeur garde chaque état.
 */
export type Ligne = Section['rows'][number];
export type Bloc = Ligne['cols'][number];
export type Noeud = Section | Ligne | Bloc | Element;
export type Niveau = 'zone' | 'section' | 'bloc' | 'element';
const NIVEAUX: readonly Niveau[] = ['zone', 'section', 'bloc', 'element'];

export interface NoeudTrouve {
  niveau: Niveau;
  noeud: Noeud;
  /** Parents puis le nœud : [zone, section?, bloc?, élément?]. */
  chaine: Noeud[];
  /** Position parmi ses voisins, et leur nombre. */
  i: number;
  n: number;
}

/** Dispositions proposées pour les blocs d'une section (12 unités). */
export const DISPOSITIONS: readonly { cle: string; libelle: string; largeurs: number[] }[] = [
  { cle: '12', libelle: '1 bloc', largeurs: [12] },
  { cle: '6-6', libelle: '2 blocs égaux', largeurs: [6, 6] },
  { cle: '4-8', libelle: '⅓ · ⅔', largeurs: [4, 8] },
  { cle: '8-4', libelle: '⅔ · ⅓', largeurs: [8, 4] },
  { cle: '4-4-4', libelle: '3 blocs', largeurs: [4, 4, 4] },
  { cle: '3-6-3', libelle: '¼ · ½ · ¼', largeurs: [3, 6, 3] },
  { cle: '3-3-3-3', libelle: '4 blocs', largeurs: [3, 3, 3, 3] },
  { cle: '2-2-2-2-2-2', libelle: '6 blocs', largeurs: [2, 2, 2, 2, 2, 2] },
];
export const BLOCS_MAX = 6;

const enfants = (x: Noeud): Noeud[] | null =>
  'rows' in x ? x.rows : 'cols' in x ? x.cols : 'els' in x ? x.els : null;

export function trouverNoeud(p: Pick<PageSite, 'sections'>, id: string): NoeudTrouve | null {
  const chercher = (liste: Noeud[], prof: number, chaine: Noeud[]): NoeudTrouve | null => {
    for (const [i, x] of liste.entries()) {
      const c = [...chaine, x];
      if (x.id === id) return { niveau: NIVEAUX[prof]!, noeud: x, chaine: c, i, n: liste.length };
      const sous = enfants(x);
      const r = sous ? chercher(sous, prof + 1, c) : null;
      if (r) return r;
    }
    return null;
  };
  return chercher(p.sections, 0, []);
}

/** Identifiant du parent (bloc d'un élément…) ; `null` pour une zone ou un nœud introuvable. */
export function parentDe(p: Pick<PageSite, 'sections'>, id: string): string | null {
  const f = trouverNoeud(p, id);
  return f && f.chaine.length > 1 ? f.chaine.at(-2)!.id : null;
}

/** Copie de la page où la liste contenant `id` est remplacée par `f(liste, i)`. */
function majListe(
  p: PageSite,
  id: string,
  f: (liste: Noeud[], i: number) => Noeud[] | null,
): PageSite | null {
  let fait = false;
  const parcourir = (liste: Noeud[]): Noeud[] => {
    const i = liste.findIndex((x) => x.id === id);
    if (i >= 0) {
      const r = f(liste, i);
      if (!r) return liste;
      fait = true;
      return r;
    }
    return liste.map((x) => {
      if (fait) return x;
      if ('rows' in x) return { ...x, rows: parcourir(x.rows) as Ligne[] };
      if ('cols' in x) return { ...x, cols: parcourir(x.cols) as Bloc[] };
      if ('els' in x) return { ...x, els: parcourir(x.els) as Element[] };
      return x;
    });
  };
  const sections = parcourir(p.sections) as Section[];
  return fait ? { ...p, sections } : null;
}

/** Copie du nœud `id` transformée par `f`. */
function majUn(p: PageSite, id: string, f: (x: Noeud) => Noeud): PageSite {
  return majListe(p, id, (l, i) => l.map((x, j) => (j === i ? f(x) : x))) ?? p;
}

/** Réglages fusionnés dans `p` (le schéma revalide à l'enregistrement) ; `w` d'un bloc à part. */
export function majNoeud(p: PageSite, id: string, reglages: Record<string, unknown>): PageSite {
  return majUn(p, id, (x) => {
    const { w, ...reste } = reglages;
    const n = { ...x, p: { ...x.p, ...reste } } as Noeud;
    return typeof w === 'number' && 'w' in n ? { ...n, w } : n;
  });
}

/** 12 unités partagées au plus juste entre les blocs (les premiers prennent le reste). */
const repartir = (cols: Bloc[]): Bloc[] => {
  const base = Math.floor(12 / cols.length);
  let reste = 12 - base * cols.length;
  return cols.map((c) => ({ ...c, w: base + (reste-- > 0 ? 1 : 0) }));
};

function copie(x: Noeud, nouvelId: () => string): Noeud {
  if ('rows' in x) return copieSection(x, nouvelId);
  if (!('cols' in x) && !('els' in x))
    return { ...x, id: nouvelId(), p: { ...x.p, htmlId: '' } } as Element;
  const z = copieSection(
    {
      id: '',
      p: {} as Section['p'],
      rows: 'cols' in x ? [x] : [{ id: '', p: DEFAUTS_LIGNE, cols: [x] }],
    },
    nouvelId,
  );
  return 'cols' in x ? z.rows[0]! : z.rows[0]!.cols[0]!;
}

export type OperationNoeud = 'haut' | 'bas' | 'dupliquer' | 'supprimer';

/**
 * Monter, descendre (gauche, droite pour un bloc), dupliquer juste après, supprimer. Renvoie la
 * nouvelle sélection : la copie, ou le parent après une suppression.
 */
export function operationNoeud(
  p: PageSite,
  id: string,
  op: OperationNoeud,
  nouvelId: () => string,
): { page: PageSite; selection: string | null; erreur?: string } {
  const f = trouverNoeud(p, id);
  if (!f) return { page: p, selection: null };
  const parent = f.chaine.length > 1 ? f.chaine.at(-2)!.id : null;
  const bloc = f.niveau === 'bloc';
  if (op === 'supprimer' && bloc && f.n === 1)
    return {
      page: p,
      selection: id,
      erreur: 'Une section garde au moins un bloc : supprimez la section.',
    };
  let selection: string | null = id;
  const page = majListe(p, id, (l, i) => {
    let r = [...l];
    if (op === 'haut' || op === 'bas') {
      const j = op === 'haut' ? i - 1 : i + 1;
      if (j < 0 || j >= l.length) return null;
      [r[i], r[j]] = [r[j]!, r[i]!];
      return r;
    }
    if (op === 'dupliquer') {
      const c = copie(l[i]!, nouvelId);
      selection = c.id;
      r.splice(i + 1, 0, c);
    } else {
      r.splice(i, 1);
      selection = parent;
    }
    if (bloc) r = repartir(r as Bloc[]);
    return r;
  });
  return { page: page ?? p, selection: page ? selection : id };
}

const blocVide = (w: number, nouvelId: () => string): Bloc => ({
  id: nouvelId(),
  w,
  p: DEFAUTS_COLONNE,
  els: [],
});

/** Ajuste le nombre de blocs (1 à 6) : blocs vides ajoutés, ou contenus fusionnés dans le dernier. */
function ajusterBlocs(cols: Bloc[], n: number, nouvelId: () => string): Bloc[] {
  const r = cols.slice(0, n);
  const retires = cols.slice(n).flatMap((c) => c.els);
  if (retires.length) r[n - 1] = { ...r[n - 1]!, els: [...r[n - 1]!.els, ...retires] };
  while (r.length < n) r.push(blocVide(1, nouvelId));
  return r;
}

export function changerNombreBlocs(
  p: PageSite,
  ligneId: string,
  n: number,
  nouvelId: () => string,
): PageSite {
  if (n < 1 || n > BLOCS_MAX) return p;
  return majUn(p, ligneId, (x) =>
    'cols' in x ? { ...x, cols: repartir(ajusterBlocs(x.cols, n, nouvelId)) } : x,
  );
}

export function changerDisposition(
  p: PageSite,
  ligneId: string,
  largeurs: readonly number[],
  nouvelId: () => string,
): PageSite {
  return majUn(p, ligneId, (x) =>
    'cols' in x
      ? {
          ...x,
          cols: ajusterBlocs(x.cols, largeurs.length, nouvelId).map((c, i) => ({
            ...c,
            w: largeurs[i]!,
          })),
        }
      : x,
  );
}

/** Nouvelle section (blocs vides aux largeurs données) après celle de la sélection, ou en fin de zone. */
/** Zone vide (sans section) : point de départ d'une page vierge. */
const zoneVide = (nouvelId: () => string): Section => ({
  id: nouvelId(),
  p: { ...DEFAUTS_SECTION, nom: 'Zone' },
  rows: [],
});

export function ajouterLigne(
  p: PageSite,
  cible: string | null,
  largeurs: readonly number[],
  nouvelId: () => string,
): { page: PageSite; id: string } | null {
  const f = cible ? trouverNoeud(p, cible) : null;
  if (!f) {
    // Rien de sélectionné (ou page vierge) : la section part dans une zone neuve en bas de page.
    const z = zoneVide(nouvelId);
    return ajouterLigne({ ...p, sections: [...p.sections, z] }, z.id, largeurs, nouvelId);
  }
  const ligne: Ligne = {
    id: nouvelId(),
    p: DEFAUTS_LIGNE,
    cols: largeurs.map((w) => blocVide(w, nouvelId)),
  };
  const zone = f.chaine[0] as Section;
  const apres = f.chaine[1] ? zone.rows.indexOf(f.chaine[1] as Ligne) + 1 : zone.rows.length;
  const rows = [...zone.rows];
  rows.splice(apres, 0, ligne);
  return { page: majUn(p, zone.id, (z) => ({ ...z, rows }) as Section), id: ligne.id };
}

/**
 * Contenu inséré selon la sélection : après l'élément, à la fin du bloc, du premier bloc de la
 * section, ou du premier bloc de la dernière section de la zone (créée si la zone est vide) ;
 * sans sélection, dans une zone neuve en bas de la page.
 */
export function insererDans(
  p: PageSite,
  cible: string | null,
  type: TypeElement,
  nouvelId: () => string,
): { page: PageSite; id: string } | null {
  const f = cible ? trouverNoeud(p, cible) : null;
  if (!f) {
    // Rien de sélectionné (ou page vierge) : zone neuve en bas de page, puis le contenu.
    const z = zoneVide(nouvelId);
    return insererDans({ ...p, sections: [...p.sections, z] }, z.id, type, nouvelId);
  }
  const nouveau = elementDuCatalogue(type, nouvelId());
  if (f.niveau === 'element') {
    const page = majListe(p, f.noeud.id, (l, i) => [
      ...l.slice(0, i + 1),
      nouveau,
      ...l.slice(i + 1),
    ]);
    return { page: page ?? p, id: nouveau.id };
  }
  if (f.niveau === 'zone' && (f.noeud as Section).rows.length === 0) {
    const r = ajouterLigne(p, f.noeud.id, [12], nouvelId)!;
    return insererDans(r.page, r.id, type, nouvelId);
  }
  const bloc =
    f.niveau === 'bloc'
      ? f.noeud
      : f.niveau === 'section'
        ? (f.noeud as Ligne).cols[0]!
        : (f.noeud as Section).rows.at(-1)!.cols[0]!;
  return {
    page: majUn(p, bloc.id, (c) => ({ ...c, els: [...(c as Bloc).els, nouveau] }) as Bloc),
    id: nouveau.id,
  };
}

/**
 * Ancre d'une zone, pour y mener un bouton ou un lien (« Arriver directement sur une zone ») :
 * l'ancre existante, sinon une ancre tirée du nom de la zone, unique sur la page. `null` si `id`
 * n'est pas une zone.
 */
export function ancrerZone(p: PageSite, id: string): { page: PageSite; ancre: string } | null {
  const zone = p.sections.find((s) => s.id === id);
  if (!zone) return null;
  if (zone.p.ancre) return { page: p, ancre: zone.p.ancre };
  const prises = ancresDe(p.sections);
  const base = slugifier(zone.p.nom).slice(0, 50) || 'zone';
  let ancre = base;
  for (let n = 2; prises.has(ancre); n++) ancre = `${base}-${n}`;
  return { page: majNoeud(p, id, { ancre }), ancre };
}

const niveauDe = (x: Noeud): Niveau =>
  'rows' in x ? 'zone' : 'cols' in x ? 'section' : 'els' in x ? 'bloc' : 'element';

/** Ajoute `x` à la fin des enfants du conteneur `id` (blocs répartis sur 12 unités). */
function ajouterEnfant(p: PageSite, id: string, x: Noeud): PageSite | null {
  const f = trouverNoeud(p, id);
  if (!f) return null;
  const c = f.noeud;
  if ('rows' in c) return majUn(p, id, () => ({ ...c, rows: [...c.rows, x as Ligne] }));
  if ('cols' in c)
    return c.cols.length >= BLOCS_MAX
      ? null
      : majUn(p, id, () => ({ ...c, cols: repartir([...c.cols, x as Bloc]) }));
  if ('els' in c) return majUn(p, id, () => ({ ...c, els: [...c.els, x as Element] }));
  return null;
}

/** Insère `x` avant ou après son voisin `id` (même niveau). */
function insererPres(
  p: PageSite,
  id: string,
  x: Noeud,
  position: 'avant' | 'apres',
  repartirBlocs: boolean,
): PageSite | null {
  return majListe(p, id, (l, i) => {
    if (repartirBlocs && l.length >= BLOCS_MAX) return null;
    const r = [...l];
    r.splice(position === 'avant' ? i : i + 1, 0, x);
    return repartirBlocs ? repartir(r as Bloc[]) : r;
  });
}

/**
 * Glisser-déposer (panneau Structure) : `id` passe avant ou après un voisin de même niveau, ou à
 * la fin d'un conteneur du niveau au-dessus (`dans`). Un bloc qui change de section : les deux
 * sections sont réparties sur 12 unités ; une section garde au moins un bloc. `null` si refusé.
 */
export function deplacerNoeud(
  p: PageSite,
  id: string,
  cible: string,
  position: 'avant' | 'apres' | 'dans',
): PageSite | null {
  const a = trouverNoeud(p, id);
  const b = trouverNoeud(p, cible);
  if (!a || !b || b.chaine.some((x) => x.id === id)) return null;
  const na = NIVEAUX.indexOf(a.niveau);
  const nb = NIVEAUX.indexOf(b.niveau);
  if (position === 'dans' ? nb !== na - 1 : nb !== na) return null;
  const bloc = a.niveau === 'bloc';
  const parentA = a.chaine.at(-2)?.id;
  const parentB = position === 'dans' ? cible : b.chaine.at(-2)?.id;
  const autreSection = bloc && parentA !== parentB;
  if (autreSection && a.n === 1) return null;
  const sans = majListe(p, id, (l, i) => {
    const r = l.filter((_, j) => j !== i);
    return autreSection ? repartir(r as Bloc[]) : r;
  });
  if (!sans) return null;
  return position === 'dans'
    ? ajouterEnfant(sans, cible, a.noeud)
    : insererPres(sans, cible, a.noeud, position, autreSection);
}

/**
 * Coller (Ctrl V) une copie de `x` (nouveaux identifiants) : après le nœud de même niveau de la
 * sélection, ou dans le conteneur sélectionné ; sans sélection, une zone ou une section part en
 * bas de la page. Renvoie la page et l'identifiant de la copie, ou `null` si impossible.
 */
export function collerNoeud(
  p: PageSite,
  x: Noeud,
  cible: string | null,
  nouvelId: () => string,
): { page: PageSite; id: string } | null {
  const c = copie(x, nouvelId);
  const nx = NIVEAUX.indexOf(niveauDe(x));
  const f = cible ? trouverNoeud(p, cible) : null;
  if (!f) {
    if (nx === 0) return { page: { ...p, sections: [...p.sections, c as Section] }, id: c.id };
    const z = zoneVide(nouvelId);
    const avecZone = { ...p, sections: [...p.sections, z] };
    if (nx === 1) return { page: ajouterEnfant(avecZone, z.id, c)!, id: c.id };
    return null;
  }
  const nf = NIVEAUX.indexOf(f.niveau);
  if (nf >= nx) {
    const r = insererPres(p, f.chaine[nx]!.id, c, 'apres', nx === 2);
    return r ? { page: r, id: c.id } : null;
  }
  // Conteneur plus haut que le parent : on descend dans sa dernière section, son premier bloc.
  let conteneur: Noeud | undefined = f.noeud;
  for (let n = nf; n < nx - 1 && conteneur; n++)
    conteneur = 'rows' in conteneur ? conteneur.rows.at(-1) : (conteneur as Ligne).cols[0];
  const r = conteneur ? ajouterEnfant(p, conteneur.id, c) : null;
  return r ? { page: r, id: c.id } : null;
}
