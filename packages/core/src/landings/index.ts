import { formatNombre, nombreArrondi } from '../format/nombres';
import { SOURCES_ACQUISITION } from '../schemas/artisans';
import type { OutilLanding } from './contenu';

export * from './contenu';

type SourceAcquisition = (typeof SOURCES_ACQUISITION)[number];

/** Routes et sources (LANDINGS §1) : la source part avec le formulaire et reste sur le compte. */
export const LANDINGS = {
  chantiers: { route: '/pro/trouver-des-chantiers', source: 'trouver-chantier' },
  site: { route: '/pro/site-internet-artisan', source: 'site-internet-artisan' },
  devis: { route: '/pro/logiciel-devis-factures', source: 'logiciel-devis-facture' },
} as const satisfies Record<OutilLanding, { route: string; source: SourceAcquisition }>;

export function sourceDeLanding(v: string | null | undefined): SourceAcquisition | undefined {
  return SOURCES_ACQUISITION.find((s) => s === v);
}

/** Événements `dataLayer` des landings (LANDINGS §5), toujours avec le paramètre `landing`. */
export const EVENEMENTS_LANDING = [
  'landing_site_view',
  'hero_form_started',
  'hero_form_submitted',
  'demo_played',
  'pricing_section_viewed',
  'site_example_clicked',
  'faq_opened',
  'sticky_cta_clicked',
  'final_cta_clicked',
] as const;
export type EvenementLanding = (typeof EVENEMENTS_LANDING)[number];

export function evenementLanding(
  event: EvenementLanding,
  landing: OutilLanding | 'pro',
  details: Record<string, string | number> = {},
): Record<string, string | number> {
  return { event, landing, ...details };
}

export interface Temoignage {
  nom: string;
  metier: string;
  ville: string;
  texte: string;
  photo?: string;
  /** Accord écrit de l'artisan : sans lui, le témoignage n'est jamais affiché (LANDINGS §7). */
  accordLe?: Date;
}

/** `config/preuveSociale` (DATABASE) : tout est facultatif, vide = section masquée. */
export interface DonneesPreuveSociale {
  nbInscrits?: number;
  nbSites?: number;
  note?: number;
  nbAvis?: number;
  temoignages?: Temoignage[];
}

/** LAND-04 : seulement des données réelles ; la section disparaît s'il n'y en a aucune. */
export function preuveSociale(p: DonneesPreuveSociale | null): {
  visible: boolean;
  chiffres: { valeur: string; libelle: string }[];
  temoignages: Temoignage[];
} {
  const chiffres: { valeur: string; libelle: string }[] = [];
  if (p?.nbInscrits && p.nbInscrits > 0)
    chiffres.push({ valeur: formatNombre(p.nbInscrits), libelle: 'entreprises inscrites' });
  if (p?.nbSites && p.nbSites > 0)
    chiffres.push({ valeur: formatNombre(p.nbSites), libelle: 'sites publiés' });
  if (p?.note && p.note > 0 && p.nbAvis && p.nbAvis > 0)
    chiffres.push({
      valeur: `${formatNombre(p.note, 1)}/5`,
      libelle: `sur ${formatNombre(p.nbAvis)} avis vérifiés`,
    });
  const temoignages = (p?.temoignages ?? []).filter((t) => t.accordLe);
  return { visible: chiffres.length > 0 || temoignages.length > 0, chiffres, temoignages };
}

/**
 * Chiffres du hero de /pro (maquette Acquisition Artisans v2) confirmés comme réels par le
 * propriétaire le 25/10/2026 (D72) : « 4,8/5 sur 2 000+ avis », « 3 200 artisans ».
 */
const PREUVE_PRO_DECLAREE = { note: 4.8, avis: `${formatNombre(2000)}+`, artisans: 3200 };

/** Hero de /pro : `config/preuveSociale` s'il est renseigné, sinon les chiffres déclarés. */
export function preuveHeroPro(p: DonneesPreuveSociale | null): {
  note: string | null;
  avis: string | null;
  artisans: string | null;
} {
  const renseigne = Boolean(
    p && ((p.note ?? 0) > 0 || (p.nbAvis ?? 0) > 0 || (p.nbInscrits ?? 0) > 0),
  );
  if (!renseigne) {
    const d = PREUVE_PRO_DECLAREE;
    return { note: formatNombre(d.note, 1), avis: d.avis, artisans: formatNombre(d.artisans) };
  }
  const avecNote = (p!.note ?? 0) > 0 && (p!.nbAvis ?? 0) > 0;
  return {
    note: avecNote ? formatNombre(p!.note!, 1) : null,
    avis: avecNote ? nombreArrondi(p!.nbAvis!) : null,
    artisans: (p!.nbInscrits ?? 0) > 0 ? formatNombre(p!.nbInscrits!) : null,
  };
}
