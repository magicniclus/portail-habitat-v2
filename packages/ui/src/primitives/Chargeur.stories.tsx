import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './Button';
import { Chargeur } from './Chargeur';

const meta = { title: 'Primitives/Chargeur', component: Chargeur } satisfies Meta<typeof Chargeur>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Tailles: Story = {
  render: () => (
    <div className="flex flex-wrap items-end gap-6">
      <Chargeur taille="xs" />
      <Chargeur taille="sm" />
      <Chargeur taille="md" />
      <Chargeur taille="lg" />
      <Chargeur taille="xl" />
      <Chargeur taille="md" forme="anneau" />
    </div>
  ),
};

export const AvecMessage: Story = { args: { taille: 'md', message: 'Recherche des domaines…' } };

export const SurFondFonce: Story = {
  render: () => (
    <div className="flex gap-6 rounded-card bg-neutre-900 p-6">
      <Chargeur taille="lg" ton="inverse" />
      <Chargeur taille="sm" ton="inverse" />
    </div>
  ),
};

export const DansUnBouton: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Button chargement>Enregistrement…</Button>
      <Button variant="secondaire" chargement>
        Envoi…
      </Button>
      <Button variant="fantome" chargement>
        Recherche…
      </Button>
    </div>
  ),
};
