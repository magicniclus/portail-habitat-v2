import { describe, expect, it } from 'vitest';
import {
  consentementsNotifs,
  decrireAppareil,
  normaliserNotifs,
  PREFERENCES_PRO_DEFAUT,
  resumeDeuxFacteurs,
} from './compte';

describe('normaliserNotifs (maquette Mon Compte, EMAILS §1–2)', () => {
  it('coupe les canaux qui ne servent pas à la catégorie (SMS seulement pour l’activité)', () => {
    const tout = { email: true, sms: true, inapp: true };
    const n = normaliserNotifs({
      activite: tout,
      relance: tout,
      offres_pro: tout,
      marketing: tout,
    });
    expect(n.activite).toEqual(tout);
    expect(n.relance).toEqual({ email: true, sms: false, inapp: true });
    expect(n.offres_pro).toEqual({ email: true, sms: false, inapp: false });
    expect(n.marketing).toEqual({ email: true, sms: false, inapp: false });
  });

  it('défauts : offres pro activées, actualités désactivées', () => {
    expect(PREFERENCES_PRO_DEFAUT.offres_pro.email).toBe(true);
    expect(PREFERENCES_PRO_DEFAUT.marketing.email).toBe(false);
  });
});

describe('consentementsNotifs (journal RGPD)', () => {
  const avant = PREFERENCES_PRO_DEFAUT;
  it('rien à journaliser sans changement', () => {
    expect(consentementsNotifs(avant, avant)).toEqual([]);
  });
  it('actualités activées → consentement marketing ; offres pro coupées → opposition', () => {
    const apres = {
      ...avant,
      marketing: { ...avant.marketing, email: true },
      offres_pro: { ...avant.offres_pro, email: false },
    };
    expect(consentementsNotifs(avant, apres)).toEqual([
      { type: 'marketing_email', valeur: true },
      { type: 'opposition_offres_pro', valeur: true },
    ]);
  });
});

describe('resumeDeuxFacteurs', () => {
  it('sans facteur : explication', () => {
    expect(resumeDeuxFacteurs([])).toBe(
      'Un code en plus du mot de passe à chaque nouvelle connexion',
    );
  });
  it('application et SMS de secours, numéro masqué', () => {
    expect(
      resumeDeuxFacteurs([{ type: 'totp' }, { type: 'sms', telephoneMasque: '06 12 •• •• 48' }]),
    ).toBe('Application d’authentification (TOTP) · SMS de secours au 06 12 •• •• 48');
  });
  it('SMS seul', () => {
    expect(resumeDeuxFacteurs([{ type: 'sms', telephoneMasque: '06 12 •• •• 48' }])).toBe(
      'Code par SMS au 06 12 •• •• 48',
    );
  });
});

describe('decrireAppareil', () => {
  it.each([
    [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36',
      'Chrome sur Mac',
    ],
    [
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      'Safari sur iPhone',
    ],
    [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36 Edg/129.0',
      'Edge sur Windows',
    ],
    [
      'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36',
      'Chrome sur Android',
    ],
    ['Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0', 'Firefox sur Linux'],
    ['', 'Navigateur inconnu'],
  ])('%s', (ua, attendu) => {
    expect(decrireAppareil(ua)).toBe(attendu);
  });
});
