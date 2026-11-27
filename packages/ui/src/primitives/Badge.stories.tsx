import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge, StatusBadge } from './Badge';

const meta = { title: 'Primitives/Badge', component: Badge } satisfies Meta<typeof Badge>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Tons: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge>Neutre</Badge>
      <Badge tone="accent">Nouveau</Badge>
      <Badge tone="premium">Premium</Badge>
      <Badge tone="succes">Vérifié</Badge>
      <Badge tone="attention">À refaire</Badge>
      <Badge tone="danger">Expirée</Badge>
      <Badge tone="info">Estimation en ligne</Badge>
    </div>
  ),
};

export const Statuts: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <StatusBadge statut={{ libelle: 'Nouvelle', tone: 'info' }} />
      <StatusBadge statut={{ libelle: 'Attribuée', tone: 'succes' }} />
      <StatusBadge statut={{ libelle: 'En attente', tone: 'attention' }} />
      <StatusBadge statut={{ libelle: 'Annulée', tone: 'neutre' }} />
    </div>
  ),
};
