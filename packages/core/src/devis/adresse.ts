/** Adresse de livraison ou du chantier saisie en cases sur la feuille (toutes facultatives). */
export interface AdresseLivraison {
  attention?: string;
  adresse?: string;
  complement?: string;
  codePostal?: string;
  ville?: string;
  pays?: string;
}

/** Texte imprimé (PDF, lieu d'exécution de la facture) : une ligne, parties vides ignorées. */
export function texteAdresse(a: AdresseLivraison): string {
  const t = (s?: string) => s?.trim() ?? '';
  return [
    t(a.attention) && `À l’attention de ${t(a.attention)}`,
    t(a.adresse),
    t(a.complement),
    [t(a.codePostal), t(a.ville)].filter(Boolean).join(' '),
    t(a.pays),
  ]
    .filter(Boolean)
    .join(', ');
}
