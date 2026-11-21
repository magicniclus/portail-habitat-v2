import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Chip, ChipGroup } from './Chip';

const meta = { title: 'Primitives/Chip', component: Chip } satisfies Meta<typeof Chip>;
export default meta;
type Story = StoryObj<typeof meta>;

const PROJETS = ['Salle de bain', 'Peinture', 'Toiture', 'Isolation des combles', 'Cuisine'];

export const ProjetsPopulaires: Story = {
  render: () => {
    const [choix, setChoix] = useState<string[]>(['Peinture']);
    return (
      <ChipGroup libelle="Projets populaires">
        {PROJETS.map((p) => (
          <Chip
            key={p}
            selectionne={choix.includes(p)}
            onClick={() => setChoix((c) => (c.includes(p) ? c.filter((x) => x !== p) : [...c, p]))}
          >
            {p}
          </Chip>
        ))}
      </ChipGroup>
    );
  },
};
