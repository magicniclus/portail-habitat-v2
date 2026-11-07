import { z } from '../../zod';
import { DEFAUTS_COLONNE, DEFAUTS_LIGNE, DEFAUTS_SECTION, elementDuCatalogue } from '../catalogue';
import {
  action,
  navigation as schemaNavigation,
  pageSite,
  theme as schemaTheme,
  type Element,
  type Navigation,
  type PageSite,
  type Section,
  type Theme,
  type TypeElement,
} from '../schemas';

/**
 * IA du site (IA_SITE §2, D49) : le modèle ne renvoie jamais de HTML, seulement des opérations sur
 * l'arbre du site. Tout est revalidé ici, côté serveur avant affichage et côté éditeur à
 * l'application : une opération invalide fait refuser toute la proposition.
 */
export const A_COMPLETER = '[à compléter]';

const TYPES_ELEMENT = [
  'titre',
  'surtitre',
  'texte',
  'bouton',
  'image',
  'liste',
  'avis',
  'chiffre',
  'formulaire',
  'video',
  'carte',
  'espace',
  'separateur',
  'logo',
  'menu',
  'blog',
] as const satisfies readonly TypeElement[];

const id = z.string().min(1).max(60);
const reglages = z.record(z.string().max(40), z.unknown());

/** Section proposée par l'IA : sans identifiants (générés ici), réglages du catalogue seulement. */
const sectionIa = z.object({
  p: reglages.optional(),
  rows: z
    .array(
      z.object({
        p: reglages.optional(),
        cols: z
          .array(
            z.object({
              w: z.number().int().min(1).max(12),
              p: reglages.optional(),
              els: z
                .array(z.object({ type: z.enum(TYPES_ELEMENT), p: reglages.optional() }))
                .max(40),
            }),
          )
          .min(1)
          .max(6),
      }),
    )
    .min(1)
    .max(20),
});
export type SectionIa = z.output<typeof sectionIa>;

const CHAMPS_TEXTE = [
  'texte',
  'texteMobile',
  'legende',
  'label',
  'nom',
  'valeur',
  'bouton',
] as const;

export const operationIa = z.discriminatedUnion('op', [
  z.object({
    op: z.literal('texte'),
    cible: id,
    champ: z.enum(CHAMPS_TEXTE),
    valeur: z.string().max(5000),
  }),
  z.object({ op: z.literal('props'), cible: id, patch: reglages }),
  z.object({ op: z.literal('insererSection'), page: id, apres: id.nullable(), section: sectionIa }),
  z.object({ op: z.literal('remplacerSection'), cible: id, section: sectionIa }),
  z.object({ op: z.literal('supprimer'), cible: id }),
  z.object({ op: z.literal('deplacer'), cible: id, index: z.number().int().min(0).max(40) }),
  z.object({
    op: z.literal('creerPage'),
    page: z.object({
      nom: z.string().trim().min(1).max(80),
      slug: z.string().max(80).optional(),
      menu: z.boolean().optional(),
      seo: z
        .object({
          title: z.string().max(120),
          meta: z.string().max(320),
          motCle: z.string().max(80),
        })
        .partial()
        .optional(),
      sections: z.array(sectionIa).min(1).max(12),
    }),
  }),
  z.object({ op: z.literal('supprimerPage'), cible: id }),
  /** Création assistée : contenu complet d'une page existante (accueil, contact) réécrit. */
  z.object({
    op: z.literal('remplacerContenuPage'),
    cible: id,
    sections: z.array(sectionIa).min(1).max(12),
    seo: z
      .object({ title: z.string().max(120), meta: z.string().max(320), motCle: z.string().max(80) })
      .partial()
      .optional(),
  }),
  z.object({ op: z.literal('theme'), patch: reglages }),
  z.object({ op: z.literal('navigation'), patch: reglages }),
  z.object({
    op: z.literal('seo'),
    page: id,
    patch: z
      .object({ title: z.string().max(120), meta: z.string().max(320), motCle: z.string().max(80) })
      .partial(),
  }),
  z.object({ op: z.literal('lien'), cible: id, lid: z.string().regex(/^L\d{1,4}$/), action }),
]);
export type OperationIa = z.output<typeof operationIa>;

/** Sortie structurée demandée au modèle (sorties structurées : objets fermés, pas de récursion). */
export const SCHEMA_JSON_IA_SITE: Record<string, unknown> = {
  type: 'object',
  properties: {
    resume: { type: 'string' },
    question: { type: 'string' },
    operations: { type: 'string' },
  },
  required: ['resume', 'question', 'operations'],
  additionalProperties: false,
};

export interface SortieIa {
  resume: string;
  /** Question de précision (IA_SITE §3.2) ; vide si l'IA propose directement. */
  question: string;
  operations: OperationIa[];
}

