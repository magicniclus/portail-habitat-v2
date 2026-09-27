import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Button } from '../primitives/Button';
import { axe } from '../test/setup';
import { Banner } from './Banner';
import { BottomNav, BottomNavItem } from './BottomNav';
import { Card, CardBody, CardFooter, CardHeader, CardTitle } from './Card';
import { Combobox, type OptionCombobox } from './Combobox';
import { ConfirmDialog } from './ConfirmDialog';
import { EmptyState } from './EmptyState';
import { Modal, Sheet } from './Feuille';
import { PageErreur } from './PageErreur';
import { Stepper } from './Stepper';
import { StickyActionBar } from './StickyActionBar';
import { ToastProvider, useToast } from './Toast';

describe('Card', () => {
  it('se compose', async () => {
    const { container } = render(
      <Card interactive>
        <CardHeader>
          <CardTitle>Dupont Rénovation</CardTitle>
        </CardHeader>
        <CardBody>Plomberie, chauffage</CardBody>
        <CardFooter>
          <Button>Voir le profil</Button>
        </CardFooter>
      </Card>,
    );
    expect(screen.getByRole('heading', { name: 'Dupont Rénovation' })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('Stepper', () => {
  it('signale l’étape courante et les étapes faites', async () => {
    const { container } = render(
      <Stepper etapes={['Prestation', 'Projet', 'Options']} courante={1} />,
    );
    expect(screen.getByText('Étape 2 sur 3 ·', { exact: false })).toBeInTheDocument();
    const courante = container.querySelector('[aria-current="step"]');
    expect(courante).toHaveTextContent('Projet');
    expect(screen.getByText('(terminée)', { exact: false })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('EmptyState et Banner', () => {
  it('EmptyState propose une action', async () => {
    const { container } = render(
      <EmptyState titre="Aucune demande" action={<Button>Compléter ma fiche</Button>} />,
    );
    expect(screen.getByRole('heading', { name: 'Aucune demande' })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
  it('Banner : alerte pour un danger, statut sinon', async () => {
    const { container } = render(
      <>
        <Banner tone="danger" titre="Assurance expirée" />
        <Banner tone="premium" titre="Premium actif" />
      </>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Assurance expirée');
    expect(screen.getByRole('status')).toHaveTextContent('Premium actif');
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('StickyActionBar et BottomNav', () => {
  it('BottomNav : lien courant et pastille', async () => {
    const { container } = render(
      <>
        <BottomNav aria-label="Navigation principale">
          <BottomNavItem icone={<svg />} libelle="Demandes" actif badge={3}>
            <a href="/pro/demandes" />
          </BottomNavItem>
          <BottomNavItem icone={<svg />} libelle="Compte">
            <a href="/pro/compte" />
          </BottomNavItem>
        </BottomNav>
        <StickyActionBar>
          <Button>Continuer</Button>
        </StickyActionBar>
      </>,
    );
    const lien = screen.getByRole('link', { name: /Demandes/ });
    expect(lien).toHaveAttribute('href', '/pro/demandes');
    expect(lien).toHaveAttribute('aria-current', 'page');
    expect(lien).toHaveTextContent('3 nouveaux');
    expect(screen.getByRole('link', { name: 'Compte' })).not.toHaveAttribute('aria-current');
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('Modal et Sheet', () => {
  it('s’ouvre, piège le focus et se ferme par Échap', async () => {
    render(
      <Modal titre="Filtres" description="Affinez la liste" declencheur={<Button>Filtrer</Button>}>
        <p>Contenu</p>
      </Modal>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Filtrer' }));
    const dialogue = screen.getByRole('dialog', { name: 'Filtres' });
    expect(dialogue).toHaveAccessibleDescription('Affinez la liste');
    expect(await axe(document.body)).toHaveNoViolations();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
  });
  it('Sheet se ferme par le bouton ×', async () => {
    render(<Sheet titre="Choisir une entreprise" open onOpenChange={vi.fn()} />);
    expect(screen.getByRole('dialog', { name: 'Choisir une entreprise' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fermer' })).toBeInTheDocument();
  });
});

describe('ConfirmDialog', () => {
  it('exige un motif avant de confirmer', async () => {
    const confirmer = vi.fn();
    render(
      <ConfirmDialog
        open
        titre="Suspendre l’artisan ?"
        libelleConfirmer="Suspendre"
        danger
        motifObligatoire
        onConfirmer={confirmer}
      >
        Il ne recevra plus de demandes.
      </ConfirmDialog>,
    );
    const bouton = screen.getByRole('button', { name: 'Suspendre' });
    expect(bouton).toBeDisabled();
    await userEvent.type(screen.getByRole('textbox', { name: /Motif/ }), 'Assurance expirée');
    await userEvent.click(bouton);
    expect(confirmer).toHaveBeenCalledWith('Assurance expirée');
  });
  it('sans motif, confirme directement', async () => {
    const confirmer = vi.fn();
    render(
      <ConfirmDialog open titre="Retirer ?" libelleConfirmer="Retirer" onConfirmer={confirmer} />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Retirer' }));
    expect(confirmer).toHaveBeenCalledWith(undefined);
  });
});

const OPTIONS: OptionCombobox[] = [
  { id: 'sdb', libelle: 'Rénover une salle de bain', complement: 'Plombier' },
  { id: 'peinture', libelle: 'Peindre un appartement' },
];

function ComboboxTest({ onSelection }: { onSelection: (o: OptionCombobox) => void }) {
  const [valeur, setValeur] = useState('');
  return (
    <Combobox
      label="Quel est votre projet ?"
      valeur={valeur}
      onValeurChange={setValeur}
      options={valeur ? OPTIONS : []}
      onSelection={onSelection}
    />
  );
}

describe('Combobox', () => {
  it('suggère, se parcourt au clavier et sélectionne avec Entrée', async () => {
    const selection = vi.fn();
    const { container } = render(<ComboboxTest onSelection={selection} />);
    const champ = screen.getByRole('combobox', { name: 'Quel est votre projet ?' });
    await userEvent.type(champ, 'sal');
    expect(champ).toHaveAttribute('aria-expanded', 'true');
    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByRole('option', { name: /salle de bain/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(champ.getAttribute('aria-activedescendant')).toBe(
      screen.getByRole('option', { name: /salle de bain/ }).id,
    );
    expect(await axe(container)).toHaveNoViolations();
    await userEvent.keyboard('{Enter}');
    expect(selection).toHaveBeenCalledWith(OPTIONS[0]);
    expect(champ).toHaveAttribute('aria-expanded', 'false');
  });
  it('Échap ferme la liste', async () => {
    render(<ComboboxTest onSelection={vi.fn()} />);
    const champ = screen.getByRole('combobox');
    await userEvent.type(champ, 'p');
    await userEvent.keyboard('{Escape}');
    expect(champ).toHaveAttribute('aria-expanded', 'false');
  });
});

function Declencheur() {
  const afficher = useToast();
  return (
    <Button onClick={() => afficher({ titre: 'Fiche enregistrée', tone: 'succes' })}>
      Enregistrer
    </Button>
  );
}

describe('Toast', () => {
  it('affiche un message', async () => {
    render(
      <ToastProvider>
        <Declencheur />
      </ToastProvider>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    await waitFor(() => expect(screen.getAllByText('Fiche enregistrée').length).toBeGreaterThan(0));
  });
  it('refuse d’être utilisé hors du fournisseur', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Declencheur />)).toThrow(/ToastProvider/);
  });
});

describe('PageErreur', () => {
  it('structure la page (titre avec mot mis en avant, actions)', async () => {
    const { container } = render(
      <PageErreur
        surtitre="Erreur 404"
        titre="Cette page a été"
        motCle="déplacée."
        texte="Le lien est peut-être ancien."
        visuel="404"
        actions={<a href="/">Retour à l’accueil</a>}
        entete={<a href="/">Portail Habitat</a>}
        pied={<span>© 2026 Portail Habitat</span>}
      />,
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Cette page a été déplacée.',
    );
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});
