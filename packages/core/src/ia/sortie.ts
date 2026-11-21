import { z } from '../zod';

/** Assistant IA de l'admin (IA_ADMIN.md) : contrat de sortie et contrôles automatiques. */
export const ETAPES_ENTONNOIR = [
  'Acquisition (trafic)',
  'Landing → intérêt',
  'Inscription / demande',
  'Activation (fiche en ligne)',
  '1er paiement',
  'Montée en gamme',
  'Rétention',
] as const;

export const PERIMETRES_IA = ['landings', 'parcours', 'emails', 'offres', 'fiches'] as const;
export type PerimetreIa = (typeof PERIMETRES_IA)[number];
export const MODES_IA = ['rapide', 'audit'] as const;
export type ModeIa = (typeof MODES_IA)[number];

const NIVEAUX = ['élevé', 'moyen', 'faible'] as const;
export const TYPES_ACTION_IA = ['ab_test', 'tache', 'texte', 'sequence', 'prix'] as const;

const texte = (max: number) => z.string().trim().min(1).max(max);

export const recommandationSortie = z.object({
  titre: texte(160),
  perimetre: texte(80),
  etape: z.enum(ETAPES_ENTONNOIR),
  gainEstime: texte(80),
  priorite: z.number().int().min(1).max(5),
  impact: z.enum(NIVEAUX),
  effort: z.enum(NIVEAUX),
  confiance: z.number().min(0).max(1),
  constat: texte(600),
  preuves: z
    .array(z.object({ source: texte(60), ref: texte(160), valeur: texte(60) }))
    .min(1)
    .max(6),
  action: z.object({ type: z.enum(TYPES_ACTION_IA), details: texte(400) }),
  propositionTexte: z.string().trim().max(600).optional(),
});

export const sortieAnalyseIa = z.object({
  resume: texte(700),
  recommandations: z.array(recommandationSortie).min(1).max(12),
  etapes: z
    .array(
      z.object({
        etape: z.enum(ETAPES_ENTONNOIR),
        score: z.number().int().min(0).max(100),
        constat: texte(300),
      }),
    )
    .max(7)
    .optional(),
  gainTotal: z.string().trim().max(120).optional(),
  questionsOuvertes: z.array(texte(300)).max(6).default([]),
});
export type SortieAnalyseIa = z.infer<typeof sortieAnalyseIa>;

/** Nombre de recommandations attendu par mode (IA-04). */
export const BORNES_MODE: Record<ModeIa, { min: number; max: number }> = {
  rapide: { min: 3, max: 6 },
  audit: { min: 6, max: 12 },
};

/** Forme comparable d'une valeur : espaces, virgules décimales et casse neutralisés. */
const normaliser = (v: string) =>
  v
    .toLowerCase()
    .replace(/[\s\u00a0\u202f]+/g, '')
    .replace(/,/g, '.');

/** La valeur citée figure-t-elle dans le texte source (espaces, virgules et casse neutralisés) ? */
export function valeurDansContexte(valeur: string, contexte: string): boolean {
  return normaliser(contexte).includes(normaliser(valeur));
}

/**
 * Contrôles après le schéma (IA-01, IA-04, IA-05) : nombre de recommandations et d'étapes selon
 * le mode, et **chaque valeur citée doit exister dans le contexte fourni** (sinon elle est
 * inventée). Rend la liste des écarts, vide si la sortie est acceptable.
 */
export function controlerSortie(s: SortieAnalyseIa, mode: ModeIa, contexte: string): string[] {
  const ecarts: string[] = [];
  const { min, max } = BORNES_MODE[mode];
  const n = s.recommandations.length;
  if (n < min || n > max) ecarts.push(`${n} recommandations au lieu de ${min} à ${max}`);
  if (mode === 'audit') {
    const notees = new Set((s.etapes ?? []).map((e) => e.etape));
    const manquantes = ETAPES_ENTONNOIR.filter((e) => !notees.has(e));
    if (manquantes.length) ecarts.push(`étapes non notées : ${manquantes.join(', ')}`);
  }
  const source = normaliser(contexte);
  for (const r of s.recommandations)
    for (const p of r.preuves)
      if (!source.includes(normaliser(p.valeur)))
        ecarts.push(`valeur absente du contexte : « ${p.valeur} » (${r.titre})`);
  return ecarts;
}

/** Schéma JSON envoyé au modèle (sorties structurées) ; Zod reste juge en dernier ressort. */
export function schemaJsonSortie(): Record<string, unknown> {
  const chaine = { type: 'string' };
  const objet = (props: Record<string, unknown>, requis = Object.keys(props)) => ({
    type: 'object',
    properties: props,
    required: requis,
    additionalProperties: false,
  });
  const niveau = { type: 'string', enum: [...NIVEAUX] };
  const etape = { type: 'string', enum: [...ETAPES_ENTONNOIR] };
  return objet(
    {
      resume: chaine,
      recommandations: {
        type: 'array',
        items: objet(
          {
            titre: chaine,
            perimetre: chaine,
            etape,
            gainEstime: chaine,
            priorite: { type: 'integer' },
            impact: niveau,
            effort: niveau,
            confiance: { type: 'number' },
            constat: chaine,
            preuves: {
              type: 'array',
              items: objet({ source: chaine, ref: chaine, valeur: chaine }),
            },
            action: objet({
              type: { type: 'string', enum: [...TYPES_ACTION_IA] },
              details: chaine,
            }),
            propositionTexte: chaine,
          },
          [
            'titre',
            'perimetre',
            'etape',
            'gainEstime',
            'priorite',
            'impact',
            'effort',
            'confiance',
            'constat',
            'preuves',
            'action',
          ],
        ),
      },
      etapes: {
        type: 'array',
        items: objet({ etape, score: { type: 'integer' }, constat: chaine }),
      },
      gainTotal: chaine,
      questionsOuvertes: { type: 'array', items: chaine },
    },
    ['resume', 'recommandations', 'questionsOuvertes'],
  );
}