/** Lecture de la réponse du modèle : JSON, puis opérations (texte JSON) validées une à une. */
export function lireSortieIa(
  texte: string,
  max = 60,
): { ok: true; sortie: SortieIa } | { ok: false; erreur: string } {
  try {
    const brut = z
      .object({
        resume: z.string().max(2000),
        question: z.string().max(500),
        operations: z.string(),
      })
      .parse(JSON.parse(texte));
    const ops = z
      .array(operationIa)
      .max(max)
      .safeParse(brut.operations.trim() ? JSON.parse(brut.operations) : []);
    if (!ops.success)
      return { ok: false, erreur: `Opérations hors schéma : ${ops.error.message.slice(0, 500)}` };
    return {
      ok: true,
      sortie: { resume: brut.resume, question: brut.question, operations: ops.data },
    };
  } catch (e) {
    return { ok: false, erreur: `Réponse illisible : ${String(e).slice(0, 200)}` };
  }
}

export interface BrouillonIa {
  pages: Record<string, PageSite>;
  navigation: Navigation;
  theme: Theme;
}

type Noeud =
  | { genre: 'section'; pageId: string; section: Section }
  | { genre: 'ligne' | 'colonne'; pageId: string; p: Record<string, unknown> }
  | { genre: 'element'; pageId: string; el: Element };

function trouver(b: BrouillonIa, cible: string): Noeud | null {
  for (const [pageId, page] of Object.entries(b.pages))
    for (const s of page.sections) {
      if (s.id === cible) return { genre: 'section', pageId, section: s };
      for (const r of s.rows) {
        if (r.id === cible) return { genre: 'ligne', pageId, p: r.p as Record<string, unknown> };
        for (const c of r.cols) {
          if (c.id === cible)
            return { genre: 'colonne', pageId, p: c.p as Record<string, unknown> };
          for (const e of c.els) if (e.id === cible) return { genre: 'element', pageId, el: e };
        }
      }
    }
  return null;
}

/** Section complète : identifiants neufs, réglages du catalogue complétés par ceux de l'IA. */
export function construireSection(s: SectionIa, nouvelId: () => string): Section {
  return {
    id: nouvelId(),
    p: { ...DEFAUTS_SECTION, ...(s.p ?? {}) } as Section['p'],
    rows: s.rows.map((r) => ({
      id: nouvelId(),
      p: { ...DEFAUTS_LIGNE, ...(r.p ?? {}) } as Section['rows'][number]['p'],
      cols: r.cols.map((c) => ({
        id: nouvelId(),
        w: c.w,
        p: { ...DEFAUTS_COLONNE, ...(c.p ?? {}) } as Section['rows'][number]['cols'][number]['p'],
        els: c.els.map((e) => elementDuCatalogue(e.type, nouvelId(), e.p ?? {})),
      })),
    })),
  };
}

const PAGES_PROTEGEES = new Set(['accueil', 'mentions']);
const enSlug = (t: string) =>
  t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

