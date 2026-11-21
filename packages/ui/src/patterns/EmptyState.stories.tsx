import { TrayIcon } from '@phosphor-icons/react/ssr';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '../primitives/Button';
import { EmptyState } from './EmptyState';

const meta = {
  title: 'Patterns/EmptyState',
  component: EmptyState,
  args: { titre: 'Aucune demande pour le moment' },
} satisfies Meta<typeof EmptyState>;
export default meta;
type Story = StoryObj<typeof meta>;

export const AvecAction: Story = {
  args: {
    icone: <TrayIcon weight="duotone" />,
    children: 'Complétez votre fiche pour apparaître dans les recherches de votre secteur.',
    action: <Button>Compléter ma fiche</Button>,
  },
};
