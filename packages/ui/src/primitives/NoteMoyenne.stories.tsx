import type { Meta, StoryObj } from '@storybook/react-vite';
import { NoteMoyenne } from './NoteMoyenne';

const meta = {
  title: 'Primitives/NoteMoyenne',
  component: NoteMoyenne,
  args: { note: 4.8, nbAvis: 24 },
} satisfies Meta<typeof NoteMoyenne>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Complete: Story = {};
export const Courte: Story = { args: { court: true } };
export const SansAvis: Story = { args: { nbAvis: 0 } };