/** Applique une opération sur une copie ; renvoie l'erreur éventuelle. */
function appliquerUne(b: BrouillonIa, o: OperationIa, nouvelId: () => string): string | null {
  switch (o.op) {
    case 'texte': {
      const n = trouver(b, o.cible);
      if (n?.genre !== 'element') return `Élément introuvable : ${o.cible}`;
      const p = n.el.p as Record<string, unknown>;
      if (o.champ === 'texteMobile') {
        if (!('texte' in p)) return `Pas de texte mobile pour ${o.cible}`;
        p.texteMobileOn = true;
      } else if (!(o.champ in p)) return `Champ « ${o.champ} » absent de ${o.cible}`;
      p[o.champ] = o.valeur;
      return null;
    }
    case 'props': {
      const n = trouver(b, o.cible);
      if (!n) return `Bloc introuvable : ${o.cible}`;
      const { id: _i, type: _t, ...patch } = o.patch;
      const cible = n.genre === 'section' ? n.section.p : n.genre === 'element' ? n.el.p : n.p;
      Object.assign(cible, patch);
      return null;
    }
    case 'insererSection': {
      const page = b.pages[o.page];
      if (!page) return `Page introuvable : ${o.page}`;
      const i = o.apres === null ? -1 : page.sections.findIndex((s) => s.id === o.apres);
      if (o.apres !== null && i < 0) return `Section introuvable : ${o.apres}`;
      page.sections.splice(i + 1, 0, construireSection(o.section, nouvelId));
      return null;
    }
    case 'remplacerSection': {
      const n = trouver(b, o.cible);
      if (n?.genre !== 'section') return `Section introuvable : ${o.cible}`;
      const page = b.pages[n.pageId]!;
      page.sections[page.sections.indexOf(n.section)] = construireSection(o.section, nouvelId);
      return null;
    }
    case 'supprimer': {
      for (const page of Object.values(b.pages)) {
        const i = page.sections.findIndex((s) => s.id === o.cible);
        if (i >= 0) return (void page.sections.splice(i, 1), null);
        for (const s of page.sections)
          for (const r of s.rows)
            for (const c of r.cols) {
              const j = c.els.findIndex((e) => e.id === o.cible);
              if (j >= 0) return (void c.els.splice(j, 1), null);
            }
      }
      return `Bloc introuvable : ${o.cible}`;
    }
    case 'deplacer': {
      const n = trouver(b, o.cible);
      if (n?.genre !== 'section') return `Section introuvable : ${o.cible}`;
      const page = b.pages[n.pageId]!;
      page.sections.splice(page.sections.indexOf(n.section), 1);
      page.sections.splice(Math.min(o.index, page.sections.length), 0, n.section);
      return null;
    }
    case 'creerPage': {
      const base = enSlug(o.page.slug || o.page.nom) || 'page';
      const pris = new Set(Object.values(b.pages).map((p) => p.slug));
      let slug = base;
      for (let k = 2; pris.has(slug); k++) slug = `${base}-${k}`;
      let pid = slug.replace(/-/g, '_').slice(0, 36);
      for (let k = 2; b.pages[pid]; k++) pid = `${slug.replace(/-/g, '_').slice(0, 36)}_${k}`;
      b.pages[pid] = {
        nom: o.page.nom,
        court: o.page.nom.slice(0, 40),
        slug,
        type: 'libre',
        statut: 'brouillon',
        ordre: Math.max(0, ...Object.values(b.pages).map((p) => p.ordre)) + 1,
        sansNavigation: false,
        menu: o.page.menu ?? true,
        seo: { title: '', meta: '', motCle: '', ...(o.page.seo ?? {}) },
        sections: o.page.sections.map((s) => construireSection(s, nouvelId)),
      };
      return null;
    }
    case 'remplacerContenuPage': {
      const page = b.pages[o.cible];
      if (!page) return `Page introuvable : ${o.cible}`;
      page.sections = o.sections.map((x) => construireSection(x, nouvelId));
      page.seo = { ...page.seo, ...(o.seo ?? {}) };
      return null;
    }
    case 'supprimerPage':
      if (PAGES_PROTEGEES.has(o.cible))
        return 'L’accueil et les mentions légales ne se suppriment pas.';
      if (!b.pages[o.cible]) return `Page introuvable : ${o.cible}`;
      delete b.pages[o.cible];
      return null;
    case 'theme':
      Object.assign(b.theme, o.patch);
      return null;
    case 'navigation':
      Object.assign(b.navigation, o.patch);
      return null;
    case 'seo': {
      const page = b.pages[o.page];
      if (!page) return `Page introuvable : ${o.page}`;
      page.seo = { ...page.seo, ...o.patch };
      return null;
    }
    case 'lien': {
      const n = trouver(b, o.cible);
      if (n?.genre !== 'element' || (n.el.type !== 'titre' && n.el.type !== 'texte'))
        return `Texte introuvable : ${o.cible}`;
      n.el.p.liens = { ...(n.el.p.liens ?? {}), [o.lid]: o.action };
      return null;
    }
  }
}

/**
 * Applique toute la proposition sur une copie du brouillon (l'original n'est jamais modifié :
 * l'éditeur l'empile en une seule étape d'historique, SITE-IA-06). Une seule erreur, ou un
 * résultat hors schéma, et rien n'est appliqué (SITE-IA-04).
 */
export function appliquerOperations(
  b: BrouillonIa,
  ops: OperationIa[],
  nouvelId: () => string,
): { ok: true; brouillon: BrouillonIa } | { ok: false; erreurs: string[] } {
  const copie = structuredClone(b);
  const erreurs = ops.map((o) => appliquerUne(copie, o, nouvelId)).filter((e): e is string => !!e);
  if (erreurs.length) return { ok: false, erreurs };
  for (const [pid, p] of Object.entries(copie.pages)) {
    const r = pageSite.safeParse(p);
    if (!r.success)
      return { ok: false, erreurs: [`Page ${pid} invalide : ${r.error.issues[0]?.message ?? ''}`] };
    copie.pages[pid] = r.data;
  }
  const nav = schemaNavigation.safeParse(copie.navigation);
  const theme = schemaTheme.safeParse(copie.theme);
  if (!nav.success) return { ok: false, erreurs: ['Navigation invalide'] };
  if (!theme.success) return { ok: false, erreurs: ['Thème invalide'] };
  return { ok: true, brouillon: { pages: copie.pages, navigation: nav.data, theme: theme.data } };
}

