import { beforeEach, describe, expect, it, vi } from 'vitest';
import type * as Notifications from '@ph/firebase/notifications';
import type { EnvoiEnFile } from '@ph/firebase/notifications';

const stockage = vi.hoisted(() => ({
  envoi: null as EnvoiEnFile | null,
  envoyes: [] as [string, string][],
  annules: [] as string[],
  echecs: [] as string[],
  reessayer: true,
}));
vi.mock('@ph/firebase/notifications', async (original) => ({
  ...(await original<typeof Notifications>()),
  lireEnvoi: async () => stockage.envoi,
  marquerEnvoye: async (_s: unknown, id: string, f: string) => void stockage.envoyes.push([id, f]),
  annulerEnvoi: async (_s: unknown, id: string) => void stockage.annules.push(id),
  noterEchec: async (_s: unknown, id: string) => (stockage.echecs.push(id), stockage.reessayer),
}));
vi.mock('./conditions', () => ({
  encoreValable: async (_db: unknown, e: EnvoiEnFile) => e.donnees.valable !== false,
}));

const { traiterEnvoi, lienAbsolu } = await import('./envoyer');
const { brevoSms, estAutorise, mailpit, resend } = await import('./fournisseurs');

const faux = (reponse: object, ok = true) => {
  const appels: { url: string; corps: Record<string, unknown>; entetes: Record<string, string> }[] =
    [];
  const f = (async (url: string, init: RequestInit) => {
    appels.push({
      url,
      corps: JSON.parse(String(init.body)),
      entetes: init.headers as Record<string, string>,
    });
    return {
      ok,
      status: ok ? 200 : 500,
      json: async () => reponse,
      text: async () => 'erreur',
    } as Response;
  }) as unknown as typeof fetch;
  return { appels, f };
};

describe('fournisseurs', () => {
  it('Resend : clé en en-tête, en-têtes de désabonnement transmis', async () => {
    const { appels, f } = faux({ id: 're_1' });
    const r = await resend('cle', f).envoyer({
      de: 'A <a@x.fr>',
      a: 'b@x.fr',
      sujet: 'S',
      html: '<p>h</p>',
      texte: 't',
      entetes: { 'List-Unsubscribe': '<u>' },
    });
    expect(r).toEqual({ id: 're_1' });
    expect(appels[0]!.entetes.authorization).toBe('Bearer cle');
    expect(appels[0]!.corps).toMatchObject({
      to: ['b@x.fr'],
      headers: { 'List-Unsubscribe': '<u>' },
    });
  });
  it('Mailpit : capture locale, expéditeur décomposé', async () => {
    const { appels, f } = faux({ ID: 'm1' });
    expect(
      await mailpit('http://127.0.0.1:8025/', f).envoyer({
        de: 'Portail Habitat <n@p.fr>',
        a: 'b@x.fr',
        sujet: 'S',
        html: 'h',
        texte: 't',
      }),
    ).toEqual({ id: 'mailpit:m1' });
    expect(appels[0]!.url).toBe('http://127.0.0.1:8025/api/v1/send');
    expect(appels[0]!.corps.From).toEqual({ Name: 'Portail Habitat', Email: 'n@p.fr' });
  });
  it('Brevo : SMS transactionnel, numéro sans « + »', async () => {
    const { appels, f } = faux({ messageId: 42 });
    expect(
      await brevoSms('k', 'PortailHab', f).envoyer({ a: '+33612345678', texte: 'Code 1' }),
    ).toEqual({ id: '42' });
    expect(appels[0]!.corps).toMatchObject({
      sender: 'PortailHab',
      recipient: '33612345678',
      type: 'transactional',
    });
  });
  it('erreur du fournisseur : levée pour déclencher une nouvelle tentative', async () => {
    await expect(
      resend('k', faux({}, false).f).envoyer({
        de: 'a',
        a: 'b',
        sujet: 's',
        html: 'h',
        texte: 't',
      }),
    ).rejects.toThrow(/Resend 500/);
  });
  it('liste blanche de staging', () => {
    expect(estAutorise('julie@portailhabitat.fr', '@portailhabitat.fr')).toBe(true);
    expect(estAutorise('client@gmail.com', '@portailhabitat.fr, @test.local')).toBe(false);
    expect(estAutorise('client@gmail.com', undefined)).toBe(true);
  });
  it('liens absolus avec suivi de campagne, jamais sur un site tiers', () => {
    expect(lienAbsolu('https://portailhabitat.fr', '/pro/equipe', 'invitation-membre')).toBe(
      'https://portailhabitat.fr/pro/equipe?utm_source=email&utm_campaign=invitation-membre',
    );
    expect(lienAbsolu('https://portailhabitat.fr', 'https://stripe.com/x', 'recu')).toBe(
      'https://stripe.com/x',
    );
  });
});

