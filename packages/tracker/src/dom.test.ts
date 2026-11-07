// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { entreeResumeVisite } from '@ph/core/schemas';
import { initTracker, signalerConversion } from './index';

type Envoi = Record<string, unknown> & { sortie: { type: string } };
let envois: Envoi[];
let observes: Element[];
let rappel: IntersectionObserverCallback;
let consentement: boolean;

beforeEach(() => {
  envois = [];
  observes = [];
  consentement = true;
  sessionStorage.clear();
  localStorage.clear();
  vi.spyOn(Math, 'random').mockReturnValue(0.01);
  let horloge = 0;
  vi.spyOn(performance, 'now').mockImplementation(() => (horloge += 100));
  Object.defineProperty(navigator, 'sendBeacon', {
    configurable: true,
    value: (_url: string, corps: Blob) => {
      void corps.text().then((t) => envois.push(JSON.parse(t)));
      return true;
    },
  });
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(f: IntersectionObserverCallback) {
        rappel = f;
      }
      observe(el: Element) {
        observes.push(el);
      }
      disconnect() {}
    },
  );
  document.body.innerHTML = `
    <section data-ph-section="hero">
      <h1>Recevez des demandes</h1>
      <img src="x.png" alt="" />
      <a href="/pro#offres" data-ph="cta-hero">Voir les offres</a>
    </section>
    <section data-ph-section="inscription">
      <form><input name="email" value="jean@exemple.fr" /><input name="nom" data-ph-masque /></form>
      <div data-ph-masque><button id="secret">Secret</button></div>
    </section>`;
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  delete (navigator as { globalPrivacyControl?: boolean }).globalPrivacyControl;
});

const options = {
  page: 'acquisition-artisans',
  app: 'pro' as const,
  consentement: () => consentement,
};
const attendre = () => new Promise((r) => setTimeout(r, 0));
const cliquer = (el: Element) =>
  el.dispatchEvent(
    new MouseEvent('click', { bubbles: true, detail: 1, clientX: 100, clientY: 50 }),
  );

describe('initTracker', () => {
  it('ne collecte rien sans consentement, pas même un identifiant', async () => {
    consentement = false;
    const arreter = initTracker(options);
    cliquer(document.querySelector('img')!);
    arreter();
    await attendre();
    expect(envois).toEqual([]);
    expect(sessionStorage.length + localStorage.length).toBe(0);
    expect(observes).toEqual([]);
  });

  it('démarre quand le visiteur donne son accord, puis envoie à la sortie', async () => {
    consentement = false;
    const arreter = initTracker(options);
    consentement = true;
    window.dispatchEvent(new Event('ph:consentement'));
    expect(observes).toHaveLength(2);
    cliquer(document.querySelector('img')!);
    window.dispatchEvent(new Event('pagehide'));
    await attendre();
    expect(envois).toHaveLength(1);
    expect(envois[0]).toMatchObject({ page: 'acquisition-artisans', morts: ['hero>img:1'] });
    arreter();
  });

  it('s’arrête sans rien envoyer si le consentement est retiré', async () => {
    const arreter = initTracker(options);
    cliquer(document.querySelector('img')!);
    consentement = false;
    window.dispatchEvent(new Event('ph:consentement'));
    window.dispatchEvent(new Event('pagehide'));
    arreter();
    await attendre();
    expect(envois).toEqual([]);
    expect(sessionStorage.getItem('ph:s')).toBeNull();
  });

  it('respecte Global Privacy Control', async () => {
    Object.defineProperty(navigator, 'globalPrivacyControl', { configurable: true, value: true });
    initTracker(options)();
    await attendre();
    expect(envois).toEqual([]);
  });

  it('n’envoie jamais une valeur de champ ni un texte de la page', async () => {
    const arreter = initTracker(options);
    const email = document.querySelector('input[name=email]')!;
    email.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    email.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    cliquer(document.querySelector('h1')!);
    arreter();
    await attendre();
    const corps = JSON.stringify(envois);
    expect(corps).not.toContain('jean@exemple.fr');
    expect(corps).not.toContain('Recevez');
    expect(envois[0]).toMatchObject({ abandon: 'email', morts: ['hero>h1:1'] });
  });

  it('ignore les éléments masqués', async () => {
    const arreter = initTracker(options);
    cliquer(document.querySelector('#secret')!);
    const nom = document.querySelector('input[name=nom]')!;
    nom.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    nom.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    arreter();
    await attendre();
    expect(envois[0]).toMatchObject({ cellulesClics: {}, champs: {}, morts: [] });
  });

  it('suit les éléments data-ph, les sections et la conversion', async () => {
    const arreter = initTracker(options);
    const hero = document.querySelector('[data-ph-section=hero]')!;
    rappel(
      [{ target: hero, intersectionRatio: 1, intersectionRect: { height: 500 } } as never],
      {} as IntersectionObserver,
    );
    const cta = document.querySelector('[data-ph=cta-hero]')!;
    cta.addEventListener('click', (e) => e.preventDefault());
    cliquer(cta);
    signalerConversion('inscription');
    arreter();
    await attendre();
    expect(envois[0]).toMatchObject({
      elements: { 'cta-hero': { clics: 1 } },
      conversion: 'inscription',
      sortie: { section: 'hero', type: 'conversion' },
    });
    expect(Object.keys(envois[0]!.sections as object)).toEqual(['hero']);
    // Le résumé envoyé passe la validation de la route /api/t.
    expect(entreeResumeVisite.safeParse(envois[0]).error).toBeUndefined();
  });

  it('ne mesure pas une visite hors échantillon', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9);
    initTracker({ ...options, echantillon: 0.5 })();
    await attendre();
    expect(envois).toEqual([]);
  });
});
