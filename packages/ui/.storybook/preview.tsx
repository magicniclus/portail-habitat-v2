import type { Decorator, Preview } from '@storybook/react-vite';
import '../src/styles/index.css';
import { THEMES } from '../src/tokens';

const NOMS = {
  particulier: 'Particuliers (vert)',
  pro: 'Pro (orange)',
  diag: 'Diagnostic (bleu)',
  admin: 'Admin (ardoise)',
} as const;

/** Chaque story s'affiche dans un thème, ou dans les 4 à la suite (« tous », par défaut). */
const avecTheme: Decorator = (Story, contexte) => {
  const choix = contexte.globals.theme as string;
  const themes = choix === 'tous' ? THEMES : [choix];
  return (
    <div className="flex flex-col gap-6">
      {themes.map((theme) => (
        <section
          key={theme}
          data-theme={theme}
          aria-label={NOMS[theme as keyof typeof NOMS]}
          className="flex flex-col gap-2"
        >
          {themes.length > 1 && (
            <p className="m-0 text-xs font-bold tracking-[0.08em] text-neutre-700 uppercase">
              {NOMS[theme as keyof typeof NOMS]}
            </p>
          )}
          <Story />
        </section>
      ))}
    </div>
  );
};

const preview: Preview = {
  decorators: [avecTheme],
  globalTypes: {
    theme: {
      description: 'Thème de l’espace',
      toolbar: {
        title: 'Thème',
        icon: 'paintbrush',
        items: [
          { value: 'tous', title: 'Les 4 thèmes' },
          ...THEMES.map((t) => ({ value: t, title: NOMS[t] })),
        ],
        dynamicTitle: true,
      },
    },
  },
  // Axe se lance à la demande dans le panneau (le test catalogue lance le sien).
  initialGlobals: {
    theme: 'tous',
    viewport: { value: 'telephone390', isRotated: false },
    a11y: { manual: true },
  },
  parameters: {
    layout: 'padded',
    viewport: {
      options: {
        telephone320: {
          name: 'Téléphone 320 (iPhone SE)',
          styles: { width: '320px', height: '640px' },
        },
        telephone390: {
          name: 'Téléphone 390 (iPhone 13)',
          styles: { width: '390px', height: '844px' },
        },
        tablette768: { name: 'Tablette 768', styles: { width: '768px', height: '1024px' } },
        ordinateur1280: { name: 'Ordinateur 1280', styles: { width: '1280px', height: '800px' } },
      },
    },
    a11y: { test: 'error' },
  },
};

export default preview;
