import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { axe } from '../test/setup';
import { Badge, StatusBadge } from './Badge';
import { Button } from './Button';
import { ATTRIBUTS_CHAMP } from './champs';
import { Checkbox } from './Checkbox';
import { Chip, ChipGroup } from './Chip';
import { Field } from './Field';
import { IconButton } from './IconButton';
import { Interrupteur } from './Interrupteur';
import { Input, Select, Textarea } from './Input';
import { Logo } from './Logo';
import { RadioCard, RadioCardGroup } from './RadioCard';
import { Skeleton } from './Skeleton';

describe('Logo', () => {
  it('affiche le nom et le suffixe de l’espace, sous le thème de sa variante', async () => {
    const { container } = render(<Logo variant="diag" />);
    expect(screen.getByText('DIAG')).toBeInTheDocument();
    expect(container.firstElementChild).toHaveAttribute('data-theme', 'diag');
    expect(container.querySelector('circle')).not.toBeNull();
    expect(await axe(container)).toHaveNoViolations();
  });
  it('garde le nom lisible quand seule l’icône est visible', () => {
    render(<Logo iconeSeule />);
    expect(screen.getByText('PORTAIL HABITAT')).toHaveClass('sr-only');
  });
});

describe('Button', () => {
  it('est un bouton de type button par défaut, de 44 px minimum', async () => {
    const { container } = render(<Button>Simuler mon devis</Button>);
    const b = screen.getByRole('button', { name: 'Simuler mon devis' });
    expect(b).toHaveAttribute('type', 'button');
    expect(b.className).toContain('min-h-11');
    expect(await axe(container)).toHaveNoViolations();
  });
  it('rend un lien avec asChild, sans attribut type', () => {
    render(
      <Button asChild variant="secondaire">
        <a href="/simulateur">Simuler</a>
      </Button>,
    );
    const lien = screen.getByRole('link', { name: 'Simuler' });
    expect(lien).not.toHaveAttribute('type');
    expect(lien.className).toContain('border-neutre-400');
  });
  it('fusionne les classes (la dernière gagne)', () => {
    render(<Button className="px-9">OK</Button>);
    expect(screen.getByRole('button').className).not.toMatch(/\bpx-5\b/);
  });
});

