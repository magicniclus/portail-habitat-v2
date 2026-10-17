import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { configureAxe, toHaveNoViolations } from 'jest-axe';
import { afterEach, expect } from 'vitest';

expect.extend(toHaveNoViolations);
afterEach(cleanup);

// jsdom ne calcule pas les couleurs : le contraste est vérifié dans le catalogue Playwright.
export const axe = configureAxe({ rules: { 'color-contrast': { enabled: false } } });

// Radix et les feuilles utilisent ces API absentes de jsdom.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
window.matchMedia ??= (query: string) =>
  ({
    matches: false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
  }) as unknown as MediaQueryList;
Element.prototype.scrollIntoView ??= function () {};
Element.prototype.hasPointerCapture ??= () => false;
