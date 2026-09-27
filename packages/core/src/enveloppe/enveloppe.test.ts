import { describe, expect, it, vi } from 'vitest';
import { z } from '../zod';
import { ErreurMetier, messageErreur } from '../erreurs';
import { creerEnveloppe, type ContexteBase, type Dependances } from './enveloppe';

const ctx = (surcharge: Partial<ContexteBase> = {}): ContexteBase => ({
  uid: 'u1',
  identifiantClient: 'u1',
  appCheckVerifie: true,
  ...surcharge,
});

const schema = z.object({ email: z.email(), nb: z.number().int().min(1) });
const entree = { email: 'a@b.fr', nb: 2 };

describe('creerEnveloppe', () => {
  it('impersonation : écriture refusée, lecture seule autorisée (COMPTES §6.2)', async () => {
    const env = creerEnveloppe({});
    const imp = ctx({ impersonation: true });
    const r = await env({ schema }, async () => 1)(entree, imp);
    expect(r).toMatchObject({ ok: false, code: 'PERMISSION_REFUSEE' });
    expect(r.ok === false && r.message).toMatch(/voir en tant que/);
    expect(await env({ schema, lectureSeule: true }, async () => 1)(entree, imp)).toEqual({
      ok: true,
      data: 1,
    });
  });

  it('authentification récente exigée (mot de passe ressaisi)', async () => {
    const maintenant = 1_000_000_000;
    const env = creerEnveloppe({ horloge: () => maintenant });
    const exec = env({ schema, authRecenteMin: 5 }, async () => 1);
    expect(await exec(entree, ctx())).toMatchObject({ ok: false, code: 'PRECONDITION' });
    expect(await exec(entree, ctx({ authentifieLe: maintenant - 6 * 60_000 }))).toMatchObject({
      code: 'PRECONDITION',
    });
    expect(await exec(entree, ctx({ authentifieLe: maintenant - 5 * 60_000 }))).toEqual({
      ok: true,
      data: 1,
    });
  });

  it('horloge par défaut : Date.now', async () => {
    const exec = creerEnveloppe({})({ schema, authRecenteMin: 5 }, async () => 1);
    expect(await exec(entree, ctx({ authentifieLe: Date.now() }))).toEqual({ ok: true, data: 1 });
  });

  it('second facteur exigé', async () => {
    const exec = creerEnveloppe({})({ schema, secondFacteur: true }, async () => 1);
    expect(await exec(entree, ctx())).toMatchObject({ ok: false, code: 'PRECONDITION' });
    expect(await exec(entree, ctx({ secondFacteur: true }))).toEqual({ ok: true, data: 1 });
  });

  it('valide, exécute et renvoie un succès', async () => {
    const handler = vi.fn(async (e: z.infer<typeof schema>) => e.nb * 2);
    const exec = creerEnveloppe({})({ schema }, handler);
    expect(await exec(entree, ctx())).toEqual({ ok: true, data: 4 });
    expect(handler).toHaveBeenCalledWith(entree, ctx());
  });

  it('renvoie les erreurs de validation par champ, sans appeler le traitement', async () => {
    const handler = vi.fn();
    const exec = creerEnveloppe({})({ schema }, handler);
    const r = await exec({ email: 'pas-un-email', nb: 0 }, ctx());
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.code).toBe('ENTREE_INVALIDE');
    expect(Object.keys(r.champs ?? {}).sort()).toEqual(['email', 'nb']);
    expect(handler).not.toHaveBeenCalled();
  });

  it('range les erreurs sans chemin sous « _ »', async () => {
    const exec = creerEnveloppe({})({ schema: z.string() }, async () => 1);
    const r = await exec(42, ctx());
    expect(r.ok === false && r.champs).toHaveProperty('_');
  });

  it('exige une connexion par défaut, sauf si facultative', async () => {
    const env = creerEnveloppe({});
    const anonyme = ctx({ uid: null });
    expect(await env({ schema }, async () => 1)(entree, anonyme)).toMatchObject({
      ok: false,
      code: 'NON_AUTHENTIFIE',
    });
    expect(
      await env({ schema, authentification: 'facultative' }, async () => 1)(entree, anonyme),
    ).toEqual({ ok: true, data: 1 });
  });

  it('exige App Check par défaut, sauf si désactivé explicitement', async () => {
    const env = creerEnveloppe({});
    const sansAppCheck = ctx({ appCheckVerifie: false });
    expect(await env({ schema }, async () => 1)(entree, sansAppCheck)).toMatchObject({
      code: 'APP_CHECK_INVALIDE',
    });
    expect(
      await env({ schema, appCheck: false }, async () => 1)(entree, sansAppCheck),
    ).toMatchObject({
      ok: true,
    });
  });

  it('vérifie la permission', async () => {
    const verifierPermission = vi.fn(
      async (_c: ContexteBase, p: string) => p === 'membres.inviter',
    );
    const env = creerEnveloppe({ verifierPermission });
    expect(
      await env({ schema, permission: 'membres.inviter' }, async () => 1)(entree, ctx()),
    ).toMatchObject({
      ok: true,
    });
    expect(
      await env({ schema, permission: 'leads.prix' }, async () => 1)(entree, ctx()),
    ).toMatchObject({
      code: 'PERMISSION_REFUSEE',
    });
    expect(verifierPermission).toHaveBeenLastCalledWith(ctx(), 'leads.prix', entree);
  });

  it('applique la limite de débit par client', async () => {
    const limiterDebit = vi.fn(async () => false);
    const regle = { cle: 'invit', max: 20, fenetre: '1j' } as const;
    const r = await creerEnveloppe({ limiterDebit })({ schema, rateLimit: regle }, async () => 1)(
      entree,
      ctx({ identifiantClient: 'ip:abc' }),
    );
    expect(r).toMatchObject({ code: 'TROP_DE_REQUETES' });
    expect(limiterDebit).toHaveBeenCalledWith(regle, 'ip:abc');
  });

  it('journalise l’action auditée, en succès comme en échec', async () => {
    const auditer = vi.fn(async () => undefined);
    const env = creerEnveloppe({ auditer });
    await env({ schema, audit: true, nom: 'test.ok' }, async () => 1)(entree, ctx());
    await env({ schema, audit: true, nom: 'test.ko' }, async () => {
      throw new ErreurMetier('CONFLIT');
    })(entree, ctx());
    expect(auditer).toHaveBeenNthCalledWith(1, ctx(), { action: 'test.ok', ok: true });
    expect(auditer).toHaveBeenNthCalledWith(2, ctx(), {
      action: 'test.ko',
      ok: false,
      code: 'CONFLIT',
    });
  });

  it('rejoue le résultat d’une requête idempotente déjà traitée', async () => {
    const memoire = new Map<string, unknown>();
    const idempotence = {
      lire: vi.fn(async (cle: string) => memoire.get(cle) as never),
      ecrire: vi.fn(async (cle: string, r: unknown) => void memoire.set(cle, r)),
    };
    const handler = vi.fn(async () => 'fait');
    const schemaIdem = schema.extend({ cleIdempotence: z.string().min(8) });
    const exec = creerEnveloppe({ idempotence })(
      { schema: schemaIdem, idempotence: true, nom: 'x' },
      handler,
    );
    const e = { ...entree, cleIdempotence: 'cle-12345' };
    expect(await exec(e, ctx())).toEqual({ ok: true, data: 'fait' });
    expect(await exec(e, ctx())).toEqual({ ok: true, data: 'fait' });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(idempotence.lire).toHaveBeenCalledWith('x:u1:cle-12345');
  });

  it('n’enregistre pas les échecs dans l’idempotence (on peut réessayer)', async () => {
    const idempotence = {
      lire: vi.fn(async () => undefined),
      ecrire: vi.fn(async () => undefined),
    };
    const schemaIdem = schema.extend({ cleIdempotence: z.string() });
    const exec = creerEnveloppe({ idempotence })(
      { schema: schemaIdem, idempotence: true, nom: 'x' },
      async () => {
        throw new ErreurMetier('INDISPONIBLE');
      },
    );
    await exec({ ...entree, cleIdempotence: 'k' }, ctx());
    expect(idempotence.ecrire).not.toHaveBeenCalled();
  });

  it('exige une cleIdempotence quand l’idempotence est demandée', async () => {
    const idempotence = { lire: vi.fn(), ecrire: vi.fn() };
    const exec = creerEnveloppe({ idempotence })(
      { schema, idempotence: true, nom: 'x' },
      async () => 1,
    );
    expect(await exec(entree, ctx())).toMatchObject({
      code: 'ENTREE_INVALIDE',
      champs: { cleIdempotence: expect.any(Array) },
    });
  });

  it('transforme une ErreurMetier en échec lisible', async () => {
    const exec = creerEnveloppe({})({ schema }, async () => {
      throw new ErreurMetier('PRECONDITION', 'Offre déjà active.');
    });
    expect(await exec(entree, ctx())).toEqual({
      ok: false,
      code: 'PRECONDITION',
      message: 'Offre déjà active.',
    });
  });

  it('masque les erreurs inattendues et les signale', async () => {
    const signalerErreur = vi.fn();
    const bug = new TypeError('secret interne');
    const exec = creerEnveloppe({ signalerErreur })({ schema }, async () => {
      throw bug;
    });
    expect(await exec(entree, ctx())).toEqual({
      ok: false,
      code: 'INTERNE',
      message: messageErreur('INTERNE'),
    });
    expect(signalerErreur).toHaveBeenCalledWith(bug);
  });

  it('refuse à la construction une option dont la dépendance manque', () => {
    const env = creerEnveloppe({});
    const h = async () => 1;
    expect(() => env({ schema, permission: 'x' }, h)).toThrow(/verifierPermission/);
    expect(() => env({ schema, rateLimit: { cle: 'a', max: 1, fenetre: '1h' } }, h)).toThrow(
      /limiterDebit/,
    );
    expect(() => env({ schema, audit: true, nom: 'a' }, h)).toThrow(/auditer/);
    expect(() => env({ schema, idempotence: true, nom: 'a' }, h)).toThrow(/idempotence/);
  });

  it('exige un nom pour l’audit et l’idempotence', () => {
    const deps: Dependances = {
      auditer: async () => undefined,
      idempotence: { lire: async () => undefined, ecrire: async () => undefined },
    };
    const env = creerEnveloppe(deps);
    expect(() => env({ schema, audit: true }, async () => 1)).toThrow(/nom/);
    expect(() => env({ schema, idempotence: true }, async () => 1)).toThrow(/nom/);
  });
});
