import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { signatureSvixValide, statutResend } from './svix';

const cle = Buffer.from('cle-secrete-de-test-pour-le-webhook');
const secret = `whsec_${cle.toString('base64')}`;
const corps = JSON.stringify({ type: 'email.delivered', data: { email_id: 're_1' } });
const signer = (id: string, t: string, c: string) =>
  `v1,${createHmac('sha256', cle).update(`${id}.${t}.${c}`).digest('base64')}`;

describe('signature Svix (webhook Resend)', () => {
  const t = '1790000000';
  it('valide, y compris parmi plusieurs signatures', () => {
    expect(
      signatureSvixValide(
        secret,
        { id: 'msg_1', horodatage: t, signature: signer('msg_1', t, corps) },
        corps,
        1790000000,
      ),
    ).toBe(true);
    expect(
      signatureSvixValide(
        secret,
        { id: 'msg_1', horodatage: t, signature: `v1,faux ${signer('msg_1', t, corps)}` },
        corps,
        1790000000,
      ),
    ).toBe(true);
  });
  it.each([
    [
      'corps modifié',
      { id: 'msg_1', horodatage: t, signature: signer('msg_1', t, corps) },
      `${corps} `,
      1790000000,
    ],
    [
      'trop ancien (rejeu)',
      { id: 'msg_1', horodatage: t, signature: signer('msg_1', t, corps) },
      corps,
      1790000301,
    ],
    ['en-tête manquant', { id: null, horodatage: t, signature: 'v1,x' }, corps, 1790000000],
    [
      'mauvaise version',
      { id: 'msg_1', horodatage: t, signature: signer('msg_1', t, corps).replace('v1', 'v2') },
      corps,
      1790000000,
    ],
    [
      'horodatage invalide',
      { id: 'msg_1', horodatage: 'abc', signature: 'v1,x' },
      corps,
      1790000000,
    ],
  ])('refusée : %s', (_, entetes, c, maintenant) => {
    expect(signatureSvixValide(secret, entetes as never, c as string, maintenant as number)).toBe(
      false,
    );
  });
  it('secret mal formé : refusé', () => {
    expect(
      signatureSvixValide(
        'abc',
        { id: 'msg_1', horodatage: t, signature: 'v1,x' },
        corps,
        1790000000,
      ),
    ).toBe(false);
  });
});

describe('événements Resend', () => {
  it.each([
    ['email.delivered', undefined, 'delivre'],
    ['email.opened', undefined, 'ouvert'],
    ['email.clicked', undefined, 'clic'],
    ['email.bounced', 'Permanent', 'rebond'],
    ['email.bounced', 'Transient', null],
    ['email.complained', undefined, 'plainte'],
    ['email.sent', undefined, null],
  ])('%s (%s) → %s', (type, rebond, statut) => expect(statutResend(type, rebond)).toBe(statut));
});
