import type { ReferentielDiagnostic, TexteDiagnostic } from '@ph/core/diagnostic';
import type { EntreeDossierDiag } from '@ph/core/schemas';

export type Bien = EntreeDossierDiag['bien'];

/** Données publiques du parcours (serveur → navigateur) : aucun prix (DIA-06). */
export interface DonneesParcoursDiag {
  referentiel: ReferentielDiagnostic;
  textes: Record<string, TexteDiagnostic>;
  communes: { id: string; nom: string; cp?: string; presquile: boolean }[];
}

export const BIEN_DEFAUT: Bien = {
  adresse: '',
  communeSlug: 'cenon',
  codePostal: '33150',
  type: 'appartement',
  periode: '1949-1976',
  surface: 65,
  motif: 'vente',
  gaz: 'oui',
  elec: 'ancienne',
  assainissement: 'collectif',
  classe: 'inconnu',
};

/** Maquette Parcours Diagnostic : types de bien et périodes de construction. */
export const TYPES_BIEN = [
  {
    v: 'appartement',
    label: 'Appartement',
    desc: 'Copropriété · loi Carrez',
    icone: 'M5 21V6.5l7-3.5 7 3.5V21M9 11h2M13 11h2M9 15h2M13 15h2M4 21h16',
  },
  {
    v: 'maison',
    label: 'Maison',
    desc: 'Individuelle',
    icone: 'M4 11 12 4.5 20 11M6.5 12.5V20h11v-7.5M11 20v-4h2v4',
  },
  {
    v: 'immeuble',
    label: 'Immeuble entier',
    desc: 'Monopropriété',
    icone: 'M4 21V4h9v17M13 10h7v11M7 8h3M7 12h3M7 16h3M16 14h1.5M16 18h1.5',
  },
] as const;

export const PERIODES_BIEN = [
  { v: 'av1949', label: 'Avant 1949', desc: 'Plomb + amiante' },
  { v: '1949-1976', label: '1949 – 1976', desc: 'Amiante' },
  { v: '1977-1996', label: '1977 – 1996', desc: 'Amiante' },
  { v: '1997-2010', label: '1997 – 2010', desc: 'Ni plomb ni amiante' },
  { v: 'ap2011', label: '2011 et après', desc: 'Dossier allégé' },
] as const;

export const MOTIFS_BIEN = [
  { v: 'vente', label: 'Vente' },
  { v: 'location', label: 'Mise en location' },
  { v: 'travaux', label: 'Travaux / rénovation' },
] as const;

export const libelle = <T extends { v: string; label: string }>(liste: readonly T[], v: string) =>
  liste.find((x) => x.v === v)?.label ?? v;
