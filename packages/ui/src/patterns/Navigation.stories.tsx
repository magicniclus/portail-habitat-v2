import {
  ChatCircleIcon,
  DotsThreeIcon,
  GavelIcon,
  HouseIcon,
  TrayIcon,
} from '@phosphor-icons/react/ssr';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '../primitives/Button';
import { BottomNav, BottomNavItem } from './BottomNav';
import { StickyActionBar } from './StickyActionBar';

const meta = {
  title: 'Patterns/Navigation mobile',
  component: BottomNav,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof BottomNav>;
export default meta;
type Story = StoryObj<typeof meta>;

export const BarreOngletsPro: Story = {
  render: () => (
    <div className="relative h-40 overflow-hidden bg-neutre-100 [transform:translateZ(0)]">
      <BottomNav aria-label="Navigation de l’espace pro" className="lg:flex">
        <BottomNavItem icone={<HouseIcon weight="duotone" />} libelle="Accueil">
          <a href="#accueil" />
        </BottomNavItem>
        <BottomNavItem icone={<TrayIcon weight="duotone" />} libelle="Demandes" actif badge={3}>
          <a href="#demandes" />
        </BottomNavItem>
        <BottomNavItem icone={<GavelIcon weight="duotone" />} libelle="Appels d’offres">
          <a href="#appels" />
        </BottomNavItem>
        <BottomNavItem icone={<ChatCircleIcon weight="duotone" />} libelle="Messages">
          <a href="#messages" />
        </BottomNavItem>
        <BottomNavItem icone={<DotsThreeIcon weight="bold" />} libelle="Plus">
          <a href="#plus" />
        </BottomNavItem>
      </BottomNav>
    </div>
  ),
};

export const BarreActionParcours: Story = {
  render: () => (
    <div className="h-40 overflow-auto bg-neutre-100">
      <div className="h-56 px-page pt-4">Contenu de l’étape…</div>
      <StickyActionBar>
        <Button variant="secondaire">Retour</Button>
        <Button className="flex-1">Continuer</Button>
      </StickyActionBar>
    </div>
  ),
};
