import { inclut, type Formule, type FormulePayante } from './droits';

/**
 * Encarts contextuels (PAIEMENTS §4) : une phrase et un lien `?offre=` dans l'outil, au moment où
 * l'offre sert. Jamais pour une offre déjà incluse, jamais pendant l'onboarding, masqués 30 jours
 * par « Plus tard » (`users/{uid}.encartsMasques`).
 */
export const ENCARTS = {
  realisations: {
    voulue: 'fiche_pro',
    titre: 'Montrez tous vos chantiers',
    texte: 'Ajoutez autant de chantiers et de photos que vous voulez avec Fiche Pro.',
    raison: 'Les photos et réalisations illimitées sont incluses dans Fiche Pro.',
  },
  coordonnees: {
    voulue: 'fiche_pro',
    titre: 'Laissez les clients vous appeler',
    texte: 'Votre numéro est masqué sur votre fiche publique : affichez-le avec Fiche Pro.',
    raison: 'Le téléphone et le site visibles sur la fiche sont inclus dans Fiche Pro.',
  },
} as const satisfies Record<
  string,
  { voulue: FormulePayante; titre: string; texte: string; raison: string }
>;
export type CleEncart = keyof typeof ENCARTS;
export const CLES_ENCART = Object.keys(ENCARTS) as CleEncart[];

export const MASQUAGE_ENCART_JOURS = 30;

/** Offre à proposer : rien si déjà incluse ; Fiche + Site pour qui a déjà l'autre moitié. */
export function offreContextuelle(formule: Formule, voulue: FormulePayante): FormulePayante | null {
  if (inclut(formule, voulue)) return null;
  if (
    (voulue === 'fiche_pro' && formule === 'site_pro') ||
    (voulue === 'site_pro' && formule === 'fiche_pro')
  )
    return 'pack_fiche_site';
  return voulue;
}

export function encartAffiche(e: {
  cle: CleEncart;
  formule: Formule;
  /** `cle → masqué le (ms)`. */
  masques: Partial<Record<string, number>>;
  /** Fiche en ligne : l'onboarding est terminé. */
  enLigne: boolean;
  maintenant: number;
}): FormulePayante | null {
  if (!e.enLigne) return null;
  const masque = e.masques[e.cle];
  if (masque !== undefined && e.maintenant - masque < MASQUAGE_ENCART_JOURS * 86_400_000)
    return null;
  return offreContextuelle(e.formule, ENCARTS[e.cle].voulue);
}
