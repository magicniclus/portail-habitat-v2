import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './Button';

const meta = {
  title: 'Primitives/Button',
  component: Button,
  args: { children: 'Simuler mon devis' },
} satisfies Meta<typeof Button>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Primaire: Story = {};
export const Variantes: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Button>Primaire</Button>
      <Button variant="secondaire">Secondaire</Button>
      <Button variant="fantome">Fantôme</Button>
      <Button variant="danger">Supprimer</Button>
      <Button disabled>Désactivé</Button>
    </div>
  ),
};
export const Tailles: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button taille="sm">Petit</Button>
      <Button>Moyen</Button>
      <Button taille="lg">Grand</Button>
    </div>
  ),
};
export const Lien: Story = {
  render: () => (
    <Button asChild variant="secondaire">
      <a href="#simulateur">Lien stylé en bouton</a>
    </Button>
  ),
};
export const PleineLargeur: Story = {
  args: { pleineLargeur: true, taille: 'lg', children: 'Recevoir mes devis' },
};
