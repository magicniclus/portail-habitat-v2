import type { Meta, StoryObj } from '@storybook/react-vite';
import { RepriseParcours } from './RepriseParcours';

const meta = {
  title: 'Patterns/RepriseParcours',
  component: RepriseParcours,
  args: {
    titre: 'Reprendre votre estimation ?',
    resume: 'Salle de bain · 6 m² · douche à l’italienne',
    meta: 'Étape 3 sur 5 · commencée il y a 2 jours',
    action: 'Reprendre à l’étape 3',
    onReprendre: () => {},
    onRecommencer: () => {},
  },
} satisfies Meta<typeof RepriseParcours>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Simulateur: Story = {};
