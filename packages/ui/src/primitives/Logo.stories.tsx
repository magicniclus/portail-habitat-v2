import type { Meta, StoryObj } from '@storybook/react-vite';
import { Logo } from './Logo';

const meta = { title: 'Primitives/Logo', component: Logo } satisfies Meta<typeof Logo>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Espaces: Story = {
  render: () => (
    <div className="flex flex-wrap gap-6">
      <Logo variant="particulier" />
      <Logo variant="pro" />
      <Logo variant="diag" />
      <Logo variant="admin" />
    </div>
  ),
};

export const SurFondFonce: Story = {
  render: () => (
    <div className="flex flex-wrap gap-6 rounded-card bg-texte p-5">
      <Logo variant="particulier" inverse />
      <Logo variant="pro" inverse />
    </div>
  ),
};
