/**
 * Filtre des demandes à l'IA du site (IA_SITE §5), appliqué avant tout appel et toute
 * consommation de crédit : contenu illicite ou trompeur, insultes, dénigrement d'un concurrent.
 * Volontairement simple et prévisible ; le prompt système porte les mêmes règles.
 */
export type ModerationIa =
  { ok: true } | { ok: false; motif: 'illicite' | 'denigrement'; message: string };

const normaliser = (t: string) =>
  t.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’`]/g, "'").toLowerCase();

const INSULTES =
  /\b(connard|connasse|salope|encul\w*|pute|batard|enfoire\w*|abruti\w*|nique[rz]?|fdp)\b/;
const ILLICITE = [
  /\bsans factur/,
  /\bau (noir|black)\b/,
  /\bnon declare/,
  /\b(faux|fausses?) (avis|temoignages?|certifications?|labels?|rge|qualibat|assurances?|decennale|garanties?)\b/,
  /\bavis (fictifs?|bidons?|inventes?)\b/,
  /\binvent\w* .{0,30}\b(avis|temoignages?|certifications?)\b/,
  /\b(certifie\w*|labellise\w*|assure\w*|rge|qualibat)\b.{0,50}\b(meme si|alors que|pas le cas)\b/,
];
const DENIGRANT =
  /\b(arnaque\w*|escroc\w*|voleurs?|nul(le)?s?|pires?|incompetent\w*|charlatans?|malhonnetes?|bras casses|bons? a rien)\b/;

/** Un concurrent est visé : le mot lui-même, ou un nom propre après le premier mot. */
function viseUnTiers(original: string, norm: string): boolean {
  if (/\bconcurren/.test(norm)) return true;
  return original
    .split(/\s+/)
    .slice(1)
    .some((m) => /^\p{Lu}/u.test(m.replace(/^[^\p{L}]+/u, '')));
}

export function modererDemandeIa(demande: string): ModerationIa {
  const n = normaliser(demande);
  if (INSULTES.test(n) || ILLICITE.some((r) => r.test(n)))
    return {
      ok: false,
      motif: 'illicite',
      message:
        'L’IA ne peut pas écrire ce contenu (pratique interdite, information trompeuse ou propos injurieux). Reformulez votre demande.',
    };
  if (DENIGRANT.test(n) && viseUnTiers(demande, n))
    return {
      ok: false,
      motif: 'denigrement',
      message:
        'L’IA ne peut pas écrire de critique d’un concurrent. Mettez plutôt en avant vos propres points forts.',
    };
  return { ok: true };
}
