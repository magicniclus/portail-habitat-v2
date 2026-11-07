/**
 * Bloc de référencement en bas de chaque fiche publique : rédigé automatiquement depuis les
 * données réelles de la fiche (métier, ville, avis vérifiés, communes voisines de sa zone,
 * prestations du simulateur). Aucune IA, aucun chiffre inventé (LANDINGS : jamais de chiffre non
 * sourcé) ; textes propres à chaque artisan, liens internes vers l'annuaire et le simulateur.
 */
export interface EntreeSeoFiche {
  nom: string;
  metier: { id: string; nom: string };
  ville: string;
  nbAvis: number;
  note: number;
  /** Communes de la zone d'intervention, les plus peuplées d'abord. */
  villesProches: string[];
  autresMetiers: { id: string; nom: string }[];
  prestations: { id: string; nom: string }[];
}

const MAX_LIENS = 10;
/** « Entreprise générale … » → « une entreprise générale … » ; « Plombier » → « un plombier ». */
const FEMININS = /^(entreprise|société|agence|menuiserie|plâtrerie)/i;
const avecArticle = (metier: string) =>
  `${FEMININS.test(metier) ? 'une' : 'un'} ${metier.charAt(0).toLowerCase()}${metier.slice(1)}`;

export function seoFiche(e: EntreeSeoFiche) {
  const metier = avecArticle(e.metier.nom);
  const avis =
    e.nbAvis > 0
      ? `${e.nom} a déjà reçu ${e.nbAvis} avis vérifiés, pour une note moyenne de ${e.note.toFixed(1).replace('.', ',')}/5. `
      : '';
  return {
    paragraphes: [
      {
        titre: `Trouvez ${metier} pour votre projet à ${e.ville}`,
        texte: `Vous préparez des travaux à ${e.ville} ou dans les communes voisines ? Sur Portail Travaux, ${e.nom} et d’autres artisans dont l’entreprise est vérifiée présentent leurs réalisations, leur zone d’intervention et leurs certifications : comparez avant de choisir.`,
      },
      {
        titre: `Lisez les avis de particuliers à ${e.ville} et alentour`,
        texte: `${avis}Avant de confier votre chantier, consultez les avis laissés par d’autres particuliers : chaque avis est vérifié avant publication, et l’artisan peut y répondre publiquement.`,
      },
      {
        titre: `Contactez ${metier} gratuitement et sans engagement`,
        texte: `Laissez vos coordonnées sur cette fiche ou estimez d’abord le prix de votre projet avec notre simulateur : la demande est gratuite et sans engagement. Vous retrouvez ensuite vos demandes et les réponses des artisans dans votre espace.`,
      },
    ],
    villes: {
      titre: `${e.metier.nom} près de ${e.ville}`,
      liens: e.villesProches
        .filter((v) => v !== e.ville)
        .slice(0, MAX_LIENS)
        .map((v) => ({ libelle: `${e.metier.nom} à ${v}`, metier: e.metier.id, ville: v })),
    },
    metiers: {
      titre: `Autres artisans à ${e.ville}`,
      liens: e.autresMetiers
        .filter((m) => m.id !== e.metier.id)
        .slice(0, MAX_LIENS)
        .map((m) => ({ libelle: `${m.nom} à ${e.ville}`, metier: m.id, ville: e.ville })),
    },
    services: {
      titre: 'Travaux souvent demandés',
      liens: e.prestations.slice(0, MAX_LIENS).map((p) => ({
        libelle: `${p.nom} à ${e.ville}`,
        prestation: p.id,
        nom: p.nom,
        ville: e.ville,
      })),
    },
  };
}
