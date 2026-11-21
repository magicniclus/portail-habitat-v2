import source from '../../../../docs/data/documents-legaux.json';

export type PublicLegal = 'particuliers' | 'pro';

interface SectionLegale {
  titre: string;
  paragraphes: string[];
  liste?: string[];
  tableau?: { entetes: string[]; lignes: string[][] };
}

export interface DocumentLegal {
  titre: string;
  icone: string;
  chapeau: string;
  encadre?: [string, string];
  sections: SectionLegale[];
}

const donnees = source as unknown as {
  version: string;
  ordre: Record<PublicLegal, string[]>;
  documents: Record<string, DocumentLegal>;
};

export const PUBLICS: PublicLegal[] = ['particuliers', 'pro'];
export const VERSION_LEGALE = donnees.version;

/** Identifiant interne → segment d'URL (`securitePro` s'affiche `/legal/pro/securite`). */
const slug = (id: string) => (id === 'securitePro' ? 'securite' : id);
const idDepuisSlug = (p: PublicLegal, s: string) =>
  p === 'pro' && s === 'securite' ? 'securitePro' : s;

export interface EntreeSommaire {
  slug: string;
  titre: string;
  icone: string;
}

export const sommaire = (p: PublicLegal): EntreeSommaire[] =>
  donnees.ordre[p].map((id) => ({
    slug: slug(id),
    titre: donnees.documents[id]!.titre,
    icone: donnees.documents[id]!.icone,
  }));

export function documentLegal(p: string, s: string) {
  if (!PUBLICS.includes(p as PublicLegal)) return null;
  const pub = p as PublicLegal;
  if (s !== slug(s)) return null; // identifiant interne jamais exposé dans l'URL
  const id = idDepuisSlug(pub, s);
  if (!donnees.ordre[pub].includes(id)) return null;
  const liste = sommaire(pub);
  const i = liste.findIndex((d) => d.slug === s);
  return {
    public: pub,
    slug: s,
    doc: donnees.documents[id]!,
    precedent: liste[i - 1] ?? null,
    suivant: liste[i + 1] ?? null,
  };
}

export const tousLesDocuments = () =>
  PUBLICS.flatMap((p) => sommaire(p).map((d) => ({ public: p, doc: d.slug })));
