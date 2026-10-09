import { describe, expect, it } from 'vitest';
import { enTetesSecurite, espaceStrict, politiqueContenu } from './securite';

const directive = (csp: string, nom: string) =>
  csp
    .split(';')
    .map((d) => d.trim())
    .find((d) => d.startsWith(`${nom} `));

describe('en-têtes de sécurité (INTEGRATIONS §5)', () => {
  it('pages publiques : sans nonce (cache conservé), sources limitées, objets et base bloqués', () => {
    const csp = politiqueContenu({ production: true });
    expect(directive(csp, 'default-src')).toBe("default-src 'self'");
    expect(directive(csp, 'script-src')).toContain("'unsafe-inline'");
    expect(directive(csp, 'script-src')).not.toContain('nonce');
    expect(directive(csp, 'object-src')).toBe("object-src 'none'");
    expect(directive(csp, 'base-uri')).toBe("base-uri 'self'");
    expect(directive(csp, 'frame-ancestors')).toBe("frame-ancestors 'self'");
    expect(csp).toContain('upgrade-insecure-requests');
    expect(directive(csp, 'img-src')).toContain('https://www.google.com');
  });
  it('espaces connectés : nonce et strict-dynamic, script du bandeau autorisé par son empreinte', () => {
    const csp = politiqueContenu({ production: true, nonce: 'abc', empreintes: ['sha256-xyz'] });
    const s = directive(csp, 'script-src')!;
    expect(s).toContain("'nonce-abc'");
    expect(s).toContain("'strict-dynamic'");
    expect(s).toContain("'sha256-xyz'");
    expect(s).not.toContain("'unsafe-inline'");
  });
  it('émulateurs : leurs adresses sont autorisées, jamais en production', () => {
    const csp = politiqueContenu({ production: false, emulateurs: ['127.0.0.1:8080'] });
    expect(directive(csp, 'connect-src')).toContain('http://127.0.0.1:8080');
    expect(directive(csp, 'connect-src')).toContain('ws://127.0.0.1:8080');
    expect(csp).not.toContain('upgrade-insecure-requests');
    expect(politiqueContenu({ production: true, emulateurs: ['127.0.0.1:8080'] })).not.toContain(
      '127.0.0.1',
    );
  });
  it('HSTS en production, cadre limité au site, référent et permissions restreints', () => {
    const h = enTetesSecurite({ production: true, csp: 'x' });
    expect(h['Strict-Transport-Security']).toBe('max-age=63072000; includeSubDomains; preload');
    expect(h['X-Frame-Options']).toBe('SAMEORIGIN');
    expect(h['X-Content-Type-Options']).toBe('nosniff');
    expect(h['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(h['Permissions-Policy']).toContain('camera=()');
    expect(enTetesSecurite({ production: false, csp: 'x' })['Strict-Transport-Security']).toBe(
      undefined,
    );
  });
  it('espaces stricts : pro connecté, admin, Mon espace ; jamais les pages publiques', () => {
    expect(espaceStrict('/admin/ia')).toBe(true);
    expect(espaceStrict('/pro/demandes')).toBe(true);
    expect(espaceStrict('/mon-espace')).toBe(true);
    expect(espaceStrict('/pro')).toBe(false);
    expect(espaceStrict('/artisans/x')).toBe(false);
  });
});
