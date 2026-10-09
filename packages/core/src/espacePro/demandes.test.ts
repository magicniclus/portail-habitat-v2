import { describe, expect, it } from 'vitest';
import {
  compterDemandesPro,
  etatPro,
  filtrerDemandesPro,
  LIBELLES_ETAT_PRO,
  transitionAttribution,
} from './demandes';

describe('etatPro (maquette Mes Demandes)', () => {
  it.each([
    ['proposee', 'nouveau'],
    ['vue', 'nouveau'],
    ['acceptee', 'contacte'],
    ['devis_envoye', 'contacte'],
    ['devis_accepte', 'converti'],
    ['refusee', 'perdu'],
    ['devis_refuse', 'perdu'],
    ['expiree', 'perdu'],
  ] as const)('%s → %s', (statut, etat) => {
    expect(etatPro(statut)).toBe(etat);
  });

  it('libellés de la maquette', () => {
    expect(LIBELLES_ETAT_PRO).toEqual({
      nouveau: 'Nouveau',
      contacte: 'Contacté',
      converti: 'Converti',
      perdu: 'Perdu',
    });
  });
});

describe('transitionAttribution', () => {
  it('accepter ou refuser une demande proposée ou vue', () => {
    expect(transitionAttribution('proposee', 'accepter')).toBe('acceptee');
    expect(transitionAttribution('vue', 'accepter')).toBe('acceptee');
    expect(transitionAttribution('vue', 'refuser')).toBe('refusee');
  });

  it('ouvrir une demande proposée la marque vue ; sinon rien ne change', () => {
    expect(transitionAttribution('proposee', 'voir')).toBe('vue');
    expect(transitionAttribution('acceptee', 'voir')).toBe('acceptee');
  });

  it('refuse les transitions impossibles', () => {
    expect(transitionAttribution('acceptee', 'refuser')).toBeNull();
    expect(transitionAttribution('expiree', 'accepter')).toBeNull();
    expect(transitionAttribution('refusee', 'accepter')).toBeNull();
  });
});

const d = (etat: 'nouveau' | 'contacte' | 'converti' | 'perdu', texte: string) => ({
  etat,
  recherche: texte,
});

describe('compteurs et filtres', () => {
  const liste = [
    d('nouveau', 'Hélène Marty Rénovation de toiture Floirac'),
    d('nouveau', 'Salle de bain Pessac'),
    d('contacte', 'Isolation des combles Mérignac'),
    d('converti', 'Pose de carrelage Bordeaux'),
  ];

  it('compte par état', () => {
    expect(compterDemandesPro(liste)).toEqual({
      total: 4,
      nouveau: 2,
      contacte: 1,
      converti: 1,
      perdu: 0,
    });
  });

  it('filtre par texte (sans accents) et par état', () => {
    expect(filtrerDemandesPro(liste, { q: 'merignac' })).toHaveLength(1);
    expect(filtrerDemandesPro(liste, { etat: 'nouveau' })).toHaveLength(2);
    expect(filtrerDemandesPro(liste, { q: 'toiture', etat: 'contacte' })).toHaveLength(0);
    expect(filtrerDemandesPro(liste, {})).toHaveLength(4);
  });
});
