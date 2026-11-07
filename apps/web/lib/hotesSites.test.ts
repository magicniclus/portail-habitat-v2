import { describe, expect, it } from 'vitest';
import { hoteSite } from './hotesSites';

describe('aiguillage des sites artisans par hôte', () => {
  const p = 'portailtravaux.fr';
  it('plateforme, local et aperçus : pas un site', () => {
    for (const h of [
      'portailtravaux.fr',
      'www.portailtravaux.fr',
      'localhost:3000',
      '127.0.0.1:3300',
      'pr-12.vercel.app',
      null,
    ])
      expect(hoteSite(h, p)).toBeNull();
  });
  it('sous-domaine gratuit ou domaine connecté : site', () => {
    expect(hoteSite('bertrand.portailtravaux.fr', p)).toBe('bertrand.portailtravaux.fr');
    expect(hoteSite('WWW.Bertrand-Renovation.fr:443', p)).toBe('www.bertrand-renovation.fr');
    expect(hoteSite('évil".fr', p)).toBeNull();
  });
});
