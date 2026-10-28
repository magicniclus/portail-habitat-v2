'use client';

import type { Navigation, PageSite } from '@ph/core/sites';
import { Button } from '@ph/ui';
import { ChampAction } from '../ChampAction';
import { ChoixImage } from './ChoixImage';
import { Action, Groupe, Info, Interrupteur, Segments } from './controles';
import { Couleurs } from './Couleurs';
import type { ContexteReglages } from './contexte';
import { LiensMenu } from './LiensMenu';

/**
 * Navigation, composant global (SITE-11) : une seule pour tout le site, enregistrée à part.
 * Onglets Général (logo, liens, boutons, apparence), Mobile et Avancé (comportement, cette page).
 */
export function ReglagesNavigation({
  nav,
  page,
  onglet,
  c,
  onChange,
  onPage,
  nonEnregistree,
  onEnregistrer,
  onAnnuler,
  enCours,
}: {
  nav: Navigation;
  page: PageSite;
  onglet: 'general' | 'mobile' | 'avance';
  c: ContexteReglages;
  onChange: (n: Navigation) => void;
  onPage: (p: Partial<PageSite>) => void;
  nonEnregistree: boolean;
  onEnregistrer: () => void;
  onAnnuler: () => void;
  enCours: boolean;
}) {
  const nbPages = Object.keys(c.pages).length;
  const avecNav = Object.values(c.pages).filter((p) => !p.sansNavigation).length;
  const global = (
    <Groupe titre="Composant global">
      <Info>
        Affichée en haut de {avecNav} pages sur {nbPages}. Une modification ici s’applique partout.
      </Info>
      {nonEnregistree ? (
        <>
          <Button onClick={onEnregistrer} disabled={enCours}>
            Enregistrer la navigation
          </Button>
          <Action onClick={onAnnuler}>Annuler les modifications non enregistrées</Action>
        </>
      ) : (
        <Info>✓ Aucune modification en attente.</Info>
      )}
    </Groupe>
  );
  if (onglet === 'mobile')
    return (
      <>
        <Groupe titre="Menu ouvert">
          <Segments
            libelle="Le menu arrive"
            valeur={nav.mobile.sens}
            options={[
              ['droite', 'De la droite'],
              ['gauche', 'De la gauche'],
            ]}
            onChange={(sens) => onChange({ ...nav, mobile: { ...nav.mobile, sens } })}
          />
          <Info>
            Sur tablette et mobile, les liens passent dans un menu à trois traits qui prend tout
            l’écran. Cliquez sur les traits dans l’aperçu mobile pour l’ouvrir.
          </Info>
        </Groupe>
        {global}
      </>
    );
  if (onglet === 'avance')
    return (
      <>
        <Groupe titre="Comportement">
          <Interrupteur
            libelle="Fixe en haut au défilement"
            actif={nav.fixe}
            onChange={(fixe) => onChange({ ...nav, fixe })}
          />
          <Interrupteur
            libelle="Ombre sous la barre"
            actif={nav.ombre}
            onChange={(ombre) => onChange({ ...nav, ombre })}
          />
          <Interrupteur
            libelle="Transparente sur le premier bandeau"
            actif={nav.transparente}
            onChange={(transparente) => onChange({ ...nav, transparente })}
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
  const logo = nav.logo;
  return (
    <>
      {global}
      <Groupe titre="Logo">
        <Segments
          libelle="Affichage"
          valeur={logo.mode}
          options={[
            ['logo-nom', 'Logo + nom'],
            ['logo', 'Logo'],
            ['nom', 'Nom'],
          ]}
          onChange={(mode) => onChange({ ...nav, logo: { ...logo, mode } })}
        />
        <ChoixImage
          libelle="Image du logo"
          src={logo.image}
          medias={c.medias}
          artisanId={c.artisanId}
          onMedia={c.onMedia}
          onChoisir={(image) => onChange({ ...nav, logo: { ...logo, image } })}
        />
        <label className="grid gap-1.5 text-[13px] font-bold text-neutre-800">
          Nom affiché
          <input
            value={nav.nom}
            maxLength={120}
            onChange={(e) => onChange({ ...nav, nom: e.target.value })}
            className="min-h-11 rounded-[8px] border border-trait px-3 text-base"
          />
        </label>
      </Groupe>
      <Groupe titre="Liens">
        <LiensMenu nav={nav} c={c} onChange={onChange} />
      </Groupe>
      <Groupe titre="Boutons">
        <Interrupteur
          libelle="Bouton devis"
          actif={nav.cta.visible}
          onChange={(visible) => onChange({ ...nav, cta: { ...nav.cta, visible } })}
        />
        {nav.cta.visible ? (
          <>
            <label className="grid gap-1.5 text-[13px] font-bold text-neutre-800">
              Texte du bouton
              <input
                value={nav.cta.texte}
                maxLength={40}
                onChange={(e) => onChange({ ...nav, cta: { ...nav.cta, texte: e.target.value } })}
                className="min-h-11 rounded-[8px] border border-trait px-3 text-base"
              />
            </label>
            <ChampAction
              action={nav.cta.action}
              onChange={(action) => onChange({ ...nav, cta: { ...nav.cta, action } })}
              pages={c.pages}
              erreur={c.erreurAction(nav.cta.action)}
              libelle="Action du bouton"
            />
            <Couleurs
              libelle="Couleur du bouton"
              valeur={nav.cta.couleur}
              jetons={['primaire', 'accent', 'sombre', 'blanc']}
              palette={c.palette}
              onChange={(couleur) => onChange({ ...nav, cta: { ...nav.cta, couleur } })}
            />
          </>
        ) : null}
        <Interrupteur
          libelle="Numéro de téléphone"
          actif={nav.tel.visible}
          onChange={(visible) => onChange({ ...nav, tel: { ...nav.tel, visible } })}
        />
        {nav.tel.visible ? (
          <label className="grid gap-1.5 text-[13px] font-bold text-neutre-800">
            Numéro
            <input
              type="tel"
              value={nav.tel.numero}
              maxLength={30}
              onChange={(e) => onChange({ ...nav, tel: { ...nav.tel, numero: e.target.value } })}
              className="min-h-11 rounded-[8px] border border-trait px-3 text-base"
            />
          </label>
        ) : null}
      </Groupe>
      <Groupe titre="Apparence">
        <Couleurs
          libelle="Fond"
          valeur={nav.fond}
          jetons={['blanc', 'clair', 'primaire', 'sombre']}
          palette={c.palette}
          onChange={(fond) => onChange({ ...nav, fond })}
        />
      </Groupe>
    </>
  );
}
