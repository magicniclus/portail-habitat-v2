import { ErreurMetier } from '@ph/core/erreurs';
import {
  ARTISAN_EXEMPLE,
  capturesAFilmer,
  extraireJson,
  MODELE_STUDIO,
  preparationCaptures,
  promptPreparation,
  SCHEMA_JSON_PREPARATION,
  type PreparationCaptures,
  type SceneCapture,
} from '@ph/core/studio';
import { cout, exiger, exigerClaude, maj, type ServicesStudio } from './projets';

/**
 * Captures avant le montage (STUDIO.md §4), étape 1 : à partir du script, Claude crée l'artisan
 * d'exemple (fictif, chiffres cohérents avec la voix) et choisit les écrans à filmer.
 */
export async function preparerCapturesStudio(
  s: ServicesStudio,
  e: { projetId: string },
): Promise<PreparationCaptures> {
  const claude = exigerClaude(s);
  const p = await exiger(s, e.projetId);
  if (!p.sujet)
    throw new ErreurMetier('PRECONDITION', 'Pas de script : choisissez vous-même les écrans.');
  const r = await claude({
    modele: MODELE_STUDIO,
    ...promptPreparation({ sujet: p.sujet, format: p.format }),
    schema: SCHEMA_JSON_PREPARATION,
    maxTokens: 8_000,
  });
  await maj(s, p.id, { coutCentimes: cout(r.usage) });
  const lu = preparationCaptures.safeParse(
    (() => {
      try {
        return JSON.parse(extraireJson(r.texte)) as unknown;
      } catch {
        return null;
      }
    })(),
  );
  if (r.refus || !lu.success)
    throw new ErreurMetier('INDISPONIBLE', 'Claude n’a pas pu préparer les captures. Réessayez.');
  await maj(s, p.id, { preparation: lu.data });
  return lu.data;
}

/** L'auteur corrige l'artisan ou les écrans (ou choisit de monter sans captures). */
export async function modifierPreparationStudio(
  s: ServicesStudio,
  e: { projetId: string; preparation: PreparationCaptures },
): Promise<void> {
  const p = await exiger(s, e.projetId);
  if (p.statut === 'captures')
    throw new ErreurMetier('PRECONDITION', 'Le robot filme en ce moment : attendez la fin.');
  await maj(s, p.id, { preparation: preparationCaptures.parse(e.preparation) });
}

/** Monter sans captures : la préparation est marquée « ignorée ». */
export async function ignorerCapturesStudio(s: ServicesStudio, e: { projetId: string }) {
  const p = await exiger(s, e.projetId);
  await modifierPreparationStudio(s, {
    projetId: p.id,
    preparation: { artisan: p.preparation?.artisan ?? ARTISAN_EXEMPLE, scenes: [], ignoree: true },
  });
  // Après un tournage raté (robot absent…), on repart vers le tournage sans erreur.
  if (!p.prise && p.statut === 'erreur')
    await maj(s, p.id, { statut: 'enregistrement', erreur: null });
}

/**
 * Étape 2 : le robot filme les écrans préparés (sur la copie isolée, avec l'artisan d'exemple).
 * `refaire` efface d'abord la capture de cette scène pour la refilmer.
 */
export async function filmerCapturesStudio(
  s: ServicesStudio,
  e: { projetId: string; refaire?: SceneCapture },
): Promise<void> {
  const p = await exiger(s, e.projetId);
  const a = capturesAFilmer({ format: p.format, plan: null, preparation: p.preparation });
  if (!p.preparation || p.preparation.ignoree || !a.captures.length)
    throw new ErreurMetier('PRECONDITION', 'Choisissez d’abord au moins un écran à filmer.');
  if (p.statut === 'captures')
    throw new ErreurMetier('PRECONDITION', 'Le robot filme déjà ces captures.');
  const captures = Object.fromEntries(
    Object.entries(p.captures).filter(([cle]) => !e.refaire || !cle.endsWith(`:${e.refaire}`)),
  );
  await maj(s, p.id, { captures, statut: 'captures', erreur: null });
  await s.lancerTravail('capturer', p.id);
}
