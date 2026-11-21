/** Adresse saisie sur `/connexion`, relue au retour du lien sur le même appareil (recommandation Firebase). */
const CLE = 'ph_email_lien';

export function memoriserEmail(email: string) {
  try {
    localStorage.setItem(CLE, email);
  } catch {
    // stockage bloqué : l'adresse sera redemandée au retour du lien
  }
}

export function emailMemorise(): string | null {
  try {
    return localStorage.getItem(CLE);
  } catch {
    return null;
  }
}

export function oublierEmail() {
  try {
    localStorage.removeItem(CLE);
  } catch {
    // rien à faire
  }
}
