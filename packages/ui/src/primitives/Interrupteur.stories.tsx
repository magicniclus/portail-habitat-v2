import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Interrupteur } from './Interrupteur';

const meta = { title: 'Primitives/Interrupteur', component: Interrupteur } satisfies Meta<
  typeof Interrupteur
>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Notifications: Story = {
  render: () => {
    const [email, setEmail] = useState(true);
    const [sms, setSms] = useState(false);
    return (
      <div className="flex items-center gap-2">
        <Interrupteur
          aria-label="Nouvelles demandes par email"
          checked={email}
          onCheckedChange={setEmail}
        />
        <Interrupteur
          aria-label="Nouvelles demandes par SMS"
          checked={sms}
          onCheckedChange={setSms}
        />
        <Interrupteur aria-label="Sécurité par email" checked disabled />
      </div>
    );
  },
};
