import { describe, expect, it } from 'vitest';
import {
  delaiApresEchecs,
  deuxFacteursRequisPourFacturation,
  MESSAGE_IDENTIFIANTS,
  messageErreurConnexion,
} from './index';

describe('messages de connexion (CON-01)', () => {
  it.each([
    'auth/invalid-credential',
    'auth/wrong-password',
    'auth/user-not-found',
    'auth/invalid-email',
    'auth/user-disabled',
  ])('%s : message générique, sans dire si l’email existe', (code) =>
    expect(messageErreurConnexion(code)).toBe(MESSAGE_IDENTIFIANTS),
  );
  it('trop de tentatives, réseau, inconnu', () => {
    expect(messageErreurConnexion('auth/too-many-requests')).toMatch(/Trop de tentatives/);
    expect(messageErreurConnexion('auth/network-request-failed')).toMatch(/connexion internet/);
    expect(messageErreurConnexion('auth/qqch')).toMatch(/réessayer/);
  });
});

describe('délai après échecs (CON-03)', () => {
  it('aucun délai avant 5 échecs, puis croissant, plafonné à 15 minutes', () => {
    expect([0, 1, 4].map(delaiApresEchecs)).toEqual([0, 0, 0]);
    expect(delaiApresEchecs(5)).toBe(30_000);
    expect(delaiApresEchecs(6)).toBe(60_000);
    expect(delaiApresEchecs(7)).toBe(120_000);
    expect(delaiApresEchecs(20)).toBe(15 * 60_000);
  });
});

describe('double authentification et facturation (CON-02)', () => {
  it('propriétaire ou gérant Premium sans second facteur : bloqué', () => {
    expect(
      deuxFacteursRequisPourFacturation({
        plan: 'premium',
        role: 'proprietaire',
        secondFacteur: false,
      }),
    ).toBe(true);
    expect(
      deuxFacteursRequisPourFacturation({ plan: 'premium', role: 'gerant', secondFacteur: false }),
    ).toBe(true);
  });
  it('avec second facteur, ou hors Premium, ou autre rôle : libre', () => {
    expect(
      deuxFacteursRequisPourFacturation({
        plan: 'premium',
        role: 'proprietaire',
        secondFacteur: true,
      }),
    ).toBe(false);
    expect(
      deuxFacteursRequisPourFacturation({
        plan: 'visibilite',
        role: 'proprietaire',
        secondFacteur: false,
      }),
    ).toBe(false);
    expect(
      deuxFacteursRequisPourFacturation({
        plan: 'premium',
        role: 'comptable',
        secondFacteur: false,
      }),
    ).toBe(false);
  });
});