describe('IconButton', () => {
  it('porte un nom accessible et mesure 44 px', async () => {
    const { container } = render(<IconButton aria-label="Fermer" icone={<svg />} />);
    expect(screen.getByRole('button', { name: 'Fermer' }).className).toContain('size-11');
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('Interrupteur', () => {
  it('rôle switch, 44 px, bascule au clic ; désactivé = réglage imposé', async () => {
    const changer = vi.fn();
    const { container } = render(
      <>
        <Interrupteur aria-label="Avis par email" onCheckedChange={changer} />
        <Interrupteur aria-label="Sécurité par email" checked disabled />
      </>,
    );
    const inter = screen.getByRole('switch', { name: 'Avis par email' });
    expect(inter.className).toContain('size-11');
    await userEvent.click(inter);
    expect(changer).toHaveBeenCalledWith(true);
    expect(screen.getByRole('switch', { name: 'Sécurité par email' })).toBeDisabled();
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('Chip', () => {
  it('expose son état sélectionné et se groupe', async () => {
    const clic = vi.fn();
    const { container } = render(
      <ChipGroup libelle="Projets populaires">
        <Chip selectionne onClick={clic}>
          Salle de bain
        </Chip>
        <Chip>Peinture</Chip>
      </ChipGroup>,
    );
    expect(screen.getByRole('group', { name: 'Projets populaires' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salle de bain' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Peinture' })).not.toHaveAttribute('aria-pressed');
    await userEvent.click(screen.getByRole('button', { name: 'Salle de bain' }));
    expect(clic).toHaveBeenCalled();
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('Badge et StatusBadge', () => {
  it('affiche le libellé du statut avec son ton', async () => {
    const { container } = render(
      <>
        <Badge tone="premium">Premium</Badge>
        <StatusBadge statut={{ libelle: 'Nouvelle', tone: 'info' }} />
      </>,
    );
    expect(screen.getByText('Premium').className).toContain('bg-premium-fond');
    expect(screen.getByText('Nouvelle').className).toContain('bg-info-fond');
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('Skeleton', () => {
  it('est ignoré par les lecteurs d’écran', () => {
    const { container } = render(<Skeleton className="h-4" />);
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('Field et contrôles', () => {
  it('relie libellé, aide et erreur au champ', async () => {
    const { container } = render(
      <Field
        label="Téléphone"
        aide="Pour que l’artisan vous rappelle"
        erreur="Numéro invalide"
        requis
      >
        <Input champ="tel" name="tel" />
      </Field>,
    );
    const champ = screen.getByRole('textbox', { name: /Téléphone/ });
    expect(champ).toHaveAttribute('type', 'tel');
    expect(champ).toHaveAttribute('inputmode', 'tel');
    expect(champ).toHaveAttribute('autocomplete', 'tel');
    expect(champ).toHaveAttribute('aria-invalid', 'true');
    expect(champ).toBeRequired();
    expect(champ).toHaveAccessibleDescription('Pour que l’artisan vous rappelle Numéro invalide');
    expect(champ.className).toContain('text-base');
    expect(await axe(container)).toHaveNoViolations();
  });
  it('fonctionne aussi hors d’un Field, et les props explicites l’emportent sur le préréglage', () => {
    render(<Input champ="email" aria-label="Email" autoComplete="username" />);
    const champ = screen.getByRole('textbox', { name: 'Email' });
    expect(champ).toHaveAttribute('autocomplete', 'username');
    expect(champ).not.toHaveAttribute('aria-invalid');
  });
  it('Select natif avec groupes, Textarea', async () => {
    const { container } = render(
      <>
        <Field label="Métier">
          <Select defaultValue="plombier">
            <optgroup label="Plomberie et chauffage">
              <option value="plombier">Plombier</option>
            </optgroup>
          </Select>
        </Field>
        <Field label="Précisions">
          <Textarea />
        </Field>
      </>,
    );
    expect(screen.getByRole('combobox', { name: 'Métier' })).toHaveValue('plombier');
    expect(screen.getByRole('textbox', { name: 'Précisions' })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
  it('préréglages MOBILE.md §5', () => {
    expect(ATTRIBUTS_CHAMP.codePostal).toMatchObject({
      inputMode: 'numeric',
      autoComplete: 'postal-code',
      maxLength: 5,
    });
    expect(ATTRIBUTS_CHAMP.codeSms.autoComplete).toBe('one-time-code');
    expect(ATTRIBUTS_CHAMP.email.autoCapitalize).toBe('off');
  });
});

describe('Checkbox et RadioCard', () => {
  it('case cochable par son libellé', async () => {
    const { container } = render(<Checkbox name="cgu">J’accepte les conditions</Checkbox>);
    await userEvent.click(screen.getByText('J’accepte les conditions'));
    expect(screen.getByRole('checkbox', { name: 'J’accepte les conditions' })).toBeChecked();
    expect(await axe(container)).toHaveNoViolations();
  });
  it('choix unique au clavier dans un groupe légendé', async () => {
    const { container } = render(
      <RadioCardGroup legende="Facturation">
        <RadioCard
          name="f"
          value="annuel"
          titre="Annuel"
          description="Payé en une fois"
          defaultChecked
        />
        <RadioCard name="f" value="mensuel" titre="Mensuel" />
      </RadioCardGroup>,
    );
    expect(screen.getByRole('group', { name: 'Facturation' })).toBeInTheDocument();
    await userEvent.click(screen.getByText('Mensuel'));
    expect(screen.getByRole('radio', { name: /Mensuel/ })).toBeChecked();
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('bouton()', () => {
  it('une seule classe de retour à la ligne (pas de conflit laissé à l’ordre du CSS)', async () => {
    const { bouton } = await import('./bouton');
    const plein = bouton({ taille: 'lg', pleineLargeur: true });
    expect(plein).toContain('whitespace-normal');
    expect(plein).not.toContain('whitespace-nowrap');
    expect(bouton()).toContain('whitespace-nowrap');
    expect(bouton({ ligne: 'multiple' })).not.toContain('whitespace-nowrap');
  });
});
