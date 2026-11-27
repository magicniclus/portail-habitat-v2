// Tournage des captures vidéo de la VSL (copie locale sur émulateurs, données fictives seulement).
// Chaque prise enregistre les images du navigateur avec leur horodatage (CDP `Page.startScreencast`) :
// ffmpeg les remet ensuite à cadence fixe (60 images/s). Curseur dessiné dans la page (agrandi).
import { COOKIE_CONSENTEMENT, ecrireConsentement } from '@ph/core/consentement';
import {
  chromium,
  type Browser,
  type BrowserContext,
  type CDPSession,
  type Locator,
  type Page,
} from '@playwright/test';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

export const BASE = process.env.VSL_URL ?? 'http://localhost:3200';
export const SORTIE = resolve(__dirname, '../../.vsl/captures');

export type Format = 'bureau' | 'mobile';

/**
 * Bureau : 1280 × 720 points à l'échelle 1,5 = images de 1920 × 1080. Mobile : 390 × 844 points à
 * l'échelle 3 = 1170 × 2532 (plus large que les 1080 px de la version verticale).
 * L'échelle est celle de la fenêtre (`--force-device-scale-factor`), pas une émulation : une
 * échelle émulée n'est rendue ni par le « screencast » ni par les captures, et la forcer capture
 * par capture (`clip.scale`) redimensionne la page (mise en page qui bascule, zones dupliquées).
 */
const FORMATS = {
  bureau: { largeur: 1280, hauteur: 720, echelle: 1.5 },
  mobile: { largeur: 390, hauteur: 844, echelle: 3 },
} as const;

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Tournage au ralenti : tout est joué `tempo` fois plus lentement (gestes, attentes, animations de
 * la page), puis ffmpeg remet la prise à vitesse réelle. Une image pleine définition demande
 * environ 35 ms : ralenti 3 fois, le film garde de vraies 60 images par seconde.
 */
const TEMPO = 3;

/** Masque ce qui ne doit pas être filmé (indicateur Next.js, bandeaux, sélecteurs passés en argument). */
export async function masquer(page: Page, selecteurs: string[] = []) {
  const css = ['nextjs-portal', '[data-nextjs-toast]', '#__next-build-watcher', ...selecteurs]
    .map((s) => `${s}{display:none!important}`)
    .join('');
  await page.addStyleTag({
    content: `${css}html{scrollbar-width:none}::-webkit-scrollbar{display:none}`,
  });
}

export class Prise {
  private cdp!: CDPSession;
  private images: { fichier: string; t: number }[] = [];
  private x = 640;
  private y = 420;
  private dossier = '';
  private tourne = false;
  private boucle: Promise<void> = Promise.resolve();
  /** Une seule commande à la fois vers la page (capture ou défilement). */
  private file: Promise<unknown> = Promise.resolve();
  readonly tempo: number;
  constructor(
    readonly page: Page,
    readonly format: Format,
  ) {
    this.tempo = Number(process.env.VSL_TEMPO ?? TEMPO);
  }

  private seul<T>(f: () => Promise<T>): Promise<T> {
    const r = this.file.then(f, f);
    this.file = r.catch(() => undefined);
    return r;
  }

