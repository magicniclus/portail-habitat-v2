import { z } from '../zod';
import { valeurDansContexte } from './sortie';

/**
 * Questions de suivi sur une analyse (IA_ADMIN §4) et effet mesuré 30 jours après une
 * recommandation « faite » (§5) : mêmes garde-fous que l'analyse, aucune valeur inventée.
 */
const J = 86_400_000;
export const MAX_SUIVIS = 10;
export const DELAI_EFFET_JOURS = 30;

const texte = (max: number) => z.string().trim().min(1).max(max);
const preuve = z.object({ source: texte(60), ref: texte(160), valeur: texte(60) });

export const sortieSuiviIa = z.object({
  reponse: texte(1500),
  preuves: z.array(preuve).max(6),
});
export type SortieSuiviIa = z.infer<typeof sortieSuiviIa>;

export const VERDICTS_EFFET = ['amelioration', 'degradation', 'stable', 'indetermine'] as const;
export const LIBELLES_VERDICT_EFFET: Readonly<Record<(typeof VERDICTS_EFFET)[number], string>> = {
  amelioration: 'Amélioration',
  degradation: 'Dégradation',
  stable: 'Pas d’effet visible',
  indetermine: 'Effet non mesurable',
};

export const sortieEffetIa = z.object({
  verdict: z.enum(VERDICTS_EFFET),
  resume: texte(500),
  mesures: z.array(z.object({ ref: texte(160), avant: texte(60), apres: texte(60) })).max(6),
});
export type SortieEffetIa = z.infer<typeof sortieEffetIa>;

const chaine = { type: 'string' };
const objet = (props: Record<string, unknown>) => ({
  type: 'object',
  properties: props,
  required: Object.keys(props),
  additionalProperties: false,
});

export const SCHEMA_JSON_SUIVI = objet({
  reponse: chaine,
  preuves: { type: 'array', items: objet({ source: chaine, ref: chaine, valeur: chaine }) },
});
export const SCHEMA_JSON_EFFET = objet({
  verdict: { type: 'string', enum: [...VERDICTS_EFFET] },
  resume: chaine,
  mesures: { type: 'array', items: objet({ ref: chaine, avant: chaine, apres: chaine }) },
});

export function controlerSuivi(s: SortieSuiviIa, contexte: string): string[] {
  return s.preuves
    .filter((p) => !valeurDansContexte(p.valeur, contexte))
    .map((p) => `valeur absente du contexte : « ${p.valeur} »`);
}

export function demandeSuivi(
  analyse: { resume: string; recommandations: string[] },
  precedents: readonly { question: string; reponse: string }[],
  question: string,
): string {
  return [
    'Question de suivi sur ton analyse précédente. Réponds en français, brièvement, en citant les valeurs du contexte telles quelles.',
    `Résumé de l’analyse : ${analyse.resume}`,
    `Recommandations : ${analyse.recommandations.map((t) => `« ${t} »`).join(', ')}.`,
    ...precedents.flatMap((p) => [`Question : ${p.question}`, `Réponse : ${p.reponse}`]),
    `Question : ${question}`,
  ].join('\n');
}

/** Mesure due : recommandation « faite » depuis 30 jours et pas encore mesurée. */
export function effetDu(
  r: { statut: string; faiteLe?: number; effet?: unknown },
  maintenant: number,
): boolean {
  return (
    r.statut === 'faite' &&
    r.faiteLe !== undefined &&
    r.effet === undefined &&
    maintenant - r.faiteLe >= DELAI_EFFET_JOURS * J
  );
}

export function controlerEffet(
  s: SortieEffetIa,
  preuves: readonly { valeur: string }[],
  contexte: string,
): string[] {
  const ecarts: string[] = [];
  if (!s.mesures.length && s.verdict !== 'indetermine')
    ecarts.push('aucune mesure pour ce verdict');
  const origine = preuves.map((p) => p.valeur).join(' | ');
  for (const m of s.mesures) {
    if (!valeurDansContexte(m.avant, origine))
      ecarts.push(`valeur « avant » absente des preuves d’origine : « ${m.avant} »`);
    if (!valeurDansContexte(m.apres, contexte))
      ecarts.push(`valeur « après » absente du contexte actuel : « ${m.apres} »`);
  }
  return ecarts;
}

export function demandeEffet(
  r: { titre: string; constat: string; preuves: readonly { ref: string; valeur: string }[] },
  faiteLe: number,
): string {
  return [
    `Recommandation appliquée le ${new Date(faiteLe).toISOString().slice(0, 10)} : « ${r.titre} ».`,
    `Constat d’alors : ${r.constat}`,
    'Valeurs d’alors (preuves) :',
    ...r.preuves.map((p) => `- ${p.ref} : ${p.valeur}`),
    'Compare chacune avec la même mesure dans le contexte actuel. « avant » = la valeur d’alors recopiée telle quelle, « après » = la valeur actuelle recopiée telle quelle. Si la mesure n’existe plus, verdict « indetermine » sans mesure. N’attribue pas un changement à la recommandation sans le dire avec prudence.',
  ].join('\n');
}
