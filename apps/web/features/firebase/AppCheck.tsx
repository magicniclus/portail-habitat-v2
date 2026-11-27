'use client';

import { useEffect } from 'react';
import { COOKIE_APP_CHECK } from '@/lib/appCheckCookie';

const GESTES = ['pointerdown', 'keydown', 'focusin', 'touchstart'] as const;

/**
 * App Check (reCAPTCHA Enterprise, INTEGRATIONS §4) : chargé au premier geste du visiteur, jamais
 * à l'affichage (budget D46). Le jeton, renouvelé automatiquement, part en en-tête avec les appels
 * du SDK Firebase et dans un cookie court lu par les Server Actions. Sans clé de site : rien.
 */
export function AppCheck() {
  useEffect(() => {
    const cle = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
    if (!cle) return;
    let fait = false;
    const demarrer = () => {
      if (fait) return;
      fait = true;
      for (const g of GESTES) removeEventListener(g, demarrer, true);
      void Promise.all([import('firebase/app'), import('firebase/app-check')]).then(
        ([{ getApps, initializeApp }, m]) => {
          const app =
            getApps()[0] ??
            initializeApp({
              apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
              authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
              projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
              appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
            });
          const ac = m.initializeAppCheck(app, {
            provider: new m.ReCaptchaEnterpriseProvider(cle),
            isTokenAutoRefreshEnabled: true,
          });
          m.onTokenChanged(ac, ({ token }) => {
            document.cookie = `${COOKIE_APP_CHECK}=${token}; Path=/; Max-Age=3300; SameSite=Strict; Secure`;
          });
        },
      );
    };
    for (const g of GESTES) addEventListener(g, demarrer, { capture: true, passive: true });
    return () => {
      for (const g of GESTES) removeEventListener(g, demarrer, true);
    };
  }, []);
  return null;
}
