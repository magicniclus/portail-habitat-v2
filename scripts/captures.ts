// Captures d'écran réelles de l'espace pro pour les landings (LANDINGS.md, maquette « Landing Outil »).
// Usage : pnpm captures (dans `firebase emulators:exec`, après `pnpm seed` et `pnpm --filter @ph/web build`).
//   pnpm captures --liste   affiche les écrans demandés par la maquette, sans rien capturer
// Écrit apps/web/public/landing/captures/{ecran}-{desktop|mobile}.webp (qualité 82) et .avif.
// Refuse de tourner hors émulateur ou préproduction : seul le compte de démo du seed est photographié.
import { COOKIE_CONSENTEMENT, ecrireConsentement } from '@ph/core/consentement';
import { verifierCibleSeed } from '@ph/firebase/seed';
import { chromium } from '@playwright/test';
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import sharp from 'sharp';

const racine = resolve(__dirname, '..');
const maquette = join(racine, 'docs/designs/Landing Outil.dc.html');
const sortie = join(racine, 'apps/web/public/landing/captures');

/** Écran décrit dans la maquette (objets `vitrine.grand`, `vitrine.tel`, `benefices[*][4]`). */
interface Ecran {
  src: string;
  url?: string;
  vw?: number;
  vh?: number;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  clics?: string;
}

/**
 * Maquette → route réelle de l'application. `null` : l'écran n'existe pas encore dans l'app
 * (lots 10b, 10d, 11b) ; il est signalé et sauté, jamais dessiné à la main.
 */
const ROUTES: Record<string, string | null> = {
  'Ma Fiche': '/pro/fiche',
  'Appels d Offres': '/pro/appels-d-offres',
  'Mes Demandes': '/pro/demandes',
  'Espace Artisan Dashboard': '/pro/tableau-de-bord',
  'Editeur de Site': null,
  'Site Internet Artisan': null,
  'Devis et Factures': null,
};

/** Lit les écrans à capturer dans la maquette (dédoublonnés par source et clics). */
function lireEcrans(html: string): Ecran[] {
  const vus = new Map<string, Ecran>();
  for (const m of html.matchAll(/\{"src":"[^"]+"[^{}]*\}/g)) {
    const e = JSON.parse(m[0]) as Ecran;
    vus.set(`${e.src}|${e.clics ?? ''}|${e.w ?? 0}`, e);
  }
  return [...vus.values()];
}

const nomMaquette = (src: string) => src.replace(/\.dc\.html.*$/, '');
const slug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** Nom de fichier : maquette + paramètres + onglets cliqués (ex. `editeur-de-site-page-accueil-apercu`). */
function nomEcran(e: Ecran): string {
  const [base, requete = ''] = e.src.split('?');
  return slug([nomMaquette(base ?? ''), requete, e.clics ?? ''].filter(Boolean).join(' '));
}

async function attendre(url: string, delaiMs: number) {
  const fin = Date.now() + delaiMs;
  while (Date.now() < fin) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      // serveur pas encore prêt
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`Le site ne répond pas sur ${url}`);
}

async function main() {
  const ecrans = lireEcrans(readFileSync(maquette, 'utf8'));
  if (process.argv.includes('--liste')) {
    for (const e of ecrans) {
      const route = ROUTES[nomMaquette(e.src)];
      console.log(`${nomEcran(e).padEnd(48)} ${route ?? '(écran pas encore construit)'}`);
    }
    return;
  }

  const { motDePasse } = verifierCibleSeed(process.env);
  const port = 3300;
  const base = process.env.CAPTURES_URL ?? `http://localhost:${port}`;
  let serveur: ChildProcess | undefined;
  if (!process.env.CAPTURES_URL) {
    serveur = spawn('pnpm', ['--filter', '@ph/web', 'start', '--port', String(port)], {
      cwd: racine,
      env: { ...process.env, APP_CHECK_MODE: 'desactive' },
      stdio: 'ignore',
    });
  }
  const navigateur = await chromium.launch();
  try {
    await attendre(`${base}/api/health`, 60_000);
    mkdirSync(sortie, { recursive: true });
    const manquants: string[] = [];
    for (const appareil of ['desktop', 'mobile'] as const) {
      const contexte = await navigateur.newContext({
        baseURL: base,
        viewport:
          appareil === 'desktop' ? { width: 1280, height: 800 } : { width: 390, height: 844 },
        deviceScaleFactor: 1,
        isMobile: appareil === 'mobile',
        hasTouch: appareil === 'mobile',
        reducedMotion: 'reduce',
      });
      // Choix des cookies déjà fait (refus des mesures détaillées) : pas de bandeau sur les captures.
      await contexte.addCookies([
        {
          name: COOKIE_CONSENTEMENT,
          value: ecrireConsentement({ audienceDetaillee: false }, Date.now()),
          url: base,
        },
      ]);
      const page = await contexte.newPage();
      await page.goto('/connexion?espace=pro&suite=%2Fpro%2Ftableau-de-bord');
      await page.getByLabel(/^Email/).fill('proprio@test.local');
      await page.getByLabel(/^Mot de passe/).fill(motDePasse);
      await page.getByRole('button', { name: 'Me connecter' }).click();
      await page.waitForURL(/\/pro\/tableau-de-bord/);

      for (const e of ecrans) {
        const route = ROUTES[nomMaquette(e.src)];
        const nom = nomEcran(e);
        if (!route) {
          if (appareil === 'desktop') manquants.push(nom);
          continue;
        }
        await page.goto(route);
        await page.waitForLoadState('load');
        for (const libelle of (e.clics ?? '').split('|').filter(Boolean)) {
          const cible = page
            .getByRole('tab', { name: libelle })
            .or(page.getByRole('button', { name: libelle }))
            .or(page.getByRole('link', { name: libelle }))
            .first();
          await cible.click();
        }
        await page.waitForTimeout(800);
        // Zone x/y/w/h de la maquette : recadrage de la version ordinateur uniquement.
        const zone =
          appareil === 'desktop' && e.w && e.h
            ? { x: e.x ?? 0, y: e.y ?? 0, width: e.w, height: e.h }
            : undefined;
        const image = await page.screenshot({ type: 'png', ...(zone ? { clip: zone } : {}) });
        const fichier = join(sortie, `${nom}-${appareil}`);
        await sharp(image).webp({ quality: 82 }).toFile(`${fichier}.webp`);
        await sharp(image).avif({ quality: 60 }).toFile(`${fichier}.avif`);
        console.log(`✓ ${nom}-${appareil}`);
      }
      await contexte.close();
    }
    if (manquants.length)
      console.log(`Écrans pas encore construits, non capturés : ${manquants.join(', ')}`);
  } finally {
    await navigateur.close();
    serveur?.kill();
  }
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
