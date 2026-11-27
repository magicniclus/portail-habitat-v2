/** Fichier produit dans le navigateur, enregistré par un lien temporaire (CSV, PDF, PNG, JSON). */
export function telechargerFichier(nom: string, contenu: Blob) {
  const url = URL.createObjectURL(contenu);
  const a = document.createElement('a');
  a.href = url;
  a.download = nom;
  a.click();
  // Laissé un instant au navigateur pour lancer l'enregistrement.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** « 202611181530 » : horodatage des noms de fichiers téléchargés. */
export const horodatageFichier = () => new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
