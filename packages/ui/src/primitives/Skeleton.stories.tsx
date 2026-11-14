import type { Meta, StoryObj } from '@storybook/react-vite';
import { Skeleton } from './Skeleton';

const meta = { title: 'Primitives/Skeleton', component: Skeleton } satisfies Meta<typeof Skeleton>;
export default meta;
type Story = StoryObj<typeof meta>;

export const CarteEnChargement: Story = {
  render: () => (
    <div className="flex max-w-sm flex-col gap-2.5">
      <Skeleton className="h-40" />
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  ),
};
