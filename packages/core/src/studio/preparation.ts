import type { Frise } from './frise';
import { z } from '../zod';
import { NOMS_SCENES, SCENES_CAPTURE, type SceneCapture } from './catalogue';
import type { FormatStudio } from './formats';
import { artisanFictif, type ArtisanFictif, type PlanMontage } from './plan';
import { FAITS_PRODUIT, REGLES_COMMUNES, type SujetStudio } from './prompts';

/**
 * Captures avant le montage (STUDIO.md §4) : à partir du script, Claude crée l'artisan d'exemple
 * (fictif) et choisit les écrans de Portail Travaux à filmer. L'auteur les relit, les corrige,
 * regarde les vidéos filmées ; le montage vient ensuite et réutilise ces captures.
 */
export const preparationCaptures = z.strictObject({
  artisan: artisanFictif,
  scenes: z.array(z.enum(NOMS_SCENES as [SceneCapture, ...SceneCapture[]])).max(6),
  /** L'auteur a choisi de monter sans captures. */
  ignoree: z.boolean().optional(),
});
export type PreparationCaptures = z.infer<typeof preparationCaptures>;

/** Artisan proposé sans script (l'auteur le corrige) et repli du robot. */
export const ARTISAN_EXEMPLE: ArtisanFictif = {
  nom: 'Bertrand Rénovation',
  metier: 'plombier',
  ville: 'Bordeaux',
};

const entier = { type: 'integer' };
export const SCHEMA_JSON_PREPARATION: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  required: ['artisan', 'scenes'],
  properties: {
    artisan: {
      type: 'object',
      additionalProperties: false,
      required: [
        'nom',
        'metier',
        'ville',
        'demandesParMois',
        'chiffreAffairesCentimes',
        'devisEnvoyes',
        'noteMoyenne',
        'nombreAvis',
      ],
      properties: {
        nom: { type: 'string' },
        metier: { type: 'string' },
        ville: { type: 'string' },
        demandesParMois: entier,
        chiffreAffairesCentimes: entier,
        devisEnvoyes: entier,
        noteMoyenne: { type: 'number' },
        nombreAvis: entier,
      },
    },
    scenes: { type: 'array', items: { type: 'string', enum: NOMS_SCENES } },
  },
};

export function promptPreparation(e: { sujet: SujetStudio; format: FormatStudio }) {
  return {
    systeme: [
      'Tu prépares les captures d’écran vidéo d’une vidéo courte sur Portail Travaux, avant le montage.',
      REGLES_COMMUNES,
      'Crée un artisan d’exemple fictif : nom d’entreprise inventé et crédible (jamais une vraie entreprise), métier et ville cohérents avec le sujet, chiffres réalistes et cohérents avec ce que dit le script (si la voix dit « 10 demandes par mois », demandesParMois = 10). Montants en centimes entiers.',
      'Choisis de 1 à 4 écrans à filmer : ceux qu’indique la colonne « à l’écran » du script, puis ceux qui illustrent le mieux ce qui est dit. Uniquement des identifiants de la liste.',
    ].join('\n\n'),
    contexte: [
      `Faits sur le produit :\n${FAITS_PRODUIT}`,
      `Écrans filmables :\n${NOMS_SCENES.map((s) => `- ${s} : ${SCENES_CAPTURE[s].description}`).join('\n')}`,
    ].join('\n\n'),
    demande: [
      `Format : ${e.format}.`,
      `Sujet : ${e.sujet.titre}\nAngle : ${e.sujet.angle}`,
      `Script (voix [à l’écran]) :\n${e.sujet.script.map((s) => `- ${s.voix} [${s.aEcran}]`).join('\n')}`,
    ].join('\n\n'),
  };
}

/** Ce que le robot doit filmer : les captures du montage s'il existe, sinon la préparation. */
export function capturesAFilmer(p: {
  format: FormatStudio;
  plan: PlanMontage | null;
  preparation: PreparationCaptures | null;
  /** Frise montée dans l'éditeur multipistes : ce sont ses captures qui comptent. */
  frise?: Pick<Frise, 'format' | 'artisan' | 'captures'> | null;
}): { format: FormatStudio; artisan: ArtisanFictif | null; captures: PlanMontage['captures'] } {
  const artisan = p.frise?.artisan ?? p.preparation?.artisan ?? p.plan?.artisan ?? null;
  if (p.frise) return { format: p.frise.format, artisan, captures: p.frise.captures };
  if (p.plan) return { format: p.plan.format, artisan, captures: p.plan.captures };
  return {
    format: p.format,
    artisan,
    captures: (p.preparation?.scenes ?? []).map((scene, i) => ({ id: `c${i + 1}`, scene })),
  };
}

/**
 * Le montage reprend l'identifiant d'une capture déjà filmée pour la même scène : la vidéo
 * existante sert telle quelle, rien n'est refilmé.
 */
export function alignerCaptures(plan: PlanMontage, filmees: Record<string, string>): PlanMontage {
  const parScene = new Map(
    Object.keys(filmees).map((cle) => [cle.split(':')[1]!, cle.split(':')[0]!] as const),
  );
  const renomme = new Map<string, string>();
  const captures = plan.captures.map((c) => {
    const id = parScene.get(c.scene);
    if (!id || id === c.id) return c;
    renomme.set(c.id, id);
    return { ...c, id };
  });
  if (!renomme.size) return plan;
  return {
    ...plan,
    captures,
    plans: plan.plans.map((x) =>
      x.captureId && renomme.has(x.captureId) ? { ...x, captureId: renomme.get(x.captureId)! } : x,
    ),
  };
}

export type EtatCaptures = 'a_preparer' | 'preparee' | 'filmee' | 'ignoree';

export function etatCaptures(p: {
  preparation: PreparationCaptures | null;
  captures: Record<string, string>;
}): EtatCaptures {
  if (!p.preparation) return 'a_preparer';
  if (p.preparation.ignoree) return 'ignoree';
  const a = capturesAFilmer({ format: 'vertical', plan: null, preparation: p.preparation });
  return a.captures.every((c) => p.captures[`${c.id}:${c.scene}`]) ? 'filmee' : 'preparee';
}
