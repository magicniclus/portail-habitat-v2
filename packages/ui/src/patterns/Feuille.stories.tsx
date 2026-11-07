import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '../primitives/Button';
import { Checkbox } from '../primitives/Checkbox';
import { ConfirmDialog } from './ConfirmDialog';
import { FermerFeuille, Modal, Sheet } from './Feuille';

const meta = {
  title: 'Patterns/Modal et Sheet',
  component: Modal,
  args: { titre: 'Filtres' },
} satisfies Meta<typeof Modal>;
export default meta;
type Story = StoryObj<typeof meta>;

export const ModaleAdaptative: Story = {
  render: () => (
    <Modal
      titre="Filtrer les artisans"
      description="Feuille du bas sous 640 px, fenêtre centrée au-dessus."
      declencheur={<Button variant="secondaire">Ouvrir les filtres</Button>}
      actions={
        <>
          <FermerFeuille asChild>
            <Button variant="secondaire">Annuler</Button>
          </FermerFeuille>
          <Button>Voir 12 résultats</Button>
        </>
      }
    >
      <Checkbox>Disponible sous 7 jours</Checkbox>
      <Checkbox>Label RGE</Checkbox>
    </Modal>
  ),
};

export const FeuilleDuBas: Story = {
  render: () => (
    <Sheet
      titre="Changer d’entreprise"
      declencheur={<Button variant="secondaire">Dupont Rénovation</Button>}
    >
      <p className="m-0">Liste des entreprises…</p>
    </Sheet>
  ),
};

export const ConfirmationAvecMotif: Story = {
  render: () => (
    <ConfirmDialog
      titre="Suspendre cet artisan ?"
      declencheur={<Button variant="danger">Suspendre</Button>}
      libelleConfirmer="Suspendre"
      danger
      motifObligatoire
      onConfirmer={() => undefined}
    >
      Il ne recevra plus de demandes jusqu’à sa réactivation.
    </ConfirmDialog>
  ),
};
