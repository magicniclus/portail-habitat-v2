import { describe, expect, it } from 'vitest';
import { modeInstallation } from './installation';

const IPHONE_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const IPHONE_CHROME =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/129.0 Mobile/15E148 Safari/604.1';
const base = { visites: 2, autonome: false, refusee: false, invitePossible: false, userAgent: '' };

describe('modeInstallation (MOBILE §9)', () => {
  it('pas avant la 2e visite, ni une fois installée ou refusée', () => {
    expect(modeInstallation({ ...base, visites: 1, invitePossible: true })).toBeNull();
    expect(modeInstallation({ ...base, autonome: true, invitePossible: true })).toBeNull();
    expect(modeInstallation({ ...base, refusee: true, invitePossible: true })).toBeNull();
  });
  it('bouton quand le navigateur le propose (Android, Chrome, Edge)', () => {
    expect(modeInstallation({ ...base, invitePossible: true })).toBe('bouton');
  });
  it('guide « Partager → Sur l’écran d’accueil » sur Safari iOS seulement', () => {
    expect(modeInstallation({ ...base, userAgent: IPHONE_SAFARI })).toBe('guide-ios');
    expect(modeInstallation({ ...base, userAgent: IPHONE_CHROME })).toBeNull();
  });
});
