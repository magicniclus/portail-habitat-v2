import type { TexteSecteur } from '../schemas/pagesSecteur';

/**
 * Rédaction du texte local d'une page de secteur, en deux temps : une recherche web (faits
 * locaux sourcés : bâti, quartiers, climat, règles d'urbanisme) puis la rédaction à partir de
 * nos données et de ces faits seulement. Aucun chiffre ne doit venir d'ailleurs.
 */
export interface DonneesTexte {
  metier: string;
  /** Prestations souvent confiées à ce métier (catalogue du simulateur). */
  prestations: readonly string[];
  ville: string;
  codePostal: string;
  departement: string;
  population: number;
  nbArtisans: number;
  rayonKm: number;
  /** Communes voisines qui ont déjà une page indexée (liens naturels dans le texte). */
  voisines: readonly string[];
}

export interface FaitSource {
  texte: string;
  source: string;
}

/** Garde les faits dont la source fait partie des pages réellement trouvées par la recherche. */
export function faitsVerifies(faits: readonly FaitSource[], urls: readonly string[]): FaitSource[] {
  const cle = (u: string) => {
    const x = URL.parse(u);
    return x ? `${x.hostname.replace(/^www\./, '')}${x.pathname.replace(/\/$/, '')}` : null;
  };
  const connues = new Set(urls.map(cle).filter(Boolean));
  const vus = new Set<string>();
  return faits.filter((f) => {
    const k = cle(f.source);
    if (!k || !connues.has(k) || vus.has(f.texte)) return false;
    vus.add(f.texte);
    return true;
  });
}

export const SYSTEME_RECHERCHE_SECTEUR = `Tu prépares une page web locale d'un annuaire d'artisans du bâtiment en France. Cherche sur le web des faits vérifiables et utiles à un particulier qui cherche ce métier dans cette commune : type et âge des logements, bâti ancien ou patrimonial, secteurs protégés (Architectes des Bâtiments de France, site patrimonial remarquable), quartiers, climat et risques (inondation, retrait-gonflement des argiles), aides locales à la rénovation. Privilégie les sources officielles (insee.fr, la mairie, la préfecture, georisques.gouv.fr, ademe.fr, data.gouv.fr). N'invente rien. Réponds uniquement par un objet JSON {"faits":[{"texte":"…","source":"https://…"}]} de 4 à 10 faits, chacun recopié fidèlement de la page source, avec l'adresse exacte de cette page.`;

export function demandeRecherche(d: DonneesTexte): string {
  return `Métier : ${d.metier}. Commune : ${d.ville} (${d.codePostal}, département ${d.departement}).`;
}

export const SYSTEME_REDACTION_SECTEUR = `Tu rédiges, en français, le texte d'une page « {métier} à {commune} » d'un annuaire d'artisans vérifiés. Le lecteur est un particulier qui a un projet de travaux.
Règles strictes :
- N'utilise que les DONNÉES et les FAITS fournis. Aucun autre chiffre, aucun prix, aucune note, aucun avis, aucun nom d'entreprise.
- Chaque fait repris garde son sens exact ; recopie dans "faits" ceux que tu utilises, avec leur source.
- Cite la commune dès la première phrase, et le métier en minuscules dans le texte.
- Pas de superlatifs (« meilleur », « n°1 »), pas de promesse invérifiable, jamais le mot « lead ».
- Ton clair, concret, utile : quels travaux sont fréquents ici et pourquoi, comment choisir, quelles démarches, quoi préparer avant de demander des devis.
- 3 à 5 sections avec un titre chacune, 4 à 6 questions fréquentes propres à la commune. Entre 400 et 900 mots au total.`;

export function contexteRedaction(d: DonneesTexte, faits: readonly FaitSource[]): string {
  return [
    'DONNÉES (Portail Travaux) :',
    `- Métier : ${d.metier}`,
    `- Commune : ${d.ville}, ${d.codePostal}, département ${d.departement}`,
    `- Population : ${d.population} habitants`,
    `- Artisans vérifiés de ce métier dans un rayon de ${d.rayonKm} km : ${d.nbArtisans}`,
    d.prestations.length
      ? `- Travaux souvent confiés à ce métier : ${d.prestations.join(', ')}`
      : '',
    d.voisines.length ? `- Communes voisines : ${d.voisines.join(', ')}` : '',
    '- Contacter un artisan ou demander un devis sur Portail Travaux est gratuit et sans engagement.',
    '- Les artisans ont un SIRET contrôlé ; les avis affichés sont vérifiés.',
    '',
    'FAITS (sources vérifiées) :',
    ...(faits.length ? faits.map((f) => `- ${f.texte} (${f.source})`) : ['- (aucun)']),
  ]
    .filter((l) => l !== '')
    .join('\n');
}

/** Chiffres connus de nos données, autorisés dans le texte sans source extérieure. */
export const nombresDonnees = (d: DonneesTexte) => [d.population, d.nbArtisans, d.rayonKm];

/** Schéma JSON imposé à la réponse (sortie structurée), aligné sur `texteSecteur`. */
export const SCHEMA_JSON_TEXTE_SECTEUR: Record<string, unknown> = {
  type: 'object',
  properties: {
    intro: { type: 'string' },
    sections: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          titre: { type: 'string' },
          paragraphes: { type: 'array', items: { type: 'string' } },
        },
        required: ['titre', 'paragraphes'],
        additionalProperties: false,
      },
    },
    faq: {
      type: 'array',
      items: {
        type: 'object',
        properties: { q: { type: 'string' }, r: { type: 'string' } },
        required: ['q', 'r'],
        additionalProperties: false,
      },
    },
    faits: {
      type: 'array',
      items: {
        type: 'object',
        properties: { texte: { type: 'string' }, source: { type: 'string' } },
        required: ['texte', 'source'],
        additionalProperties: false,
      },
    },
  },
  required: ['intro', 'sections', 'faq', 'faits'],
  additionalProperties: false,
};

/** Les faits du texte doivent tous venir de la recherche (même texte, même source). */
export function faitsDuTexteConnus(t: TexteSecteur, faits: readonly FaitSource[]): boolean {
  const connus = new Set(faits.map((f) => f.source));
  return t.faits.every((f) => connus.has(f.source));
}

/** Lit l'objet JSON d'une réponse en texte libre (recherche web, sans sortie structurée). */
export function lireFaitsRecherche(texte: string): FaitSource[] {
  const debut = texte.indexOf('{');
  const fin = texte.lastIndexOf('}');
  if (debut < 0 || fin <= debut) return [];
  try {
    const o = JSON.parse(texte.slice(debut, fin + 1)) as { faits?: unknown };
    if (!Array.isArray(o.faits)) return [];
    return o.faits.flatMap((f: unknown) => {
      const x = f as Partial<FaitSource>;
      return typeof x?.texte === 'string' && typeof x.source === 'string'
        ? [{ texte: x.texte.trim().slice(0, 300), source: x.source.trim() }]
        : [];
    });
  } catch {
    return [];
  }
}
