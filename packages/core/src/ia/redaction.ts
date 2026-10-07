import { z } from '../zod';

/**
 * Assistant de rédaction des artisans (IA_ADMIN §8) : relire, réécrire (4 tons), rédiger un
 * chantier à partir des infos. Même objectif que l'audit : que les particuliers contactent
 * l'artisan, sans jamais inventer un fait absent du texte ou de la fiche.
 */
export const TYPES_REDACTION = ['apropos', 'projet'] as const;
export const ACTIONS_REDACTION = ['relire', 'reecrire', 'generer'] as const;
export const TONS_REDACTION = ['professionnel', 'chaleureux', 'court', 'convaincant'] as const;
export type TypeRedaction = (typeof TYPES_REDACTION)[number];

export const LIMITES_REDACTION: Readonly<Record<TypeRedaction, number>> = {
  apropos: 1200,
  projet: 400,
};
export const QUOTA_REDACTION_JOUR = 20;
export const LIBELLES_TON: Readonly<Record<(typeof TONS_REDACTION)[number], string>> = {
  professionnel: 'Plus professionnel',
  chaleureux: 'Plus chaleureux',
  court: 'Plus court',
  convaincant: 'Plus convaincant',
};

export const sortieRedaction = z.object({
  texte: z.string().trim().min(1).max(1200),
  changements: z.array(z.string().trim().min(1).max(200)).max(10).default([]),
});
export type SortieRedaction = z.infer<typeof sortieRedaction>;

/** Certifications reconnues dans un texte → label de fiche qui les prouve. */
const CERTIFICATIONS: readonly [RegExp, string][] = [
  [/\bRGE\b/i, 'rge'],
  [/\bqualibat\b/i, 'qualibat'],
  [/\bd[ée]cennale\b/i, 'decennale'],
];

/**
 * Contrôle serveur d'une proposition : longueur selon le type, et toute certification citée
 * doit figurer dans les labels vérifiés de la fiche, sauf si l'artisan l'avait déjà écrite.
 */
export function controlerRedaction(
  proposition: string,
  e: { type: TypeRedaction; texte: string },
  labels: readonly string[],
): string[] {
  const ecarts: string[] = [];
  if (proposition.length > LIMITES_REDACTION[e.type])
    ecarts.push(
      `texte trop long (${proposition.length} caractères, ${LIMITES_REDACTION[e.type]} au plus)`,
    );
  for (const [motif, label] of CERTIFICATIONS)
    if (motif.test(proposition) && !motif.test(e.texte) && !labels.includes(label))
      ecarts.push(`certification non vérifiée sur la fiche : ${label}`);
  return ecarts;
}

const CONSIGNES_ACTION = {
  relire:
    'Corrige l’orthographe, la grammaire, la ponctuation et la typographie française (espaces insécables, guillemets « », apostrophes typographiques) sans changer le sens ni le style.',
  reecrire:
    'Réécris le texte dans le ton demandé : ce que fait l’artisan, pour qui et où, pourquoi le choisir, et une invitation à demander un devis.',
  generer:
    'Rédige 2 à 4 phrases présentant ce chantier à partir du titre, du métier, de la ville et des notes de l’artisan.',
} as const;

/** Prompt système (stable), fiche de l'entreprise (contexte) et demande d'une rédaction. */
export function promptRedaction(
  e: {
    type: TypeRedaction;
    action: (typeof ACTIONS_REDACTION)[number];
    ton?: (typeof TONS_REDACTION)[number];
    texte: string;
    infos?: { titre?: string; ville?: string; notes?: string };
  },
  fiche: { nom: string; metiers: readonly string[]; ville: string; labels: readonly string[] },
) {
  const systeme = [
    'Tu aides un artisan du bâtiment à rédiger le texte de sa fiche sur Portail Habitat, pour que des particuliers lui demandent un devis.',
    'Règles impératives : n’invente aucun fait absent du texte ou des informations fournies (années d’expérience, chiffres, certifications, marques, garanties, prix). Écris en français, à la première personne du pluriel si le texte est déjà écrit ainsi, sinon à la première personne. N’écris jamais « lead ».',
    'Réponds en JSON : { "texte": la proposition, "changements": liste courte de ce que tu as modifié }.',
  ].join('\n');
  const contexte = `Entreprise : ${fiche.nom} · métiers : ${fiche.metiers.join(', ') || 'non précisés'} · ville : ${fiche.ville || 'non précisée'} · labels vérifiés : ${fiche.labels.join(', ') || 'aucun'}.`;
  const demande = [
    `Type : ${e.type === 'apropos' ? 'présentation « À propos »' : 'description d’un chantier'} (${LIMITES_REDACTION[e.type]} caractères au plus).`,
    CONSIGNES_ACTION[e.action],
    ...(e.ton ? [`Ton demandé : ${LIBELLES_TON[e.ton]}.`] : []),
    ...(e.infos ? [`Informations : ${JSON.stringify(e.infos)}`] : []),
    `Texte de l’artisan :\n${e.texte || '(vide)'}`,
  ].join('\n');
  return { systeme, contexte, demande };
}

export const SCHEMA_JSON_REDACTION: Record<string, unknown> = {
  type: 'object',
  properties: {
    texte: { type: 'string' },
    changements: { type: 'array', items: { type: 'string' } },
  },
  required: ['texte', 'changements'],
  additionalProperties: false,
};
