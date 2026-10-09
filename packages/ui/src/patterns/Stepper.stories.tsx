import type { Meta, StoryObj } from '@storybook/react-vite';
import { Stepper } from './Stepper';

const meta = {
  title: 'Patterns/Stepper',
  component: Stepper,
  args: { etapes: ['Prestation', 'Projet', 'Options', 'Chantier', 'Estimation'], courante: 2 },
} satisfies Meta<typeof Stepper>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Simulateur: Story = {};
export const Debut: Story = { args: { courante: 0 } };
