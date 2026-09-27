import { describe, expect, it } from 'vitest';
import { verifierEmulateur } from './verifier-emulateur';

const ok = { FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080', GCLOUD_PROJECT: 'demo-portail-habitat' };

describe('verifierEmulateur', () => {
  it('accepte un émulateur local sur un projet demo-', () => {
    expect(() => verifierEmulateur(ok)).not.toThrow();
    expect(() => verifierEmulateur({ ...ok, FIRESTORE_EMULATOR_HOST: 'localhost:8080' })).not.toThrow();
  });
  it('refuse sans émulateur', () => {
    expect(() => verifierEmulateur({ GCLOUD_PROJECT: 'demo-x' })).toThrow(/hors émulateur/);
  });
  it('refuse un émulateur distant', () => {
    expect(() => verifierEmulateur({ ...ok, FIRESTORE_EMULATOR_HOST: '10.0.0.4:8080' })).toThrow(/local/);
  });
  it('refuse un vrai projet', () => {
    expect(() => verifierEmulateur({ ...ok, GCLOUD_PROJECT: 'portail-habitat-prod' })).toThrow(/demo-/);
    expect(() => verifierEmulateur({ FIRESTORE_EMULATOR_HOST: ok.FIRESTORE_EMULATOR_HOST })).toThrow(/aucun/);
  });
});
