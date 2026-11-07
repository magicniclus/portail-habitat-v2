import { formatEuros } from '@ph/core/format';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './Button';
import { Checkbox } from './Checkbox';
import { Field } from './Field';
import { Input, Select, Textarea } from './Input';
import { RadioCard, RadioCardGroup } from './RadioCard';

const meta = {
  title: 'Primitives/Formulaire',
  component: Field,
  args: { label: 'Email', children: null },
} satisfies Meta<typeof Field>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Coordonnees: Story = {
  render: () => (
    <form className="flex max-w-md flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
      <Field label="Prénom" requis>
        <Input champ="prenom" name="prenom" enterKeyHint="next" />
      </Field>
      <Field label="Email" requis aide="Pour recevoir votre estimation">
        <Input champ="email" name="email" enterKeyHint="next" />
      </Field>
      <Field label="Téléphone" erreur="Ce numéro ne semble pas valide.">
        <Input champ="tel" name="tel" defaultValue="06 12" />
      </Field>
      <Field label="Code postal" requis>
        <Input champ="codePostal" name="cp" />
      </Field>
      <Field label="Métier">
        <Select defaultValue="">
          <option value="" disabled>
            Choisir un métier
          </option>
          <optgroup label="Plomberie et chauffage">
            <option value="plombier">Plombier</option>
            <option value="chauffagiste">Chauffagiste</option>
          </optgroup>
          <optgroup label="Finitions">
            <option value="peintre">Peintre</option>
          </optgroup>
        </Select>
      </Field>
      <Field label="Précisions">
        <Textarea name="precisions" />
      </Field>
      <Checkbox name="consentement" required>
        J’accepte d’être contacté par les artisans sélectionnés
      </Checkbox>
      <Button type="submit" taille="lg" enterKeyHint="send">
        Recevoir mes devis
      </Button>
    </form>
  ),
};

export const ChoixEnCartes: Story = {
  render: () => (
    <RadioCardGroup legende="Facturation">
      <RadioCard
        name="facturation"
        value="annuel"
        titre="Annuel"
        description={`${formatEuros(7990, { suffixe: 'HT' })} / mois, payé en une fois`}
        defaultChecked
      />
      <RadioCard
        name="facturation"
        value="mensuel"
        titre="Mensuel"
        description={`${formatEuros(9990, { suffixe: 'HT' })} / mois, sans engagement`}
      />
    </RadioCardGroup>
  ),
};
