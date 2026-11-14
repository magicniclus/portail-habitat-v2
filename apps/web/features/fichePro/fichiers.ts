/** Envois de fichiers de Ma fiche : mêmes limites que storage.rules, vérifiées avant l'envoi. */

export const TYPES_IMAGE = ['image/jpeg', 'image/png', 'image/webp'];
export const TYPES_PIECE = ['application/pdf', 'image/jpeg', 'image/png'];

/** Identifiant de dossier Storage (32 caractères alphanumériques). */
export const nouvelIdFichier = () => crypto.randomUUID().replaceAll('-', '');

/** Nom sans séparateur de dossier, 200 caractères au plus. */
export const nomFichierSur = (f: File) => f.name.replace(/[/\\]/g, '-').slice(-200);

/** Message d'erreur, ou `null` si le fichier convient. */
export function problemeFichier(f: File, types: readonly string[], maxMo: number): string | null {
  if (!types.includes(f.type))
    return types === TYPES_PIECE
      ? 'PDF, JPEG ou PNG uniquement.'
      : 'Image JPEG, PNG ou WebP uniquement.';
  if (f.size > maxMo * 1024 * 1024) return `${maxMo} Mo au plus.`;
  return null;
}

/** Dimensions réelles d'une image choisie (enregistrées avec la photo). */
export async function dimensionsImage(f: File): Promise<{ largeur: number; hauteur: number }> {
  const b = await createImageBitmap(f);
  const d = { largeur: b.width, hauteur: b.height };
  b.close();
  return d;
}
