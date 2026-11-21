import {
  champsDuTarif,
  champSansMontant,
  tarifEnCentimes,
  tarifVersDocument,
  tauxTva,
  type Champ,
  type Referentiel,
  type TarifGenerique,
} from '@ph/core/simulateur';
import { chemins, collections } from '../chemins';

/** Fichiers de docs/data lus par le script (le générateur reste sans accès disque). */
export interface FichiersSeed {
  prestations: {
    prestations: {
      id: string;
      nom: string;
      pitch?: string;
      repere?: string;
      icone?: string;
      champs: Champ[];
    }[];
  };
  catalogue: {
    familles: { id: string; nom: string }[];
    familleDesPrestationsDetaillees: Record<string, string>;
    prestations: {
      id: string;
      nom: string;
      famille: string;
      pitch?: string;
      repere?: string;
      icone?: string;
      tva: number;
      tarif: TarifGenerique & Parameters<typeof champsDuTarif>[0];
    }[];
  };
  prixDetailles: {
    version: string;
    coefficients: Referentiel['coefficients'];
    prestations: Record<string, unknown>;
  };
  recherche: {
    metiers: Record<
      string,
      { id: string; nom: string; famille: string; prestation: string; alias: string[] }
    >;
    intentions: {
      id: string;
      libelle: string;
      metier: string;
      prestation: string;
      popularite: number;
      motsCles: string[];
    }[];
    synonymes: Record<string, string>;
  };
  communes: { ordre: string[]; communes: Record<string, CommuneBrute> };
  annuaire: { artisans: ArtisanDemo[] };
  demandes: { demandes: { nom: string; sujet: string; message: string; ville: string }[] };
}

interface CommuneBrute {
  nom: string;
  cp: string;
  insee: string;
  pop: string;
  superficie: string;
  prix: string;
  intro: string;
  bati: string;
  secteurs: string;
  risques: string;
  frequents: { titre: string; texte: string }[];
}

interface ArtisanDemo {
  nom: string;
  metiers: string[];
  ville: string;
  note: number;
  avis: number;
  premium: boolean;
  argument: string;
  delaiJ: number;
  dispo: string;
  anciennete: string;
  budgetCle: 'petit' | 'moyen' | 'grand';
  labels: string[];
  pitch: string;
  tags: string[];
}

export type Documents = Map<string, Record<string, unknown>>;

const TVA: Record<number, number> = { 5.5: 0.055, 10: 0.1, 20: 0.2 };

const champPublic = (c: Champ) => ({
  id: c.id,
  kind: c.kind,
  label: c.label,
  aide: c.aide,
  etape: c.e,
  ...(c.kind === 'options' || c.kind === 'chips'
    ? { options: c.options.map((o) => ({ v: o.v, label: o.label, desc: o.desc })) }
    : { min: c.min, max: c.max, pas: c.pas, def: c.def, unite: c.unite }),
});

/** Référentiel des prix (serveur) tel que le simulateur le lit. */
export function referentielPrix(f: FichiersSeed): Referentiel {
  return {
    version: f.prixDetailles.version,
    coefficients: f.prixDetailles.coefficients,
    detailles: f.prixDetailles.prestations as unknown as Referentiel['detailles'],
    catalogue: Object.fromEntries(
      f.catalogue.prestations.map((p) => [p.id, tarifEnCentimes(p.tarif)]),
    ),
    tvaCatalogue: Object.fromEntries(f.catalogue.prestations.map((p) => [p.id, p.tva])),
  };
}

