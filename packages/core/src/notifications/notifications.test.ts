import { describe, expect, it } from 'vitest';
import { definition, estModele, MODELES } from './catalogue';
import { cleIdempotence, deciderCanaux, instantSms, planifierEnvoi } from './decisions';

describe('catalogue (EMAILS §4)', () => {
  it('tous les modèles des §4.1 à 4.3, 4.6 et 4.7 sont rédigés, plus la reprise du simulateur', () => {
    const complets = Object.entries(MODELES)
      .filter(([, d]) => 'complet' in d)
      .map(([n]) => n);
    expect(complets).toHaveLength(70);
    expect(complets).toContain('reprise-simulateur');
    expect(complets).toContain('recu');
  });
  it('les modèles différés et groupés sont marqués', () => {
    expect(definition('relance-onboarding-2').differe).toBe(true);
    expect(definition('nouveau-message').groupe).toBe(true);
    expect(definition('nouvelle-demande').sms).toBe(true);
  });
  it('noms reconnus', () => {
    expect(estModele('lien-connexion')).toBe(true);
    expect(estModele('toString')).toBe(false);
  });
});

describe('canaux (EMAILS §2)', () => {
  const coupe = { activite: { email: false, inapp: false }, relance: { email: false } };
  it('sécurité et transactionnel : jamais coupés par les préférences', () => {
    expect(deciderCanaux('lien-connexion', { preferences: coupe }).email).toBe('envoyer');
    expect(deciderCanaux('invitation-membre', { preferences: coupe }).email).toBe('envoyer');
  });
  it('activité et relance : préférences respectées', () => {
    expect(deciderCanaux('invitation-acceptee', { preferences: coupe })).toEqual({
      email: 'bloque_preferences',
      sms: 'non_prevu',
      inapp: 'bloque_preferences',
    });
    expect(deciderCanaux('relance-onboarding-1', { preferences: coupe }).email).toBe(
      'bloque_preferences',
    );
    expect(deciderCanaux('relance-onboarding-1').email).toBe('envoyer');
  });
  it('marketing désactivé par défaut, offres pro activées par défaut', () => {
    expect(deciderCanaux('prospect-estimation').email).toBe('envoyer');
    expect(
      deciderCanaux('prospect-estimation', { preferences: { offres_pro: { email: false } } }).email,
    ).toBe('bloque_preferences');
  });
  it('liste de blocage : un email de sécurité passe une seule fois, rien d’autre', () => {
    expect(deciderCanaux('lien-connexion', { emailSupprime: true }).email).toBe('envoyer');
    expect(
      deciderCanaux('lien-connexion', { emailSupprime: true, securiteDejaForcee: true }).email,
    ).toBe('bloque_suppression');
    expect(deciderCanaux('invitation-membre', { emailSupprime: true }).email).toBe(
      'bloque_suppression',
    );
  });
  it('SMS : codes toujours, nouvelle demande seulement si activé, jamais sans téléphone', () => {
    expect(deciderCanaux('verifier-telephone', { telephone: true }).sms).toBe('envoyer');
    expect(deciderCanaux('verifier-telephone').sms).toBe('non_prevu');
    expect(deciderCanaux('nouvelle-demande', { telephone: true }).sms).toBe('bloque_preferences');
    expect(
      deciderCanaux('nouvelle-demande', {
        telephone: true,
        preferences: { activite: { sms: true } },
      }).sms,
    ).toBe('envoyer');
    expect(deciderCanaux('assurance-expire', { telephone: true }).sms).toBe('envoyer');
    expect(deciderCanaux('lien-connexion', { telephone: true }).sms).toBe('non_prevu');
  });
});

describe('idempotence', () => {
  it('modele:refObjet:destinataire[:variante]', () => {
    expect(cleIdempotence('demande-confirmee', 'demandes/abc', 'uid123')).toBe(
      'demande-confirmee:demandes/abc:uid123',
    );
    expect(cleIdempotence('relance-onboarding-1', 'brouillons/x', 'u', 'j1')).toBe(
      'relance-onboarding-1:brouillons/x:u:j1',
    );
  });
});

describe('heures calmes des SMS', () => {
  it.each([
    ['2026-09-28T20:30:00Z', '2026-09-29T06:00:00Z'], // 22 h 30 à Paris → 8 h le lendemain
    ['2026-09-28T04:15:00Z', '2026-09-28T06:00:00Z'], // 6 h 15 → 8 h
    ['2026-09-28T12:00:00Z', '2026-09-28T12:00:00Z'], // 14 h : immédiat
    ['2026-12-15T21:00:00Z', '2026-12-16T07:00:00Z'], // hiver (UTC+1)
  ])('nouvelle demande à %s → %s', (a, b) => {
    expect(instantSms('nouvelle-demande', new Date(a)).toISOString()).toBe(
      new Date(b).toISOString(),
    );
  });
  it('les codes partent la nuit', () => {
    const nuit = new Date('2026-09-28T23:00:00Z');
    expect(instantSms('verifier-telephone', nuit)).toBe(nuit);
  });
});

describe('limites de pression (EMAILS §6)', () => {
  const vide = { nonTransactionnelsAujourdhui: 0, offresPro7j: 0 };
  const lundi = new Date('2026-09-28T10:00:00Z');
  it('transactionnel : jamais reporté', () => {
    expect(
      planifierEnvoi('invitation-membre', lundi, {
        nonTransactionnelsAujourdhui: 9,
        offresPro7j: 9,
      }),
    ).toBe(lundi);
  });
  it('un seul email non transactionnel par jour : le suivant part le lendemain à 9 h', () => {
    expect(planifierEnvoi('relance-onboarding-1', lundi, vide)).toBe(lundi);
    expect(
      planifierEnvoi('relance-onboarding-1', lundi, {
        ...vide,
        nonTransactionnelsAujourdhui: 1,
      })!.toISOString(),
    ).toBe('2026-09-29T07:00:00.000Z');
  });
  it('offres pro : 2 par semaine, jamais le week-end', () => {
    expect(planifierEnvoi('vis-position', lundi, { ...vide, offresPro7j: 2 })).toBeNull();
    const samedi = new Date('2026-10-03T10:00:00Z');
    expect(planifierEnvoi('vis-position', samedi, vide)!.toISOString()).toBe(
      '2026-10-05T07:00:00.000Z',
    );
    expect(planifierEnvoi('vis-position', lundi, vide)).toBe(lundi);
  });
});
