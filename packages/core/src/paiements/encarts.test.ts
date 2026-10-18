import { describe, expect, it } from 'vitest';
import { encartAffiche, offreContextuelle, MASQUAGE_ENCART_JOURS } from './encarts';

const JOUR = 86_400_000;
const t = Date.UTC(2026, 9, 16);

describe('offreContextuelle (PAIEMENTS §4)', () => {
  it('jamais une offre déjà incluse', () => {
    expect(offreContextuelle('fiche_pro', 'fiche_pro')).toBeNull();
    expect(offreContextuelle('tout_inclus', 'fiche_pro')).toBeNull();
    expect(offreContextuelle('pack_fiche_site', 'site_pro')).toBeNull();
  });
  it('Fiche + Site pour qui a déjà l’autre moitié', () => {
    expect(offreContextuelle('site_pro', 'fiche_pro')).toBe('pack_fiche_site');
    expect(offreContextuelle('fiche_pro', 'site_pro')).toBe('pack_fiche_site');
    expect(offreContextuelle('gratuit', 'fiche_pro')).toBe('fiche_pro');
  });
});

describe('encartAffiche', () => {
  const base = {
    cle: 'realisations' as const,
    formule: 'gratuit' as const,
    masques: {},
    enLigne: true,
    maintenant: t,
  };
  it('offre proposée hors onboarding', () => {
    expect(encartAffiche(base)).toBe('fiche_pro');
  });
  it('aucun encart pendant l’onboarding (fiche pas encore en ligne)', () => {
    expect(encartAffiche({ ...base, enLigne: false })).toBeNull();
  });
  it('« Plus tard » masque 30 jours', () => {
    expect(MASQUAGE_ENCART_JOURS).toBe(30);
    expect(encartAffiche({ ...base, masques: { realisations: t - 29 * JOUR } })).toBeNull();
    expect(encartAffiche({ ...base, masques: { realisations: t - 31 * JOUR } })).toBe('fiche_pro');
    expect(encartAffiche({ ...base, masques: { coordonnees: t } })).toBe('fiche_pro');
  });
  it('rien si l’offre est déjà incluse', () => {
    expect(encartAffiche({ ...base, formule: 'fiche_pro' })).toBeNull();
  });
});
