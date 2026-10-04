import { definition, type NomModele } from '@ph/core/notifications';
import { render } from '@react-email/render';
import { createElement } from 'react';
import type { Theme } from '@ph/ui/tokens';
import { charteEmail } from './chartes';
import type { Modele } from './modele';
import { modelesConversion } from './modeles/conversion';
import { modelesConversionPremium } from './modeles/conversionPremium';
import { modelesEquipes } from './modeles/equipes';
import { modelesFacturation } from './modeles/facturation';
import { modelesOnboarding } from './modeles/onboarding';
import { modelesParticuliers } from './modeles/particuliers';
import { modelesSecurite } from './modeles/securite';
import { nomsSquelettes, squelette } from './modeles/squelettes';
import { Email, type PiedEmail } from './rendu/Email';

const REDIGES: Record<string, Modele<never>> = {
  ...modelesSecurite,
  ...modelesOnboarding,
  ...modelesEquipes,
  ...modelesParticuliers,
  ...modelesFacturation,
  ...modelesConversion,
  ...modelesConversionPremium,
} as unknown as Record<string, Modele<never>>;

/** Tous les modèles du catalogue : rédigés, ou squelettes en attendant leur lot. */
export const MODELES_EMAIL: Record<NomModele, Modele<never>> = Object.fromEntries([
  ...Object.entries(REDIGES),
  ...nomsSquelettes(Object.keys(REDIGES)).map((n) => [n, squelette(n) as unknown as Modele<never>]),
]) as Record<NomModele, Modele<never>>;

export interface ContexteRendu {
  /** Espace de la personne, pour les modèles communs (sécurité). */
  espace?: Theme;
  pied: PiedEmail;
}

export interface EmailRendu {
  sujet: string;
  preheader: string;
  html: string;
  texte: string;
  sms?: string;
}

/** Rend un email (HTML et version texte générée) à partir de son modèle et de ses données. */
export async function rendreEmail(
  nom: NomModele,
  donnees: Record<string, unknown>,
  ctx: ContexteRendu,
): Promise<EmailRendu> {
  const m = MODELES_EMAIL[nom] as unknown as Modele<Record<string, unknown>>;
  const def = definition(nom);
  const element = createElement(Email, {
    preheader: m.preheader(donnees),
    blocs: m.blocs(donnees),
    charte: charteEmail(def.charte, ctx.espace),
    categorie: def.categorie,
    pied: ctx.pied,
  });
  const [html, texte] = await Promise.all([render(element), render(element, { plainText: true })]);
  return {
    sujet: m.sujet(donnees),
    preheader: m.preheader(donnees),
    html,
    texte,
    ...(m.sms ? { sms: m.sms(donnees) } : {}),
  };
}

export type { Bloc } from './blocs';
export type { Modele } from './modele';
export type { PiedEmail } from './rendu/Email';
