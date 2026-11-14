import { COOKIE_CONSENTEMENT, ecrireConsentement } from '@ph/core/consentement';
import {
  ARTISAN_EXEMPLE,
  capturesAFilmer,
  FORMATS_STUDIO,
  type FormatStudio,
} from '@ph/core/studio';
import { friseActive, friseDuProjet, type ProjetStudio } from '@ph/firebase/studio';
import { chromium, type Browser } from '@playwright/test';
import { join } from 'node:path';
import { BASE_DEMO, DEPOT, envDemo, environnementDemo } from './demo/environnement';
import { CURSEUR } from './demo/gestes';
import { SCENES } from './demo/scenes';
import { dansDossier, executer } from './outils';
import { deposer } from './stockage';

/** Fenêtre filmée : téléphone pour le vertical (rendu net ×2), écran large sinon. */
const FENETRES: Record<
  FormatStudio,
  { width: number; height: number; echelle: number; mobile: boolean }
> = {
  vertical: { width: 540, height: 960, echelle: 2, mobile: true },
  horizontal: { width: 1920, height: 1080, echelle: 1, mobile: false },
  carre: { width: 1080, height: 1080, echelle: 1, mobile: false },
};

async function sessionPro(navigateur: Browser, fichier: string) {
  const c = await navigateur.newContext({ baseURL: BASE_DEMO, locale: 'fr-FR' });
  const page = await c.newPage();
  await page.goto(`/connexion?espace=pro&suite=${encodeURIComponent('/pro/tableau-de-bord')}`);
  await page.getByLabel(/^Email/).fill('proprio@test.local');
  await page.getByLabel(/^Mot de passe/).fill(envDemo().SEED_MOT_DE_PASSE!);
  await page.getByRole('button', { name: 'Me connecter' }).click();
  await page.waitForURL(/\/pro\/tableau-de-bord/);
  await c.storageState({ path: fichier });
  await c.close();
}

/**
 * Captures pas encore filmées (clé `id:scene`) : celles du montage, ou avant le montage celles de
 * la préparation (STUDIO.md §4). Sur la copie isolée, avec l'artisan d'exemple ; chaque vidéo
 * commence quand la page est prête.
 */
export async function capturer(p: ProjetStudio): Promise<Record<string, string>> {
  const plan = capturesAFilmer({ ...p, frise: friseActive(p) ? friseDuProjet(p) : null });
  if (!plan.captures.length) throw new Error('aucune capture à filmer');
  const manquantes = plan.captures.filter((c) => !p.captures[`${c.id}:${c.scene}`]);
  if (!manquantes.length) return {};
  await environnementDemo();
  const sortie = await executer(
    'node',
    [join(DEPOT, 'apps/studio/dist/preparer.js'), JSON.stringify(plan.artisan ?? ARTISAN_EXEMPLE)],
    { env: envDemo() },
  );
  const { slug } = JSON.parse(sortie) as { slug: string };
  // Fiche de démonstration tout juste préparée : son cache est vidé avant de la filmer.
  await fetch(`${BASE_DEMO}/api/studio/demo-fiche?slug=${encodeURIComponent(slug)}`, {
    method: 'POST',
  }).catch(() => undefined);
  const fenetre = FENETRES[plan.format];
  const { largeur, hauteur } = FORMATS_STUDIO[plan.format];
  return dansDossier(async (d) => {
    const navigateur = await chromium.launch();
    const resultat: Record<string, string> = {};
    const echecs: string[] = [];
    try {
      const etat = join(d, 'pro.json');
      if (manquantes.some((c) => SCENES[c.scene].pro)) await sessionPro(navigateur, etat);
      for (const c of manquantes) {
        const scene = SCENES[c.scene];
        const ctx = await navigateur.newContext({
          baseURL: BASE_DEMO,
          locale: 'fr-FR',
          viewport: { width: fenetre.width, height: fenetre.height },
          deviceScaleFactor: fenetre.echelle,
          isMobile: fenetre.mobile,
          hasTouch: fenetre.mobile,
          ...(scene.pro ? { storageState: etat } : {}),
          // Playwright n'agrandit pas l'image (il la place en haut à gauche) : on enregistre à la
          // taille de la fenêtre, ffmpeg la met ensuite au format de la vidéo.
          recordVideo: { dir: d, size: { width: fenetre.width, height: fenetre.height } },
        });
        await ctx.addCookies([
          {
            name: COOKIE_CONSENTEMENT,
            value: ecrireConsentement({ audienceDetaillee: false }, Date.now()),
            url: BASE_DEMO,
          },
        ]);
        await ctx.addInitScript(CURSEUR);
        const page = await ctx.newPage();
        page.setDefaultTimeout(30_000);
        const t0 = Date.now();
        let debut = 0;
        try {
          await scene.jouer(page, {
            slug,
            artisan: plan.artisan,
            pret: () => (debut = Date.now() - t0),
          });
        } catch (e) {
          // Une scène ratée n'arrête pas les autres ; l'erreur est remontée à la fin.
          if (process.env.STUDIO_CAPTURE_ERREUR)
            await page
              .screenshot({
                path: join(process.env.STUDIO_CAPTURE_ERREUR, `${c.scene}.png`),
                fullPage: true,
              })
              .catch(() => undefined);
          echecs.push(
            `${c.scene} (${e instanceof Error ? (e.message.split('\n')[0] ?? '') : String(e)})`,
          );
          await ctx.close();
          continue;
        }
        const video = page.video()!;
        await ctx.close();
        const brut = join(d, `${c.id}.webm`);
        await video.saveAs(brut);
        const net = join(d, `${c.id}.mp4`);
        await executer('ffmpeg', [
          '-y',
          '-ss',
          (debut / 1000).toFixed(2),
          '-i',
          brut,
          '-an',
          '-vf',
          `scale=${largeur}:${hauteur}:flags=lanczos,setsar=1`,
          '-c:v',
          'libx264',
          '-preset',
          'veryfast',
          '-crf',
          '18',
          '-pix_fmt',
          'yuv420p',
          // Lecture immédiate dans l'aperçu de l'éditeur (index en tête du fichier).
          '-movflags',
          '+faststart',
          net,
        ]);
        resultat[`${c.id}:${c.scene}`] = await deposer(
          net,
          `studioRendus/${p.id}/captures/${c.id}-${c.scene}.mp4`,
          'video/mp4',
        );
      }
    } finally {
      await navigateur.close();
    }
    if (echecs.length)
      throw new Error(`captures impossibles : ${echecs.join(' ; ')}`.slice(0, 600));
    return resultat;
  });
}
