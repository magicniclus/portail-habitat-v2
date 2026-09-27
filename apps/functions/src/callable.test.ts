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
