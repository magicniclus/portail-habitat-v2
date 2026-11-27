import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge } from '../primitives/Badge';
import { Button } from '../primitives/Button';
import { Card, CardBody, CardFooter, CardHeader, CardTitle } from './Card';

const meta = { title: 'Patterns/Card', component: Card } satisfies Meta<typeof Card>;
export default meta;
type Story = StoryObj<typeof meta>;

const Contenu = ({ premium }: { premium?: boolean }) => (
  <>
    <CardHeader>
      <CardTitle>Dupont Rénovation</CardTitle>
      {premium && <Badge tone="premium">Premium</Badge>}
    </CardHeader>
    <CardBody>Plomberie, chauffage et salles de bain à Lormont et alentours.</CardBody>
    <CardFooter>
      <Button taille="sm">Demander un devis</Button>
      <Button taille="sm" variant="secondaire">
        Voir le profil
      </Button>
    </CardFooter>
  </>
);

export const Standard: Story = {
  render: () => (
    <Card interactive className="max-w-sm">
      <Contenu />
    </Card>
  ),
};

export const Premium: Story = {
  render: () => (
    <Card premium className="max-w-sm">
      <Contenu premium />
    </Card>
  ),
};
