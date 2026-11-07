import { describe, expect, it } from 'vitest';
import { z } from './zod';

describe('z (configuré en français)', () => {
  it('renvoie des messages de validation en français', () => {
    expect(z.string().safeParse(42).error?.issues[0]?.message).toMatch(/^Entrée invalide/);
    expect(z.email().safeParse('x').error?.issues[0]?.message).toBe('adresse e-mail invalide');
  });
});
