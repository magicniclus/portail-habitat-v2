import { definition, MODELES, type NomModele } from '@ph/core/notifications';
import { describe, expect, it } from 'vitest';
import { RAISONS } from './chartes';
import { MODELES_EMAIL, rendreEmail } from './index';

const pied = {
  preferences: 'https://portailhabitat.fr/preferences?t=exemple',
  desabonnement: 'https://portailhabitat.fr/api/desabonnement?t=exemple',
  aide: 'https://portailhabitat.fr/aide',
  editeur: 'Portail Habitat · Raison sociale · Adresse postale',
};
const noms = Object.keys(MODELES) as NomModele[];
const rediges = noms.filter((n) => 'complet' in MODELES[n]);

describe('catalogue des modèles', () => {
  it('chaque nom du catalogue a un modèle', () => {
    expect(Object.keys(MODELES_EMAIL).sort()).toEqual([...noms].sort());
  });
});

describe.each(noms)('%s', (nom) => {
  it('rendu avec ses données d’exemple : sujet court, liens valides, pied conforme', async () => {
    const m = MODELES_EMAIL[nom];
    const r = await rendreEmail(nom, m.exemple as Record<string, unknown>, { pied });
    expect(r.sujet.length).toBeGreaterThan(0);
    expect(r.sujet.length).toBeLessThan(60);
    expect(r.html).toContain('<html');
    expect(r.html).toContain('lang="fr"');
    expect(r.html).not.toMatch(/localhost|127\.0\.0\.1/);
    expect(r.texte.length).toBeGreaterThan(20);
    expect(r.texte).not.toContain('<');
    const { desabonnable } = RAISONS[definition(nom).categorie];
    expect(r.html.includes('Se désabonner')).toBe(desabonnable);
    expect(r.html).toContain('Mes préférences');
  });
});

describe('modèles rédigés (§4.1 à 4.3, 4.6, 4.7 et reprise du simulateur)', () => {
  it('70 modèles rédigés', () => expect(rediges).toHaveLength(70));
  it.each(rediges)('%s : version texte', async (nom) => {
    const r = await rendreEmail(nom, MODELES_EMAIL[nom].exemple as Record<string, unknown>, {
      pied,
    });
    expect(`${r.sujet}\n${r.preheader}\n\n${r.texte}`).toMatchSnapshot();
  });
  it('charte de l’espace pour les emails de sécurité', async () => {
    const pro = await rendreEmail(
      'lien-connexion',
      MODELES_EMAIL['lien-connexion'].exemple as Record<string, unknown>,
      { pied, espace: 'pro' },
    );
    const part = await rendreEmail(
      'lien-connexion',
      MODELES_EMAIL['lien-connexion'].exemple as Record<string, unknown>,
      { pied },
    );
    expect(pro.html).toContain('PRO');
    expect(pro.html).not.toBe(part.html);
  });
  it('code de vérification aussi par SMS, moins de 160 caractères', async () => {
    const r = await rendreEmail('verifier-telephone', { code: '482913' }, { pied });
    expect(r.sms).toContain('482913');
    expect(r.sms!.length).toBeLessThanOrEqual(160);
  });
  it('invitation : l’email du destinataire n’apparaît jamais en clair', async () => {
    const r = await rendreEmail(
      'invitation-membre',
      MODELES_EMAIL['invitation-membre'].exemple as Record<string, unknown>,
      { pied },
    );
    expect(r.html).toContain('l•••@g•••.com');
    expect(r.html).toContain('/pro/invitation?t=');
  });
});

describe('variante B (tests A/B)', () => {
  it('objet B quand la donnée variante vaut B, objet A sinon', async () => {
    const ex = MODELES_EMAIL['vis-position'].exemple as Record<string, unknown>;
    const a = await rendreEmail('vis-position', ex, { pied });
    const b = await rendreEmail('vis-position', { ...ex, variante: 'B' }, { pied });
    expect(b.sujet).not.toBe(a.sujet);
    expect(b.sujet.length).toBeLessThan(60);
  });
});
