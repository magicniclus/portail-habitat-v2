import type { Meta, StoryObj } from '@storybook/react-vite';
import { Card, CardBody, CardHeader, CardTitle } from './Card';
import { ChargementPage, ZoneChargement } from './Chargement';

const meta = { title: 'Patterns/Chargement', component: ChargementPage } satisfies Meta<
  typeof ChargementPage
>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Page: Story = { args: { message: 'Chargement de vos demandes…' } };
export const PleinEcranTransparent: Story = {
  args: { pleinEcran: true, transparent: true, message: 'Ouverture du paiement…' },
};

const carte = (
  <Card>
    <CardHeader>
      <CardTitle>Votre propre domaine</CardTitle>
    </CardHeader>
    <CardBody>bertrand-renovation.fr · Disponible</CardBody>
  </Card>
);

export const ZoneLegere: Story = {
  render: () => (
    <ZoneChargement chargement message="Enregistrement…" className="max-w-md rounded-card">
      {carte}
    </ZoneChargement>
  ),
};

export const ZoneOpaque: Story = {
  render: () => (
    <ZoneChargement chargement voile="opaque" className="max-w-md rounded-card">
      {carte}
    </ZoneChargement>
  ),
};
