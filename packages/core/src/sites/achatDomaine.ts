import { slugifier } from '../format/slug';
import { estSirenValide } from '../format/siren';
import type { EnregistrementAttendu } from './dns';
import type { ConfigHebergeur } from './domaines';

/** Extensions proposées à l'achat (DOMAINES §3). */
export const EXTENSIONS_ACHAT = ['fr', 'com', 'eu'] as const;

const base = (t: string) => slugifier(t).slice(0, 63).replace(/-+$/, '');

/**
 * Domaines proposés : la saisie de l'artisan (extension gardée si elle est proposée), sinon le
 * nom de l'entreprise en .fr, .com, .eu, puis la variante `nom-ville.fr`. Sans doublon.
 */
export function suggestionsDomaine(o: {
  nomCommercial: string;
  ville?: string;
  requete?: string;
}): string[] {
  const out: string[] = [];
  const ajouter = (b: string, ext: string) => {
    if (b.length >= 2 && !out.includes(`${b}.${ext}`)) out.push(`${b}.${ext}`);
  };
  const r = o.requete
    ?.trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '');
  const ext = r?.match(/\.([a-z]{2,6})$/)?.[1];
  const racine = r ? base(ext ? r.slice(0, -ext.length - 1) : r) : base(o.nomCommercial);
  if (ext && (EXTENSIONS_ACHAT as readonly string[]).includes(ext)) ajouter(racine, ext);
  for (const e of EXTENSIONS_ACHAT) ajouter(racine, e);
  if (o.ville && racine) ajouter(base(`${racine} ${o.ville}`), 'fr');
  return out;
}

export interface TitulaireDomaine {
  organisation: string;
  siren: string;
  adresse: { ligne1: string; codePostal: string; ville: string; pays: string };
  email: string;
  telephone: string;
}

/**
 * Titulaire du domaine acheté : l'entreprise de l'artisan (DOM-03), lue sur sa fiche vérifiée.
 * Ce qui manque est listé pour que l'artisan complète sa fiche avant l'achat.
 */
export function titulaireDomaine(f: {
  raisonSociale?: string;
  siren?: string;
  adresseSiege?: { ligne1?: string; codePostal?: string; ville?: string; pays?: string };
  emailContact?: string;
  telephonePublic?: string;
}): { ok: true; titulaire: TitulaireDomaine } | { ok: false; manquants: string[] } {
  const a = f.adresseSiege;
  const manquants = [
    !f.raisonSociale?.trim() && 'raison sociale',
    !(f.siren && estSirenValide(f.siren)) && 'SIREN',
    !(a?.ligne1 && a.codePostal && a.ville) && 'adresse du siège',
    !f.emailContact && 'email de contact',
    !f.telephonePublic && 'téléphone',
  ].filter((x): x is string => Boolean(x));
  if (manquants.length) return { ok: false, manquants };
  return {
    ok: true,
    titulaire: {
      organisation: f.raisonSociale!.trim(),
      siren: f.siren!,
      adresse: {
        ligne1: a!.ligne1!,
        codePostal: a!.codePostal!,
        ville: a!.ville!,
        pays: a!.pays ?? 'FR',
      },
      email: f.emailContact!,
      telephone: f.telephonePublic!,
    },
  };
}

/** Zone DNS d'un domaine acheté : A et CNAME lus chez l'hébergeur ; jamais de MX (DOM-08). */
export function enregistrementsAchat(h: ConfigHebergeur): EnregistrementAttendu[] {
  return [
    ...h.apex.map((ip) => ({ type: 'A' as const, nom: '@', valeur: ip })),
    { type: 'CNAME', nom: 'www', valeur: h.cname.replace(/\.$/, '') },
  ];
}
