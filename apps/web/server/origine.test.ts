import { describe, expect, it } from 'vitest';
import { memeOrigine } from './origine';

const req = (h: Record<string, string>) =>
  new Request('https://portailtravaux.fr/api/session', { method: 'POST', headers: h });

describe('memeOrigine', () => {
  it('même hôte : accepté', () => {
    expect(
      memeOrigine(req({ origin: 'https://portailtravaux.fr', host: 'portailtravaux.fr' })),
    ).toBe(true);
    expect(memeOrigine(req({ origin: 'http://localhost:3000', host: 'localhost:3000' }))).toBe(
      true,
    );
  });
  it('proxy : x-forwarded-host prioritaire', () => {
    expect(
      memeOrigine(req({ origin: 'https://a.fr', host: 'interne', 'x-forwarded-host': 'a.fr' })),
    ).toBe(true);
  });
  it.each([
    [{ origin: 'https://pirate.fr', host: 'portailtravaux.fr' }],
    [{ host: 'portailtravaux.fr' }],
    [{ origin: 'pas une url', host: 'portailtravaux.fr' }],
    [{ origin: 'https://portailtravaux.fr' }],
  ])('refusé : %j', (h) => expect(memeOrigine(req(h))).toBe(false));
});
