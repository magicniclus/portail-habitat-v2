import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Badge } from '../primitives/Badge';
import { Combobox, type OptionCombobox } from './Combobox';

const meta = { title: 'Patterns/Combobox', component: Combobox } satisfies Meta<typeof Combobox>;
export default meta;
type Story = StoryObj<typeof meta>;

const INTENTIONS: OptionCombobox[] = [
  {
    id: 'sdb',
    libelle: 'Rénover une salle de bain',
    complement: <Badge tone="info">Estimation en ligne</Badge>,
  },
  { id: 'peinture', libelle: 'Peindre un appartement', complement: 'Peintre' },
  { id: 'fuite', libelle: 'Réparer une fuite', complement: 'Plombier' },
];

export const RechercheDeProjet: Story = {
  args: {
    label: 'Quel est votre projet ?',
    valeur: '',
    onValeurChange: () => undefined,
    options: [],
    onSelection: () => undefined,
  },
  render: (args) => {
    const [valeur, setValeur] = useState('');
    const options = INTENTIONS.filter((o) =>
      o.libelle.toLowerCase().includes(valeur.toLowerCase()),
    );
    return (
      <div className="max-w-md pb-64">
        <Combobox
          {...args}
          valeur={valeur}
          onValeurChange={setValeur}
          options={options}
          onSelection={(o) => setValeur(o.libelle)}
          placeholder="Ex. salle de bain"
        />
      </div>
    );
  },
};