const CERTIFICATIONS = [
  'RGE',
  'Qualibat',
  'Qualifelec',
  'QualiPAC',
  'QualiSol',
  'QualiBois',
  'Handibat',
  'Eco Artisan',
  'décennale',
];
const RE_FAITS = new RegExp(
  `\\b(${CERTIFICATIONS.join('|')})\\b|(\\d+(?:[ ,.]\\d+)*(?:/\\d+)?)`,
  'giu',
);
const normaliserNombre = (n: string) => n.replace(/\s/g, '');

/**
 * Garde-fou des faits (IA_SITE §2.2.4) : tout chiffre, année, note ou certification absent des
 * sources autorisées (fiche vérifiée, réponses de l'artisan, texte existant) devient
 * `[à compléter]`, signalé dans l'éditeur et bloquant à la publication (SITE-IA-05).
 */
export function garderFaits(
  texte: string,
  sources: string,
): { texte: string; remplaces: string[] } {
  const nombres = new Set(
    [...sources.matchAll(RE_FAITS)].filter((m) => m[2]).map((m) => normaliserNombre(m[2]!)),
  );
  // Mots entiers : « RGE » ne doit pas être trouvé dans « charge ».
  const certs = new Set(
    [...sources.matchAll(RE_FAITS)].filter((m) => m[1]).map((m) => m[1]!.toLowerCase()),
  );
  const remplaces: string[] = [];
  const sortie = texte.replace(RE_FAITS, (tout: string, cert?: string, nombre?: string) => {
    const connu = cert ? certs.has(cert.toLowerCase()) : nombres.has(normaliserNombre(nombre!));
    if (connu) return tout;
    remplaces.push(tout);
    return A_COMPLETER;
  });
  return { texte: sortie, remplaces };
}

/** Éléments dont un texte contient encore `[à compléter]` : la publication est refusée. */
export function textesACompleter(
  pages: Record<string, Pick<PageSite, 'nom' | 'sections'>>,
): { pageId: string; page: string; elementId: string }[] {
  const r: { pageId: string; page: string; elementId: string }[] = [];
  for (const [pageId, p] of Object.entries(pages))
    for (const s of p.sections)
      for (const l of s.rows)
        for (const c of l.cols)
          for (const e of c.els)
            if (JSON.stringify(e.p).includes(A_COMPLETER))
              r.push({ pageId, page: p.nom, elementId: e.id });
  return r;
}

const court = (t: unknown) => {
  const s = String(t ?? '').replace(/\s+/g, ' ');
  return s.length > 120 ? `${s.slice(0, 120)}…` : s;
};

/** Résumé de l'arbre envoyé au modèle (ids, types, textes tronqués à 120 caractères). */
export function resumeArbre(b: BrouillonIa): string {
  const lignes: string[] = [
    `theme: palette=${JSON.stringify(b.theme.palette)} polices=${b.theme.polices} ton=${b.theme.ton}`,
    `navigation: nom="${court(b.navigation.nom)}" liens=${b.navigation.liens.map((l) => l.label).join(', ')}`,
  ];
  for (const [pid, p] of Object.entries(b.pages)) {
    lignes.push(
      `page ${pid} "${court(p.nom)}" /${p.slug} statut=${p.statut} seo.title="${court(p.seo.title)}"`,
    );
    for (const s of p.sections) {
      lignes.push(`  section ${s.id} "${court(s.p.nom)}" fond=${s.p.fond}`);
      for (const r of s.rows)
        for (const c of r.cols)
          for (const e of c.els) {
            const q = e.p as Record<string, unknown>;
            lignes.push(
              `    ${e.id} ${e.type}: ${court(q.texte ?? q.legende ?? q.label ?? q.nom ?? '')}`,
            );
          }
    }
  }
  return lignes.join('\n');
}

/** Textes visibles du site (jamais les réglages numériques) : source autorisée des faits. */
export function textesDuSite(pages: Record<string, Pick<PageSite, 'sections' | 'seo'>>): string {
  const t: string[] = [];
  for (const p of Object.values(pages)) {
    t.push(p.seo.title, p.seo.meta);
    for (const s of p.sections)
      for (const r of s.rows)
        for (const c of r.cols)
          for (const e of c.els) {
            const q = e.p as Record<string, unknown>;
            for (const k of ['texte', 'texteMobile', 'legende', 'label', 'valeur', 'nom', 'bouton'])
              if (typeof q[k] === 'string') t.push(q[k] as string);
            if (Array.isArray(q.items)) t.push(...(q.items as string[]));
          }
  }
  return t.join('\n');
}
