import type { Escalier, TypeEscalier } from './escaliers';

/**
 * Modèles d'escalier du menu (DES-15). Les escaliers tracés se dessinent clic par clic (départ,
 * virages, arrivée) ; colimaçon et échelle de meunier se posent d'un clic, à leur taille.
 */
export type ModeleEscalier =
  'limons' | 'balance' | 'palier' | 'suspendu' | 'central' | 'colimacon' | 'meunier';

export interface DefinitionModele {
  libelle: string;
  detail: string;
  /** Tracé clic par clic : réglages de l'escalier posé. */
  trace?: Pick<Escalier, 'virage' | 'structure'> & {
    limon: NonNullable<Escalier['limon']>;
    materiau?: Escalier['materiau'];
  };
  /** Posé d'un clic : type à taille fixe. */
  type?: TypeEscalier;
}

export const MODELES_ESCALIER: Record<ModeleEscalier, DefinitionModele> = {
  limons: {
    libelle: 'À limons',
    detail: 'Deux limons, marches ouvertes',
    trace: { virage: 'balance', structure: 'ouverte', limon: 'lateraux' },
  },
  balance: {
    libelle: 'Balancé',
    detail: 'Les marches tournent dans l’angle',
    trace: { virage: 'balance', structure: 'pleine', limon: 'lateraux' },
  },
  palier: {
    libelle: 'À palier',
    detail: 'Un palier carré à chaque virage',
    trace: { virage: 'palier', structure: 'ouverte', limon: 'lateraux' },
  },
  suspendu: {
    libelle: 'Suspendu',
    detail: 'Marches scellées dans le mur',
    trace: { virage: 'balance', structure: 'ouverte', limon: 'aucun' },
  },
  central: {
    libelle: 'Limon central',
    detail: 'Une poutre sous les marches',
    trace: { virage: 'balance', structure: 'ouverte', limon: 'central', materiau: 'metal' },
  },
  colimacon: { libelle: 'Colimaçon', detail: 'Le plus compact, un clic', type: 'helicoidal' },
  meunier: { libelle: 'Échelle de meunier', detail: 'Très raide, un clic', type: 'meunier' },
};

/** Modèle d'un escalier posé (le plus proche de ses réglages). */
export function modeleDe(e: Escalier): ModeleEscalier {
  if (!e.chemin)
    return e.type === 'helicoidal' ? 'colimacon' : e.type === 'meunier' ? 'meunier' : 'limons';
  if (e.virage === 'palier') return 'palier';
  if (e.limon === 'aucun') return 'suspendu';
  if (e.limon === 'central') return 'central';
  return e.structure === 'pleine' ? 'balance' : 'limons';
}