  /**
   * Démarre l'enregistrement dans `.vsl/captures/{nom}-{format}/` : captures d'écran en boucle à
   * la définition de la fenêtre, horodatées.
   */
  async action(nom: string) {
    this.dossier = join(SORTIE, `${nom}-${this.format}`);
    rmSync(this.dossier, { recursive: true, force: true });
    mkdirSync(this.dossier, { recursive: true });
    this.images = [];
    this.cdp = await this.page.context().newCDPSession(this.page);
    await this.cdp.send('Animation.enable');
    await this.cdp.send('Animation.setPlaybackRate', { playbackRate: 1 / this.tempo });
    this.tourne = true;
    this.boucle = (async () => {
      while (this.tourne) {
        const t = Date.now() / 1000;
        try {
          const { data } = await this.seul(() =>
            this.cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 93 }),
          );
          const fichier = `i-${String(this.images.length).padStart(5, '0')}.jpg`;
          writeFileSync(join(this.dossier, fichier), Buffer.from(data, 'base64'));
          this.images.push({ fichier, t });
        } catch {
          await pause(30); // page en cours de changement
        }
      }
    })();
    await this.attendre(200);
  }

  /** Arrête la prise : liste des images et durées (vitesse réelle) pour ffmpeg, `images.ffconcat`. */
  async coupez(): Promise<{ dossier: string; images: number; duree: number; cadence: number }> {
    await this.attendre(200);
    this.tourne = false;
    await this.boucle;
    await this.cdp.send('Animation.setPlaybackRate', { playbackRate: 1 }).catch(() => undefined);
    await this.cdp.detach().catch(() => undefined);
    const fin = Date.now() / 1000;
    const lignes = ['ffconcat version 1.0'];
    this.images.forEach((im, i) => {
      const suivante = this.images[i + 1]?.t ?? fin;
      lignes.push(
        `file '${im.fichier}'`,
        `duration ${Math.max((suivante - im.t) / this.tempo, 1 / 240).toFixed(5)}`,
      );
    });
    const derniere = this.images.at(-1);
    if (derniere) lignes.push(`file '${derniere.fichier}'`);
    writeFileSync(join(this.dossier, 'images.ffconcat'), lignes.join('\n'));
    const duree = this.images.length ? (fin - this.images[0]!.t) / this.tempo : 0;
    return {
      dossier: this.dossier,
      images: this.images.length,
      duree: Math.round(duree * 10) / 10,
      cadence: Math.round(this.images.length / Math.max(duree, 0.1)),
    };
  }

  /** Image fixe de contrôle (`.vsl/captures/{nom}-{format}.png`). */
  async photo(nom: string) {
    await this.page.screenshot({ path: join(SORTIE, `${nom}-${this.format}.png`) });
  }

  /** Attente en temps du film (allongée par le ralenti du tournage). */
  attendre = (ms: number) => pause(ms * this.tempo);

  /** Déplacement lent et fluide du curseur (accélération puis ralenti). */
  async vers(x: number, y: number, ms = 700) {
    const [x0, y0] = [this.x, this.y];
    // Position calculée sur l'horloge : la durée du geste ne dépend pas du temps de chaque capture.
    const total = ms * this.tempo;
    const debut = Date.now();
    for (let k = 0; k < 1;) {
      k = Math.min(1, (Date.now() - debut) / total);
      const e = k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2;
      await this.page.mouse.move(x0 + (x - x0) * e, y0 + (y - y0) * e);
      await pause(8);
    }
    this.x = x;
    this.y = y;
  }

  async survoler(cible: Locator, ms = 700) {
    // Hors champ : défilement doux jusqu'à l'élément (jamais de saut).
    const h = FORMATS[this.format].hauteur;
    const avant = await cible.boundingBox();
    if (avant && (avant.y < 70 || avant.y + avant.height > h - 70))
      await this.defiler(avant.y + avant.height / 2 - h * 0.55, 900);
    const b = await cible.boundingBox();
    if (!b) throw new Error('Élément introuvable à l’écran');
    await this.vers(b.x + Math.min(b.width / 2, 170), b.y + Math.min(b.height / 2, 28), ms);
  }

  /** Va sur l'élément, marque une pause de 0,5 s, clique. */
  async cliquer(cible: Locator, ms = 700) {
    await this.survoler(cible, ms);
    await this.attendre(500);
    await this.page.mouse.down();
    await this.attendre(70);
    await this.page.mouse.up();
  }

  /** Clique dans le champ puis tape le texte lettre par lettre. */
  async saisir(cible: Locator, texte: string, delai = 55) {
    await this.cliquer(cible, 550);
    await cible.pressSequentially(texte, { delay: delai * this.tempo });
  }

  /** Défilement doux de la page (ou d'un conteneur) sur `dy` points. */
  async defiler(dy: number, ms = 1600) {
    const total = ms * this.tempo;
    const debut = Date.now();
    let fait = 0;
    for (let k = 0; k < 1;) {
      k = Math.min(1, (Date.now() - debut) / total);
      const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
      const cible = Math.round(dy * e);
      const pasY = cible - fait;
      if (pasY) await this.seul(() => this.page.mouse.wheel(0, pasY));
      fait = cible;
      await pause(8);
    }
  }
}

/** Ouvre un navigateur au format voulu, bandeau cookies déjà réglé (refus des mesures détaillées). */
export async function plateau(format: Format): Promise<{
  navigateur: Browser;
  contexte: BrowserContext;
  page: Page;
  prise: Prise;
}> {
  const f = FORMATS[format];
  const navigateur = await chromium.launch({
    args: [`--force-device-scale-factor=${f.echelle}`, `--window-size=${f.largeur},${f.hauteur}`],
  });
  const contexte = await navigateur.newContext({
    baseURL: BASE,
    viewport: null,
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
  });
  await contexte.addCookies([
    {
      name: COOKIE_CONSENTEMENT,
      value: ecrireConsentement({ audienceDetaillee: false }, Date.now()),
      url: BASE,
    },
  ]);
  await contexte.addInitScript({ path: join(__dirname, 'curseur.js') });
  const page = await contexte.newPage();
  page.setDefaultTimeout(20_000);
  page.on('pageerror', (e) => console.error('[page]', e.message.slice(0, 160)));
  return { navigateur, contexte, page, prise: new Prise(page, format) };
}

/** Connexion du compte de démonstration du jeu de test. */
export async function connecter(page: Page, suite = '/pro/tableau-de-bord') {
  await page.goto(`/connexion?espace=pro&suite=${encodeURIComponent(suite)}`);
  await page.getByLabel(/^Email/).fill('proprio@test.local');
  await page
    .getByLabel(/^Mot de passe/)
    .fill(process.env.SEED_MOT_DE_PASSE ?? 'MotDePasse-e2e-2026');
  await page.getByRole('button', { name: 'Me connecter' }).click();
  await page.waitForURL(new RegExp(suite.replace(/[/?]/g, '\\$&')));
}
