import type { ActionEquipe } from '../equipe/permissions';

/**
 * Dépôt d'un fichier par le serveur, en secours quand Storage refuse l'envoi direct (règles
 * croisées avec Firestore indisponibles, droits de session périmés) : mêmes chemins, types et
 * tailles que `storage.rules`, la permission étant vérifiée par `peut()` côté serveur.
 */
export interface RegleDepot {
  artisanId: string;
  permission: ActionEquipe;
  types: readonly string[];
  maxMo: number;
  /** Jamais d'écrasement d'un fichier existant (médiathèque, cachet, documents). */
  creationSeule: boolean;
}

const IMAGES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'] as const;
const PIECES = ['application/pdf', 'image/jpeg', 'image/png'] as const;

const ID = '[A-Za-z0-9_-]{1,64}';
const NOM = '(?!\\.{1,2}$)[^/\\\\]{1,200}';

const REGLES: { motif: RegExp; regle: Omit<RegleDepot, 'artisanId'> }[] = [
  {
    motif: new RegExp(`^artisans/(${ID})/logo/${NOM}$`),
    regle: { permission: 'fiche.modifier', types: IMAGES, maxMo: 2, creationSeule: false },
  },
  {
    motif: new RegExp(`^artisans/(${ID})/banniere/${NOM}$`),
    regle: { permission: 'fiche.modifier', types: IMAGES, maxMo: 5, creationSeule: false },
  },
  {
    motif: new RegExp(`^artisans/(${ID})/tampon/${NOM}$`),
    regle: { permission: 'factures.emettre', types: IMAGES, maxMo: 2, creationSeule: true },
  },
  {
    motif: new RegExp(`^sites/(${ID})/medias/${NOM}$`),
    regle: {
      permission: 'site.gerer',
      types: [...IMAGES, 'application/pdf'],
      maxMo: 8,
      creationSeule: true,
    },
  },
  {
    motif: new RegExp(`^artisans/(${ID})/realisations/${ID}/${NOM}$`),
    regle: { permission: 'realisations.modifier', types: IMAGES, maxMo: 8, creationSeule: false },
  },
  {
    motif: new RegExp(`^artisans/(${ID})/documents/${ID}/${NOM}$`),
    regle: { permission: 'documents.televerser', types: PIECES, maxMo: 10, creationSeule: true },
  },
];

/** Règle du chemin Storage demandé, ou `null` s'il n'est pas déposable par un artisan. */
export function regleDepot(chemin: string): RegleDepot | null {
  for (const { motif, regle } of REGLES) {
    const m = motif.exec(chemin);
    if (m) return { artisanId: m[1]!, ...regle };
  }
  return null;
}

const commence = (o: Uint8Array, signature: readonly number[], decalage = 0) =>
  signature.every((b, i) => o[decalage + i] === b);
const code = (s: string) => [...s].map((c) => c.charCodeAt(0));

/** Type réel d'après les premiers octets (le type annoncé par le navigateur ne suffit pas). */
export function typeReel(o: Uint8Array): string | null {
  if (commence(o, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (commence(o, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  if (commence(o, code('RIFF')) && commence(o, code('WEBP'), 8)) return 'image/webp';
  if (commence(o, code('ftypavif'), 4) || commence(o, code('ftypavis'), 4)) return 'image/avif';
  if (commence(o, code('%PDF-'))) return 'application/pdf';
  return null;
}
