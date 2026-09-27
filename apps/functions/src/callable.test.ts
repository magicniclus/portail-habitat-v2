import { describe, expect, it } from 'vitest';
import { contexteDepuis } from './callable';
import { schemaPing, traiterPing } from './appelables/ping';

const requete = (surcharge: object = {}) =>
  ({ auth: undefined, app: undefined, rawRequest: { ip: '203.0.113.7' }, ...surcharge }) as never;

describe('contexteDepuis', () => {
  it('visiteur : identifiant = empreinte de l’IP, jamais l’IP en clair', () => {
    const ctx = contexteDepuis(requete(), false);
    expect(ctx.uid).toBeNull();
    expect(ctx.identifiantClient).toMatch(/^ip:[0-9a-f]{16}$/);
    expect(ctx.identifiantClient).not.toContain('203.0.113.7');
    expect(ctx.appCheckVerifie).toBe(false);
  });
  it('connecté avec App Check', () => {
    const ctx = contexteDepuis(requete({ auth: { uid: 'u1' }, app: { appId: 'x' } }), false);
    expect(ctx).toEqual({ uid: 'u1', identifiantClient: 'u1', appCheckVerifie: true });
  });
  it('jeton : impersonation, date de connexion et second facteur', () => {
    const token = {
      uid: 'u1',
      auth_time: 1_700_000_000,
      firebase: { sign_in_second_factor: 'totp' },
      imp: { par: 'sa' },
    };
    expect(contexteDepuis(requete({ auth: { uid: 'u1', token }, app: {} }), false)).toEqual({
      uid: 'u1',
      identifiantClient: 'u1',
      appCheckVerifie: true,
      impersonation: true,
      authentifieLe: 1_700_000_000_000,
      secondFacteur: true,
    });
    const simple = { uid: 'u1', auth_time: 1, firebase: {} };
    expect(contexteDepuis(requete({ auth: { uid: 'u1', token: simple } }), false)).toMatchObject({
      impersonation: false,
      secondFacteur: false,
    });
  });
  it('émulateur : App Check considéré comme vérifié', () => {
    expect(contexteDepuis(requete(), true).appCheckVerifie).toBe(true);
  });
});

describe('ping', () => {
  it('renvoie l’écho', async () => {
    const r = await traiterPing(schemaPing.parse({ message: 'bonjour' }));
    expect(r).toMatchObject({ pong: true, echo: 'bonjour' });
  });
});
