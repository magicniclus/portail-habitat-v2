import { describe, expect, it } from 'vitest';
import { entreeContact } from '../schemas/entreesSupport';
import { referenceContact, SUJETS_CONTACT, sujetContact } from './sujets';

describe('Aide et contact', () => {
  it('sujets uniques ; sujet inconnu → premier sujet', () => {
    expect(new Set(SUJETS_CONTACT.map((s) => s.id)).size).toBe(SUJETS_CONTACT.length);
    expect(sujetContact('mediation')).toHaveProperty('ref', "Nom de l'entreprise");
    expect(sujetContact('nimporte').id).toBe('question');
    expect(sujetContact(null).id).toBe('question');
  });
  it('référence lisible, sans caractères ambigus', () => {
    let i = 0;
    const r = referenceContact(() => (i++ % 32) / 32);
    expect(r).toMatch(/^CT-[2-9A-HJ-NP-Z]{6}$/);
    expect(referenceContact(() => 0.9999999)).toBe('CT-ZZZZZZ');
  });
  it('entrée validée, espaces retirés ; piège à robots rempli refusé', () => {
    const ok = entreeContact.parse({
      sujet: 'demande',
      nom: '  Camille Martin ',
      email: 'camille@test.local',
      message: 'Aucun artisan ne m’a rappelée depuis lundi.',
    });
    expect(ok.nom).toBe('Camille Martin');
    expect(entreeContact.safeParse({ ...ok, site: 'http://spam' }).success).toBe(false);
    expect(entreeContact.safeParse({ ...ok, sujet: 'autre' }).success).toBe(false);
    expect(entreeContact.safeParse({ ...ok, message: 'court' }).success).toBe(false);
  });
});

describe('événement de recherche', () => {
  it('refuse une requête longue ou une session douteuse', async () => {
    const { entreeEvenementRecherche } = await import('../schemas/entreesSupport');
    const ok = {
      nature: 'choix',
      q: 'douche italienne',
      intention: 'sdb-italienne',
      rang: 1,
      session: 'ab12cd34',
    };
    expect(entreeEvenementRecherche.safeParse(ok).success).toBe(true);
    expect(entreeEvenementRecherche.safeParse({ ...ok, q: 'x'.repeat(81) }).success).toBe(false);
    expect(entreeEvenementRecherche.safeParse({ ...ok, session: 'camille@mail.fr' }).success).toBe(
      false,
    );
    expect(entreeEvenementRecherche.safeParse({ ...ok, rang: 9 }).success).toBe(false);
  });
});
