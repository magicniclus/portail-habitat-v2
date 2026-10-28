'use client';

import {
  navigationComplete,
  type Navigation,
  type NavigationComplete,
  type PageSite,
} from '@ph/core/sites';
import { Button } from '@ph/ui';
import { ChoixImage } from './ChoixImage';
import { Action, Curseur, Groupe, Info, Segments } from './controles';
import { Couleurs } from './Couleurs';
import { NOMS_APPAREIL, pourAppareil, type ContexteReglages } from './contexte';
import { BoutonsNavigation } from './BoutonsNavigation';
import { LiensMenu } from './LiensMenu';
import { NavigationAvancee, NavigationMobile } from './NavigationMobile';

const champ = 'min-h-11 rounded-[8px] border border-trait px-3 text-base font-normal';

/**
 * Navigation, composant global (SITE-11) : une seule pour tout le site, enregistrée à part.
 * Onglets Général (logo, liens, boutons, apparence), Mobile (barre, menu ouvert, barre d'appel)
 * et Avancé (comportement, cette page) — maquette Editeur de Site.
 */
export function ReglagesNavigation(p: {
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
  const { c } = p;
  const n = navigationComplete(p.nav);
  const maj = (r: Partial<NavigationComplete>) => p.onChange({ ...n, ...r });
  const a = c.appareil;
  const avecNav = Object.values(c.pages).filter((x) => !x.sansNavigation).length;
  const global = (
    <Groupe titre="Composant global">
      <Info>
        Affichée en haut de {avecNav} pages sur {Object.keys(c.pages).length}. Une modification ici
        s’applique partout.
      </Info>
      {p.nonEnregistree ? (
        <>
          <Button onClick={p.onEnregistrer} disabled={p.enCours}>
            Enregistrer la navigation
          </Button>
          <Action onClick={p.onAnnuler}>Annuler les modifications non enregistrées</Action>
        </>
      ) : (
        <Info>✓ Aucune modification en attente.</Info>
      )}
    </Groupe>
  );
  if (p.onglet === 'mobile') return <NavigationMobile n={n} maj={maj} c={c} global={global} />;
  if (p.onglet === 'avance')
    return <NavigationAvancee n={n} maj={maj} page={p.page} onPage={p.onPage} global={global} />;
  return (
    <>
      {global}
      <Groupe titre="Logo">
        <Segments
          libelle="Affichage"
          valeur={n.logo.mode}
          options={[
            ['logo-nom', 'Logo + nom'],
            ['logo', 'Logo'],
            ['nom', 'Nom'],
          ]}
          onChange={(mode) => maj({ logo: { ...n.logo, mode } })}
        />
        <ChoixImage
          libelle="Image du logo"
          src={n.logo.image}
          medias={c.medias}
          artisanId={c.artisanId}
          onMedia={c.onMedia}
          onChoisir={(image) => maj({ logo: { ...n.logo, image: image as typeof n.logo.image } })}
        />
        <Info>
          PNG ou SVG à fond transparent conseillé. Il est aussi utilisé dans le menu mobile.
        </Info>
        {n.logo.image ? null : (
          <>
            <label className="grid gap-1.5 text-[13px] font-bold text-neutre-800">
              Initiales (sans image)
              <input
                value={n.logo.initiales}
                maxLength={4}
                onChange={(e) =>
                  maj({ logo: { ...n.logo, initiales: e.target.value.toUpperCase() } })
                }
                className={champ}
              />
            </label>
            <Couleurs
              libelle="Fond des initiales"
              valeur={n.logo.fond}
              jetons={['primaire', 'accent', 'sombre', 'blanc']}
              palette={c.palette}
              onChange={(fond) => maj({ logo: { ...n.logo, fond } })}
            />
          </>
        )}
        <Curseur
          libelle="Taille du logo"
          valeur={n.logo.taille[a]}
          min={20}
          max={80}
          suffixe={NOMS_APPAREIL[a]}
          onChange={(v) => maj({ logo: { ...n.logo, taille: pourAppareil(n.logo.taille, a, v) } })}
        />
        <label className="grid gap-1.5 text-[13px] font-bold text-neutre-800">
          Nom affiché
          <input
            value={n.nom}
            maxLength={120}
            onChange={(e) => maj({ nom: e.target.value })}
            className={champ}
          />
        </label>
      </Groupe>
      <Groupe titre="Liens">
        <LiensMenu nav={n} c={c} onChange={(x) => maj({ liens: x.liens })} />
        <Segments
          libelle="Alignement"
          valeur={n.align}
          options={[
            ['gauche', 'Gauche'],
            ['centre', 'Centre'],
            ['droite', 'Droite'],
          ]}
          onChange={(align) => maj({ align })}
        />
      </Groupe>
      <BoutonsNavigation n={n} maj={maj} c={c} />
      <Groupe titre="Apparence">
        <Couleurs
          libelle="Fond"
          valeur={n.fond}
          jetons={['blanc', 'clair', 'primaire', 'sombre']}
          palette={c.palette}
          onChange={(fond) => maj({ fond })}
        />
        <Couleurs
          libelle="Couleur du texte"
          valeur={n.texte}
          jetons={['auto', 'sombre', 'primaire', 'blanc']}
          palette={c.palette}
          libre={false}
          onChange={(texte) => maj({ texte })}
        />
        <Curseur
          libelle="Hauteur"
          valeur={n.hauteur[a]}
          min={4}
          max={40}
          suffixe={NOMS_APPAREIL[a]}
          onChange={(v) => maj({ hauteur: pourAppareil(n.hauteur, a, v) })}
        />
      </Groupe>
    </>
  );
}
