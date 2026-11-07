'use client';

import type { NavigationComplete, PageSite } from '@ph/core/sites';
import type { ReactNode } from 'react';
import { Action, Curseur, Groupe, Info, Interrupteur, Segments } from './controles';
import { Couleurs } from './Couleurs';
import { NOMS_APPAREIL, pourAppareil, type ContexteReglages } from './contexte';

type Maj = (r: Partial<NavigationComplete>) => void;

/** Onglet Mobile de la navigation (maquette) : barre, menu ouvert plein écran, barre d'appel. */
export function NavigationMobile({
  n,
  maj,
  c,
  global,
}: {
  n: NavigationComplete;
  maj: Maj;
  c: ContexteReglages;
  global: ReactNode;
}) {
  const m = n.mobile;
  const mobile = (r: Partial<NavigationComplete['mobile']>) => maj({ mobile: { ...m, ...r } });
  const a = c.appareil;
  return (
    <>
      <Groupe titre="Aperçu">
        <Info>
          {a === 'desktop'
            ? 'Sur tablette et mobile, les liens passent dans un menu à trois traits qui se change en croix à l’ouverture.'
            : 'Cliquez sur les trois traits dans l’aperçu pour ouvrir et fermer le menu.'}
        </Info>
        {a === 'desktop' ? (
          <Action onClick={() => c.onAppareil('mobile')}>Voir l’aperçu mobile</Action>
        ) : (
          <Action onClick={() => c.basculerMenu()}>Ouvrir ou fermer le menu dans l’aperçu</Action>
        )}
      </Groupe>
      <Groupe titre="Barre mobile">
        <Segments
          libelle="Bouton menu"
          valeur={m.burger}
          options={[
            ['gauche', 'À gauche'],
            ['droite', 'À droite'],
          ]}
          onChange={(burger) => mobile({ burger })}
        />
        <Couleurs
          libelle="Couleur des traits"
          valeur={m.traits}
          jetons={['auto', 'sombre', 'primaire', 'accent', 'blanc']}
          palette={c.palette}
          libre={false}
          onChange={(traits) => mobile({ traits })}
        />
        <Interrupteur
          libelle="Bouton devis dans la barre (tablette)"
          actif={m.cta}
          onChange={(cta) => mobile({ cta })}
        />
        <Interrupteur
          libelle="Icône téléphone dans la barre (tablette)"
          actif={m.tel}
          onChange={(tel) => mobile({ tel })}
        />
        <Info>
          Sur mobile, la barre fermée n’affiche que le logo et le bouton menu : devis et téléphone
          sont dans le menu ouvert.
        </Info>
        <Curseur
          libelle="Hauteur de la barre"
          valeur={n.hauteur[a]}
          min={4}
          max={32}
          suffixe={NOMS_APPAREIL[a]}
          onChange={(v) => maj({ hauteur: pourAppareil(n.hauteur, a, v) })}
        />
      </Groupe>
      <Groupe titre="Menu ouvert">
        <Segments
          libelle="Le menu arrive"
          valeur={m.sens}
          options={[
            ['droite', 'De la droite'],
            ['gauche', 'De la gauche'],
          ]}
          onChange={(sens) => mobile({ sens })}
        />
        <Info>
          Le menu ouvert prend toute la largeur de l’écran et bloque le défilement de la page
          derrière.
        </Info>
        <Couleurs
          libelle="Fond du menu"
          valeur={m.fond}
          jetons={['blanc', 'clair', 'primaire', 'sombre']}
          palette={c.palette}
          onChange={(fond) => mobile({ fond })}
        />
        <Curseur
          libelle="Taille des liens"
          valeur={m.taille}
          min={14}
          max={32}
          onChange={(taille) => mobile({ taille })}
        />
        <Interrupteur
          libelle="Traits entre les liens"
          actif={m.separateurs}
          onChange={(separateurs) => mobile({ separateurs })}
        />
        <Interrupteur
          libelle="Bouton devis en bas du menu"
          actif={m.ctaMenu}
          onChange={(ctaMenu) => mobile({ ctaMenu })}
        />
      </Groupe>
      <Groupe titre="Barre d’appel (mobile)">
        <Interrupteur
          libelle="Barre « Appeler · Devis gratuit » fixée en bas de l’écran"
          actif={m.barreAppel}
          onChange={(barreAppel) => mobile({ barreAppel })}
          aide="Toujours visible pendant le défilement sur téléphone : c’est le meilleur levier de prise de contact."
        />
      </Groupe>
      {global}
    </>
  );
}

/** Onglet Avancé de la navigation : comportement au défilement et masquage sur une page. */
export function NavigationAvancee({
  n,
  maj,
  page,
  onPage,
  global,
}: {
  n: NavigationComplete;
  maj: Maj;
  page: PageSite;
  onPage: (p: Partial<PageSite>) => void;
  global: ReactNode;
}) {
  return (
    <>
      <Groupe titre="Comportement">
        <Interrupteur
          libelle="Fixe en haut au défilement"
          actif={n.fixe}
          onChange={(fixe) => maj({ fixe })}
        />
        <Interrupteur
          libelle="Ombre sous la barre"
          actif={n.ombre}
          onChange={(ombre) => maj({ ombre })}
        />
        <Interrupteur
          libelle="Transparente sur le premier bandeau"
          actif={n.transparente}
          onChange={(transparente) => maj({ transparente })}
        />
      </Groupe>
      <Groupe titre="Cette page">
        <Interrupteur
          libelle={`Masquer sur « ${page.nom} »`}
          actif={page.sansNavigation}
          onChange={(sansNavigation) => onPage({ sansNavigation })}
          aide="Utile pour une page d’atterrissage sans distraction."
        />
      </Groupe>
      {global}
    </>
  );
}