/** Prestations (public / prix séparés), recherche et communes (COMPTES §6.4). */
export function documentsReferentiel(f: FichiersSeed, maintenant: Date): Documents {
  const docs: Documents = new Map();
  const version = f.prixDetailles.version;
  const ref = referentielPrix(f);
  let ordre = 0;

  for (const p of f.prestations.prestations) {
    docs.set(chemins.prestationItem(p.id), {
      schemaVersion: 1,
      nom: p.nom,
      famille: f.catalogue.familleDesPrestationsDetaillees[p.id],
      pitch: p.pitch,
      repere: p.repere,
      icone: p.icone,
      ordre: ordre++,
      actif: true,
      tva: TVA[tauxTva(p.id, ref)],
      champs: p.champs.map(champSansMontant).map(champPublic),
      formule: `detaillee:${p.id}`,
      version,
      updatedAt: maintenant,
    });
    docs.set(chemins.prestationPrix(p.id), {
      schemaVersion: 1,
      parametres: f.prixDetailles.prestations[p.id] as Record<string, unknown>,
      version,
      updatedAt: maintenant,
    });
  }
  for (const p of f.catalogue.prestations) {
    docs.set(chemins.prestationItem(p.id), {
      schemaVersion: 1,
      nom: p.nom,
      famille: p.famille,
      pitch: p.pitch,
      repere: p.repere,
      icone: p.icone,
      ordre: ordre++,
      actif: true,
      tva: TVA[p.tva],
      champs: champsDuTarif(p.tarif).map(champSansMontant).map(champPublic),
      formule: 'generique',
      version,
      updatedAt: maintenant,
    });
    docs.set(chemins.prestationPrix(p.id), {
      schemaVersion: 1,
      parametres: { tarif: tarifVersDocument(tarifEnCentimes(p.tarif)), tva: p.tva },
      version,
      updatedAt: maintenant,
    });
  }
  docs.set(chemins.prestationPrix('_coefficients'), {
    schemaVersion: 1,
    parametres: f.prixDetailles.coefficients as unknown as Record<string, unknown>,
    version,
    updatedAt: maintenant,
  });

  for (const i of f.recherche.intentions)
    docs.set(`${chemins.intentions()}/${i.id}`, {
      schemaVersion: 1,
      libelle: i.libelle,
      metier: i.metier,
      prestation: i.prestation,
      motsCles: i.motsCles,
      popularite: i.popularite,
      actif: true,
    });
  for (const m of Object.values(f.recherche.metiers))
    docs.set(`${chemins.metiersRecherche()}/${m.id}`, {
      schemaVersion: 1,
      nom: m.nom,
      alias: m.alias,
      famille: m.famille,
      prestationDefaut: m.prestation,
      lienAnnuaire: `/artisans?metier=${m.id}`,
    });
  docs.set(chemins.synonymes(), {
    schemaVersion: 1,
    equivalences: [],
    developpements: f.recherche.synonymes,
    motsVides: [],
    updatedAt: maintenant,
  });

  for (const slug of f.communes.ordre) {
    const c = f.communes.communes[slug]!;
    const prix = /([\d\s ]+)\s*€\/m²/.exec(c.prix)?.[1]?.replace(/\D/g, '');
    docs.set(`${collections.communes}/${slug}`, {
      schemaVersion: 1,
      nom: c.nom,
      codePostal: c.cp,
      codeInsee: c.insee,
      population: Number(c.pop.replace(/\D/g, '')),
      anneePopulation: 2023,
      superficieKm2: Number(c.superficie.replace(/[^\d,]/g, '').replace(',', '.')),
      ...(prix ? { prixM2: Number(prix) * 100, prixSource: c.prix } : {}),
      presquile: ['ambes', 'saint-louis', 'saint-vincent'].includes(slug),
      intro: c.intro,
      bati: c.bati,
      secteurs: c.secteurs.replace(/\.$/, '').split(/,\s*/),
      risques: [c.risques],
      frequents: c.frequents,
      seoTitle: `Diagnostic immobilier à ${c.nom} (${c.cp})`.slice(0, 70),
      seoDescription:
        `Diagnostics obligatoires pour vendre ou louer à ${c.nom} : DPE, amiante, plomb, termites, état des risques. Devis en ligne.`.slice(
          0,
          170,
        ),
      publie: true,
      updatedAt: maintenant,
    });
  }
  return docs;
}
