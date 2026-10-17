/** Inscription des artisans (COMPTES §3) : règles pures partagées par les écrans et le serveur. */

export interface IntentionMetier {
  id: string;
  libelle: string;
  metier: string;
}

/**
 * Chantiers proposés (COMPTES §3.1 bis, ONB-01c) : toutes les intentions des métiers choisis,
 * cochées par défaut ; l'artisan décoche ce qu'il ne fait pas.
 */
export function chantiersDesMetiers(
  metiers: readonly string[],
  intentions: readonly IntentionMetier[],
) {
  return metiers.map((m) => ({ metier: m, chantiers: intentions.filter((i) => i.metier === m) }));
}

/**
 * Intentions retenues après un changement de métiers : celles des métiers encore choisis, plus toutes
 * celles d'un métier nouvellement ajouté (cochées par défaut) ; un chantier décoché le reste.
 */
export function intentionsApresChangement(
  avant: { metiers: readonly string[]; intentions: readonly string[] },
  metiers: readonly string[],
  toutes: readonly IntentionMetier[],
): string[] {
  const ajoutes = metiers.filter((m) => !avant.metiers.includes(m));
  return toutes
    .filter(
      (i) =>
        metiers.includes(i.metier) &&
        (ajoutes.includes(i.metier) || avant.intentions.includes(i.id)),
    )
    .map((i) => i.id);
}

/** Barre fixe (D26e, ONB-07) : libellé de statut et bouton actif seulement si l'étape est complète. */
export function statutZone(z: { ville?: string; rayonKm?: number }) {
  const complete = Boolean(z.ville && z.rayonKm);
  return { complete, statut: complete ? `${z.ville} · ${z.rayonKm} km` : 'Choisissez votre ville' };
}

export function statutCompte(c: {
  entrepriseChoisie: boolean;
  motDePasse: string;
  confirmation: string;
  cgv: boolean;
}) {
  if (!c.entrepriseChoisie) return { complete: false, statut: 'Indiquez votre entreprise (SIREN)' };
  if (forceMotDePasse(c.motDePasse) < 3)
    return { complete: false, statut: 'Choisissez un mot de passe d’au moins 10 caractères' };
  if (c.motDePasse !== c.confirmation)
    return { complete: false, statut: 'Les deux mots de passe sont différents' };
  if (!c.cgv) return { complete: false, statut: 'Acceptez les conditions d’utilisation' };
  return { complete: true, statut: 'Tout est prêt' };
}

/** Force d'un mot de passe de 0 à 4 (longueur ≥ 10 exigée, variété de caractères en plus). */
export function forceMotDePasse(m: string): number {
  if (m.length < 10) return m.length >= 6 ? 1 : 0;
  const variete = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(m)).length;
  return Math.min(4, 2 + Math.floor(variete / 2));
}
