import source from '../../../../docs/data/communes.json';

/** Commune de la rive droite (docs/data/communes.json, population légale Insee 2023). */
export interface CommuneDiag {
  slug: string;
  nom: string;
  cp: string;
  insee: string;
  pop: string;
  superficie: string;
  prix?: string;
  intro: string;
  bati: string;
  secteurs: string;
  risques: string;
  frequents: { titre: string; texte: string }[];
}

type Brute = Omit<CommuneDiag, 'slug'>;
const donnees = source as unknown as { ordre: string[]; communes: Record<string, Brute> };

/** Les 11 communes, dans l'ordre de la maquette. */
export const COMMUNES: CommuneDiag[] = donnees.ordre.map((slug) => ({
  slug,
  ...donnees.communes[slug]!,
}));

export const communeParSlug = (slug: string) => COMMUNES.find((c) => c.slug === slug);

/** Communes en bord de fleuve : risque d'inondation de la Presqu'île (maquette Rive Droite). */
const PRESQUILE = new Set(['ambares', 'ambes', 'saint-louis', 'saint-vincent', 'bassens']);

export const risquesCourts = (slug: string) =>
  PRESQUILE.has(slug)
    ? "inondation de la Presqu'île, sols argileux, termites : remis dès la première visite."
    : 'retrait-gonflement des argiles, termites, radon : remis dès la première visite.';

/** Titre de page unique par commune (DIA-05), 70 caractères au plus. */
export const titreCommune = (c: CommuneDiag) => `Diagnostic immobilier à ${c.nom} (${c.cp})`;

export const descriptionCommune = (c: CommuneDiag) =>
  `Diagnostics obligatoires pour vendre ou louer à ${c.nom} : DPE, amiante, plomb, termites, état des risques. Jusqu'à 3 devis sous 48 h.`;

export const faqCommune = (nom: string) => [
  {
    q: `Le diagnostic termites est-il obligatoire à ${nom} ?`,
    r: `Oui. L'arrêté préfectoral du 12 février 2001 a institué une zone de surveillance et de lutte contre les termites sur l'ensemble du département de la Gironde : ${nom} est concernée comme toutes les communes girondines. Le rapport est valable 6 mois, il se réalise donc au plus près de la signature.`,
  },
  {
    q: 'Mon bien est-il concerné par l’amiante ?',
    r: `Si le permis de construire a été délivré avant le 1er juillet 1997, oui, pour toute vente. C'est le cas de la majorité du parc de ${nom} construit avant les années 1990. Un rapport antérieur à 2013 doit être refait.`,
  },
  {
    q: 'Combien coûte le dossier complet ?',
    r: 'Entre 280 et 810 € selon l’âge, le type de bien et la surface — voir le tableau ci-dessus. Une seule visite couvre tous les diagnostics, et vos rapports encore valables sont déduits du devis.',
  },
  {
    q: 'Quel est le délai d’intervention ?',
    r: `Vous recevez jusqu'à 3 devis sous 48 h de diagnostiqueurs certifiés intervenant à ${nom}. La visite dure de 1 à 3 h et les rapports PDF arrivent sous 24 à 48 h.`,
  },
];
