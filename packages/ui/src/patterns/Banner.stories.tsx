import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '../primitives/Button';
import { Banner } from './Banner';

const meta = { title: 'Patterns/Banner', component: Banner } satisfies Meta<typeof Banner>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Tons: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <Banner tone="info" titre="Votre fiche est en ligne">
        Les particuliers de votre zone peuvent vous trouver.
      </Banner>
      <Banner tone="succes" titre="Paiement confirmé" />
      <Banner
        tone="attention"
        titre="Assurance décennale : expire dans 7 jours"
        action={
          <Button taille="sm" variant="secondaire">
            Mettre à jour
          </Button>
        }
      >
        Sans attestation valide, vous ne recevrez plus de demandes.
      </Banner>
      <Banner tone="danger" titre="Paiement refusé">
        Mettez à jour votre moyen de paiement.
      </Banner>
      <Banner tone="premium" titre="Premium : 4 demandes exclusives garanties ce mois-ci" />
    </div>
  ),
};
