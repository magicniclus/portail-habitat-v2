import Anthropic from '@anthropic-ai/sdk';
import { describe, expect, it } from 'vitest';
import { raisonEchecClaude } from '../src/serveur/studio/claude';

describe('raison d’un échec de Claude', () => {
  it('code HTTP, indice et message de l’API', () => {
    const e = Anthropic.APIError.generate(
      400,
      { type: 'error', error: { type: 'invalid_request_error', message: 'max_tokens trop grand' } },
      undefined,
      new Headers(),
    );
    expect(raisonEchecClaude(e)).toBe('400 : max_tokens trop grand');
    const cle = Anthropic.APIError.generate(
      401,
      { type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } },
      undefined,
      new Headers(),
    );
    expect(raisonEchecClaude(cle)).toBe('401 (clé ANTHROPIC_API_KEY refusée) : invalid x-api-key');
    expect(raisonEchecClaude(new Error('x'.repeat(400)))).toHaveLength(300);
    expect(raisonEchecClaude('panne')).toBe('panne');
  });
});
