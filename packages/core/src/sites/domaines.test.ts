import { describe, expect, it } from 'vitest';
import {
  enregistrementsConnexion,
  fqdn,
  hoteCanonique,
  hotesDuDomaine,
  STATUTS_DOMAINE,
  suiteVerification,
} from './domaines';

describe('domaines (DOMAINES §4)', () => {
  it('enregistrements à créer : valeurs lues chez l’hébergeur, TXT sur un sous-nom, jamais de MX (DOM-08)', () => {
    const e = enregistrementsConnexion('jeton24', {
      apex: ['203.0.113.7'],
      cname: 'cname.exemple-hebergeur.net.',
      verifications: [{ nom: '_vercel', valeur: 'vc-domain-verify=abc' }],
    });
    expect(e).toEqual([
      { type: 'A', nom: '@', valeur: '203.0.113.7' },
      { type: 'CNAME', nom: 'www', valeur: 'cname.exemple-hebergeur.net' },
      { type: 'TXT', nom: '_portailtravaux', valeur: 'ph-verif=jeton24' },
      { type: 'TXT', nom: '_vercel', valeur: 'vc-domain-verify=abc' },
    ]);
    expect(e.some((x) => (x.type as string) === 'MX')).toBe(false);
  });

  it('nom complet à interroger', () => {
    expect(fqdn('exemple.fr', '@')).toBe('exemple.fr');
    expect(fqdn('exemple.fr', 'www')).toBe('www.exemple.fr');
    expect(fqdn('exemple.fr', '_vercel.exemple.fr')).toBe('_vercel.exemple.fr');
  });

  it('adresse canonique : domaine actif (www ou nu), sinon le sous-domaine', () => {
    const base = { sousDomaine: 'bertrand' };
    expect(hoteCanonique(base, 'portailtravaux.fr')).toBe('bertrand.portailtravaux.fr');
    expect(
      hoteCanonique(
        { ...base, domaine: { nom: 'b.fr', statut: 'attente_dns', principal: 'www' } },
        'portailtravaux.fr',
      ),
    ).toBe('bertrand.portailtravaux.fr');
    expect(
      hoteCanonique(
        { ...base, domaine: { nom: 'b.fr', statut: 'actif', principal: 'www' } },
        'p.fr',
      ),
    ).toBe('www.b.fr');
    expect(
      hoteCanonique(
        { ...base, domaine: { nom: 'b.fr', statut: 'actif', principal: 'apex' } },
        'p.fr',
      ),
    ).toBe('b.fr');
    expect(hotesDuDomaine('b.fr')).toEqual(['b.fr', 'www.b.fr']);
  });

  it('suite de la vérification : 2 min la première heure, 30 min jusqu’à 72 h, puis échec', () => {
    const t0 = Date.UTC(2026, 9, 1);
    expect(suiteVerification(t0, t0 + 10 * 60_000)).toBe(t0 + 12 * 60_000);
    expect(suiteVerification(t0, t0 + 2 * 3_600_000)).toBe(t0 + 2 * 3_600_000 + 30 * 60_000);
    expect(suiteVerification(t0, t0 + 73 * 3_600_000)).toBeNull();
    expect(STATUTS_DOMAINE.actif.tone).toBe('succes');
  });
});
