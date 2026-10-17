import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '../primitives/Button';
import { classesChip } from '../primitives/Chip';
import { Logo } from '../primitives/Logo';
import { PageErreur } from './PageErreur';

const meta = {
  title: 'Patterns/PageErreur',
  component: PageErreur,
  parameters: { layout: 'fullscreen' },
  args: {
    surtitre: 'Erreur 404',
    titre: 'Cette page a été',
    motCle: 'déplacée.',
    texte:
      'Le lien est peut-être ancien, ou la page n’existe plus. Retrouvez un artisan ou reprenez votre projet depuis l’accueil.',
    visuel: '404',
    entete: <Logo />,
    pied: <span>© 2026 Portail Habitat</span>,
    actions: (
      <>
        <Button taille="lg">Retour à l’accueil</Button>
        <Button taille="lg" variant="secondaire">
          Simuler mon devis
        </Button>
      </>
    ),
    liens: ['Trouver un artisan', 'Simulateur de devis', 'Aide'].map((l) => (
      <a key={l} href="#lien" className={classesChip}>
        {l}
      </a>
    )),
  },
} satisfies Meta<typeof PageErreur>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Introuvable: Story = {};
