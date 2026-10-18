import { expect, test } from '@playwright/test';

// INTEGRATIONS §5 : en-têtes de sécurité sur les pages publiques, sans casser la page (ALL-03).
test('en-têtes de sécurité, et aucune violation de la CSP sur l’accueil', async ({ page }) => {
  const violations: string[] = [];
  page.on('console', (m) => {
    if (/Content Security Policy|Refused to/i.test(m.text())) violations.push(m.text());
  });
  const r = await page.goto('/');
  const h = r!.headers();
  expect(h['content-security-policy']).toContain("object-src 'none'");
  expect(h['content-security-policy']).toContain("frame-ancestors 'self'");
  expect(h['x-frame-options']).toBe('SAMEORIGIN');
  expect(h['x-content-type-options']).toBe('nosniff');
  expect(h['referrer-policy']).toBe('strict-origin-when-cross-origin');
  await page.goto('/simulateur');
  expect(violations).toEqual([]);
});
