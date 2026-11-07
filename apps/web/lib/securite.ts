/**
 * En-têtes de sécurité (INTEGRATIONS §5), posés par `proxy.ts` à chaque réponse.
 *
 * Deux niveaux de CSP :
 * - pages publiques (statiques ou ISR) : sans nonce, car un nonce rendrait chaque page dynamique
 *   et supprimerait le cache (budget EXPLOITATION §1) ; les sources restent limitées au site et à
 *   Firebase, reCAPTCHA et Sentry ;
 * - espaces connectés (pro, admin, Mon espace), déjà rendus à chaque requête : nonce et
 *   `strict-dynamic`, aucun script en ligne sans nonce sauf le bandeau cookies (empreinte).
 */
export interface OptionsCsp {
  production: boolean;
  nonce?: string;
  /** Empreintes (`sha256-…`) des scripts en ligne fixes (bandeau cookies). */
  empreintes?: string[];
  /** Émulateurs Firebase (`hôte:port`), ignorés en production. */
  emulateurs?: string[];
}

const GOOGLE = ['https://www.google.com', 'https://www.gstatic.com', 'https://apis.google.com'];
const CONNEXIONS = [
  'https://*.googleapis.com',
  'https://*.firebaseio.com',
  'wss://*.firebaseio.com',
  'https://*.firebaseapp.com',
  'https://*.sentry.io',
  'https://www.google.com',
];

export function politiqueContenu(o: OptionsCsp): string {
  const emulateurs = o.production
    ? []
    : (o.emulateurs ?? []).flatMap((h) => [`http://${h}`, `ws://${h}`]);
  const scripts = o.nonce
    ? [
        "'self'",
        `'nonce-${o.nonce}'`,
        "'strict-dynamic'",
        ...(o.empreintes ?? []).map((e) => `'${e}'`),
        // Repli des navigateurs sans strict-dynamic (ignoré par les autres).
        'https:',
      ]
    : ["'self'", "'unsafe-inline'", ...GOOGLE];
  // Next.js injecte du code évalué en développement seulement.
  if (!o.production) scripts.push("'unsafe-eval'");
  const directives: [string, string[]][] = [
    ['default-src', ["'self'"]],
    ['script-src', scripts],
    ['style-src', ["'self'", "'unsafe-inline'"]],
    [
      'img-src',
      [
        "'self'",
        'data:',
        'blob:',
        'https://firebasestorage.googleapis.com',
        'https://storage.googleapis.com',
        // Test de connectivité du canal temps réel de Firestore (cleardot.gif).
        'https://www.google.com',
        // Fond de carte de l'étape 2 de l'inscription pro (tuiles OpenStreetMap, attribution affichée).
        'https://tile.openstreetmap.org',
        // Miniatures des vidéos YouTube dans l'éditeur de site.
        'https://i.ytimg.com',
        ...emulateurs.filter((e) => e.startsWith('http')),
      ],
    ],
    // Vidéo de présentation des fiches (Storage public).
    [
      'media-src',
      [
        "'self'",
        'https://firebasestorage.googleapis.com',
        'https://storage.googleapis.com',
        ...emulateurs.filter((e) => e.startsWith('http')),
      ],
    ],
    ['font-src', ["'self'"]],
    ['connect-src', ["'self'", ...CONNEXIONS, ...emulateurs]],
    // Vidéos de présentation des fiches (lecteur YouTube sans cookie).
    [
      'frame-src',
      [
        "'self'",
        'https://www.google.com',
        'https://*.firebaseapp.com',
        'https://www.youtube-nocookie.com',
      ],
    ],
    ['worker-src', ["'self'", 'blob:']],
    ['manifest-src', ["'self'"]],
    ['object-src', ["'none'"]],
    ['base-uri', ["'self'"]],
    ['form-action', ["'self'"]],
    // L'admin affiche les pages publiques dans un cadre (Comportement) : même origine seulement.
    ['frame-ancestors', ["'self'"]],
  ];
  return [
    ...directives.map(([n, v]) => `${n} ${v.join(' ')}`),
    ...(o.production ? ['upgrade-insecure-requests'] : []),
  ].join('; ');
}

/**
 * CSP des sites artisans (SITE_INTERNET §6) : aucun script hors les scripts fixes de la page
 * (empreintes), Turnstile, et la balise Google / le pixel Meta que l'artisan a configurés (chargés
 * après consentement) ; images de Storage ; vidéos YouTube sans cookie.
 */
export function politiqueSite(o: {
  production: boolean;
  empreinte: string;
  /** Script fixe du suivi publicitaire (balise Google, pixel Meta), chargé après consentement. */
  empreinteSuivi?: string;
}): string {
  const turnstile = 'https://challenges.cloudflare.com';
  // Balise Google (Analytics, Ads, Tag Manager) et pixel Meta : appelés seulement après « Tout
  // accepter », et seulement si l'artisan a saisi un identifiant (sinon aucun script n'existe).
  const google =
    'https://www.googletagmanager.com https://*.google-analytics.com https://*.analytics.google.com https://*.g.doubleclick.net https://www.google.com https://www.google.fr';
  const meta = 'https://connect.facebook.net https://www.facebook.com';
  return [
    "default-src 'self'",
    `script-src '${o.empreinte}'${o.empreinteSuivi ? ` '${o.empreinteSuivi}'` : ''} ${turnstile} https://www.googletagmanager.com https://connect.facebook.net`,
    "style-src 'self' 'unsafe-inline'",
    // Fond de l'élément Carte (tuiles OpenStreetMap, attribution affichée).
    `img-src 'self' data: https://firebasestorage.googleapis.com https://storage.googleapis.com https://tile.openstreetmap.org ${google} https://www.facebook.com`,
    "font-src 'self'",
    `connect-src 'self' ${turnstile} ${google} ${meta}`,
    `frame-src ${turnstile} https://www.youtube-nocookie.com https://www.googletagmanager.com`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self' https://portailtravaux.fr",
    ...(o.production ? ['upgrade-insecure-requests'] : []),
  ].join('; ');
}

export function enTetesSecurite(o: {
  production: boolean;
  csp: string;
  /** Site artisan : domaine de l'artisan, HSTS sans `includeSubDomains` ni `preload`. */
  site?: boolean;
}): Record<string, string> {
  return {
    'Content-Security-Policy': o.csp,
    ...(o.site ? {} : { 'X-Frame-Options': 'SAMEORIGIN' }),
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
    'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    ...(o.production
      ? {
          'Strict-Transport-Security': o.site
            ? 'max-age=31536000'
            : 'max-age=63072000; includeSubDomains; preload',
        }
      : {}),
  };
}

/** Pages pro générées à l'avance (statiques) : jamais de nonce, il ne pourrait pas y être inséré. */
const PRO_STATIQUES = [
  '/pro/connexion',
  '/pro/hors-ligne',
  '/pro/icone',
  '/pro/manifest',
  '/pro/sw',
  // Landings par outil (LANDINGS §1), en ISR comme /pro.
  '/pro/trouver-des-chantiers',
  '/pro/site-internet-artisan',
  '/pro/logiciel-devis-factures',
];

export function espaceStrict(chemin: string): boolean {
  if (chemin.startsWith('/admin') || chemin.startsWith('/mon-espace')) return true;
  if (!chemin.startsWith('/pro/')) return false;
  return !PRO_STATIQUES.some((p) => chemin.startsWith(p));
}