describe('traiterEnvoi', () => {
  const emails: {
    de: string;
    a: string;
    sujet: string;
    html: string;
    entetes?: Record<string, string>;
  }[] = [];
  const sms: { a: string; texte: string }[] = [];
  const config = {
    db: {} as never,
    horloge: () => Date.UTC(2026, 8, 28, 12),
    email: { envoyer: async (m: (typeof emails)[number]) => (emails.push(m), { id: 're_1' }) },
    sms: { envoyer: async (m: (typeof sms)[number]) => (sms.push(m), { id: 'sms_1' }) },
    secret: 's'.repeat(32),
    urlSite: 'https://portailhabitat.fr',
    expediteurs: { defaut: 'PH <n@p.fr>', pro: 'PH Pro <pro@p.fr>' },
    editeur: 'Portail Habitat',
  };
  const envoi = (x: Partial<EnvoiEnFile> = {}): EnvoiEnFile => ({
    id: 'e1',
    modele: 'invitation-membre',
    canal: 'email',
    destinataire: 'lea@test.local',
    artisanId: 'a1',
    categorie: 'transactionnel',
    refObjet: 'invitations/i1',
    donnees: {
      nomCommercial: 'Bertrand Rénovation',
      ville: 'Bordeaux',
      invitant: 'Julien',
      role: 'collaborateur',
      emailMasque: 'l•••@t•••.local',
      expireLe: '2 octobre 2026',
    },
    tentatives: 0,
    ...x,
  });
  beforeEach(() => {
    Object.assign(stockage, { envoi: null, envoyes: [], annules: [], echecs: [], reessayer: true });
    emails.length = 0;
    sms.length = 0;
  });

  it('rend le modèle avec le secret (lien d’invitation) et note l’envoi', async () => {
    stockage.envoi = envoi();
    expect(await traiterEnvoi(config, 'e1', { lien: '/pro/invitation?t=JETON' })).toBe('envoye');
    expect(emails[0]!.de).toBe('PH Pro <pro@p.fr>');
    expect(emails[0]!.html).toContain(
      'https://portailhabitat.fr/pro/invitation?t=JETON&amp;utm_source=email',
    );
    expect(emails[0]!.entetes).toBeUndefined();
    expect(stockage.envoyes).toEqual([['e1', 're_1']]);
  });
  it('catégorie désabonnable : en-têtes List-Unsubscribe en un clic', async () => {
    stockage.envoi = envoi({ modele: 'invitation-relance', categorie: 'relance' });
    await traiterEnvoi(config, 'e1', { lien: '/x' });
    expect(emails[0]!.entetes!['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');
    expect(emails[0]!.entetes!['List-Unsubscribe']).toMatch(
      /^<https:\/\/portailhabitat\.fr\/api\/desabonnement\?t=/,
    );
    expect(emails[0]!.entetes!['List-Unsubscribe']).not.toContain('lea@');
  });
  it('relance devenue inutile : annulée, rien n’est envoyé', async () => {
    stockage.envoi = envoi({
      modele: 'invitation-relance',
      categorie: 'relance',
      donnees: { ...envoi().donnees, valable: false },
    });
    expect(await traiterEnvoi(config, 'e1')).toBe('annule');
    expect(emails).toHaveLength(0);
  });
  it('déjà traité : ignoré', async () => {
    expect(await traiterEnvoi(config, 'e1')).toBe('ignore');
  });
  it('hors liste blanche (staging) : annulé', async () => {
    stockage.envoi = envoi();
    expect(await traiterEnvoi({ ...config, listeBlanche: '@portailhabitat.fr' }, 'e1')).toBe(
      'hors_liste_blanche',
    );
  });
  it('SMS : texte du modèle', async () => {
    stockage.envoi = envoi({
      modele: 'verifier-telephone',
      canal: 'sms',
      destinataire: '+33612345678',
      categorie: 'securite',
      donnees: { code: '482913' },
      artisanId: undefined,
    });
    await traiterEnvoi(config, 'e1');
    expect(sms[0]).toEqual({ a: '+33612345678', texte: expect.stringContaining('482913') });
  });
  it('échec : erreur relancée tant qu’il reste des tentatives, abandon ensuite', async () => {
    stockage.envoi = envoi();
    const panne = {
      ...config,
      email: { envoyer: async () => Promise.reject(new Error('Resend 500')) },
    };
    await expect(traiterEnvoi(panne, 'e1')).rejects.toThrow('Resend 500');
    stockage.reessayer = false;
    expect(await traiterEnvoi(panne, 'e1')).toBe('ignore');
    expect(stockage.echecs).toEqual(['e1', 'e1']);
  });
});
