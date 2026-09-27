// Configuration ESLint unique du dépôt (ARCHITECTURE §3 et §12).
import js from '@eslint/js';
import nextVitals from 'eslint-config-next/core-web-vitals';
import boundaries from 'eslint-plugin-boundaries';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const TESTS = ['**/*.test.ts', '**/*.test.tsx', '**/tests/**', '**/e2e/**', '**/vitest/**'];

/** Règles maison : aucune couleur hexadécimale hors des tokens, aucune collection nommée hors de @ph/firebase. */
const HEX = '/#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\\b/';
const interditHex = [
  {
    selector: `Literal[value=${HEX}]`,
    message: 'Couleur en dur interdite : utilisez les tokens de @ph/ui.',
  },
  {
    selector: `TemplateElement[value.raw=${HEX}]`,
    message: 'Couleur en dur interdite : utilisez les tokens de @ph/ui.',
  },
];
const interditCollection = [
  {
    selector: 'CallExpression[callee.name=/^(collection|collectionGroup)$/]',
    message:
      'Nom de collection interdit ici : passez par les chemins et repositories de @ph/firebase.',
  },
  {
    selector: 'CallExpression[callee.property.name=/^(collection|collectionGroup)$/]',
    message:
      'Nom de collection interdit ici : passez par les chemins et repositories de @ph/firebase.',
  },
];

/** Dépendances externes interdites par paquet (le reste est vérifié par boundaries). */
const interdits = {
  react: ['react', 'react-dom', 'react/*'],
  next: ['next', 'next/*'],
  firebase: [
    'firebase',
    'firebase/*',
    'firebase-admin',
    'firebase-admin/*',
    'firebase-functions',
    'firebase-functions/*',
    '@firebase/*',
  ],
};
const zodDirect = {
  name: 'zod',
  message: 'Importez z depuis @ph/core/zod (messages en français).',
};
const restreindre = (groupes, message) => [
  'error',
  { paths: [zodDirect], patterns: [{ group: groupes.flat(), message }] },
];

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/lib/**',
      '**/coverage/**',
      '**/next-env.d.ts',
      '**/playwright-report/**',
      '**/test-results/**',
      'docs/**',
      '.claude/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.node } },
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },

  // Site Next.js
  ...nextVitals.map((c) => ({ ...c, files: ['apps/web/**/*.{ts,tsx,mjs}'] })),
  { files: ['apps/web/**'], settings: { next: { rootDir: 'apps/web' } } },

  // Règles maison, partout sauf là où elles sont la source
  {
    files: ['**/*.{ts,tsx,mjs,js}'],
    ignores: ['packages/ui/src/tokens/**', 'packages/firebase/**', ...TESTS],
    rules: { 'no-restricted-syntax': ['error', ...interditHex, ...interditCollection] },
  },
  {
    files: ['packages/firebase/**/*.{ts,tsx}'],
    ignores: TESTS,
    rules: { 'no-restricted-syntax': ['error', ...interditHex] },
  },

  // Zod est configuré en français dans @ph/core/zod : on ne l'importe jamais directement.
  {
    files: ['**/*.{ts,tsx}'],
    ignores: ['packages/core/src/zod.ts'],
    rules: {
      'no-restricted-imports': ['error', { paths: [zodDirect] }],
    },
  },

  // Dépendances externes par paquet (ARCHITECTURE §3)
  {
    files: ['packages/core/**/*.ts'],
    ignores: [...TESTS, 'packages/core/src/zod.ts'],
    rules: {
      'no-restricted-imports': restreindre(
        [interdits.react, interdits.next, interdits.firebase, ['node:*']],
        '@ph/core est pur : seul zod est autorisé.',
      ),
    },
  },
  {
    files: ['packages/ui/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': restreindre(
        [interdits.next, interdits.firebase],
        '@ph/ui ignore Firebase et Next (next/link via asChild).',
      ),
    },
  },
  {
    files: ['packages/firebase/**/*.ts', 'packages/emails/**/*.{ts,tsx}'],
    ignores: TESTS,
    rules: {
      'no-restricted-imports': restreindre([interdits.next], 'Next est réservé à apps/web.'),
    },
  },

  // Dépendances entre paquets du dépôt (eslint-plugin-boundaries)
  {
    files: ['apps/**/*.{ts,tsx}', 'packages/**/*.{ts,tsx}'],
    plugins: { boundaries },
    settings: {
      'import/resolver': {
        typescript: {
          project: ['apps/*/tsconfig.json', 'packages/*/tsconfig.json'],
          noWarnOnMultipleProjects: true,
        },
      },
      'boundaries/elements': [
        { type: 'core', pattern: 'packages/core' },
        { type: 'ui', pattern: 'packages/ui' },
        { type: 'firebase', pattern: 'packages/firebase' },
        { type: 'emails', pattern: 'packages/emails' },
        { type: 'config', pattern: 'packages/config' },
        { type: 'web', pattern: 'apps/web' },
        { type: 'functions', pattern: 'apps/functions' },
      ],
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          policies: [
            { from: { element: { type: 'core' } }, allow: { to: { element: { type: 'core' } } } },
            {
              from: { element: { type: 'ui' } },
              allow: { to: { element: { types: { anyOf: ['ui', 'core'] } } } },
            },
            {
              from: { element: { type: 'firebase' } },
              allow: { to: { element: { types: { anyOf: ['firebase', 'core'] } } } },
            },
            {
              from: { element: { type: 'emails' } },
              allow: { to: { element: { types: { anyOf: ['emails', 'ui', 'core'] } } } },
            },
            {
              from: { element: { type: 'web' } },
              allow: {
                to: { element: { types: { anyOf: ['web', 'core', 'ui', 'firebase', 'emails'] } } },
              },
            },
            {
              from: { element: { type: 'functions' } },
              allow: {
                to: { element: { types: { anyOf: ['functions', 'core', 'firebase', 'emails'] } } },
              },
            },
            // La configuration partagée (garde-fou des tests) est accessible à tous.
            { allow: { to: { element: { type: 'config' } } } },
          ],
        },
      ],
    },
  },
);
