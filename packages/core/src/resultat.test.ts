import { describe, expect, it } from 'vitest';
import { echec, succes } from './resultat';
import { messageErreur } from './erreurs';

describe('resultat', () => {
  it('succes', () => {
    expect(succes({ id: 'a' })).toEqual({ ok: true, data: { id: 'a' } });
  });
  it('echec avec message par défaut ou précis, et champs', () => {
    expect(echec('INTERNE')).toEqual({
      ok: false,
      code: 'INTERNE',
      message: messageErreur('INTERNE'),
    });
    expect(
      echec('ENTREE_INVALIDE', { message: 'x', champs: { email: ['Email invalide'] } }),
    ).toEqual({
      ok: false,
      code: 'ENTREE_INVALIDE',
      message: 'x',
      champs: { email: ['Email invalide'] },
    });
  });
});
