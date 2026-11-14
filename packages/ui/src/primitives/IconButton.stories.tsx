import { ListIcon, XIcon } from '@phosphor-icons/react/ssr';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { IconButton } from './IconButton';

const meta = {
  title: 'Primitives/IconButton',
  component: IconButton,
  args: { 'aria-label': 'Ouvrir le menu', icone: <ListIcon /> },
} satisfies Meta<typeof IconButton>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Fantome: Story = {};
export const Secondaire: Story = {
  args: { variant: 'secondaire', 'aria-label': 'Fermer', icone: <XIcon /> },
};
