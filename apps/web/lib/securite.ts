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
        ...emulateurs.filter((e) => e.startsWith('http')),
      ],
    ],
    ['font-src', ["'self'"]],
    ['connect-src', ["'self'", ...CONNEXIONS, ...emulateurs]],
    ['frame-src', ["'self'", 'https://www.google.com', 'https://*.firebaseapp.com']],
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

export function enTetesSecurite(o: { production: boolean; csp: string }): Record<string, string> {
  return {
    'Content-Security-Policy': o.csp,
    'X-Frame-Options': 'SAMEORIGIN',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
    'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    ...(o.production
      ? { 'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload' }
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
];

export function espaceStrict(chemin: string): boolean {
  if (chemin.startsWith('/admin') || chemin.startsWith('/mon-espace')) return true;
  if (!chemin.startsWith('/pro/')) return false;
  return !PRO_STATIQUES.some((p) => chemin.startsWith(p));
}
