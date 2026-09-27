import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '../primitives/Button';
import { ToastProvider, useToast } from './Toast';

function Demo() {
  const afficher = useToast();
  return (
    <div className="flex flex-wrap gap-2">
      <Button onClick={() => afficher({ titre: 'Fiche enregistrée', tone: 'succes' })}>
        Succès
      </Button>
      <Button
        variant="secondaire"
        onClick={() =>
          afficher({
            titre: 'Paiement refusé',
            description: 'Vérifiez votre carte.',
            tone: 'danger',
          })
        }
      >
        Erreur
      </Button>
    </div>
  );
}

const meta = {
  title: 'Patterns/Toast',
  component: ToastProvider,
  args: { children: null },
} satisfies Meta<typeof ToastProvider>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Notifications: Story = {
  render: () => (
    <ToastProvider>
      <Demo />
    </ToastProvider>
  ),
};
