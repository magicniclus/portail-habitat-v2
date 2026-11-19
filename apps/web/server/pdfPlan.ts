import {
  cleLigneMetre,
  menuiseriesScene,
  metreScene,
  type Echelle,
  type FormatPapier,
  type Scene,
} from '@ph/core/dessin';
import { ErreurMetier } from '@ph/core/erreurs';
import { genererPdfPlan } from '@ph/emails/pdf-plan';

/**
 * PDF à l'échelle d'un plan déjà lu (droits vérifiés) : métré recalculé ici depuis la scène
 * enregistrée, seuls les postes décochés par l'utilisateur sont retirés.
 */
export async function pdfDuPlan(
  plan: { titre: string; scene: Scene },
  e: { niveauId: string; echelle: Echelle; format: FormatPapier; exclus: string[] },
): Promise<Buffer> {
  const exclus = new Set(e.exclus);
  try {
    return await genererPdfPlan({
      titre: plan.titre,
      date: new Date(),
      scene: plan.scene,
      niveauId: e.niveauId,
      echelle: e.echelle,
      format: e.format,
      metre: metreScene(plan.scene).filter((l) => !exclus.has(cleLigneMetre(l))),
      menuiseries: exclus.has('menuiseries') ? [] : menuiseriesScene(plan.scene),
    });
  } catch (err) {
    // Messages prévus (plan trop grand, niveau vide) : rendus tels quels ; le reste, générique.
    const message = err instanceof Error ? err.message : '';
    if (/ne tient pas|Dessinez/.test(message)) throw new ErreurMetier('PRECONDITION', message);
    throw err;
  }
}
