'use client';

import type { Element } from '@ph/core/sites';
import Link from 'next/link';
import { routes } from '@/lib/routes';
import { EditeurTexte } from '../texte/EditeurTexte';
import { Champ } from './Champ';
import { ChoixImage } from './ChoixImage';
import { ContenuBlog } from './ContenuBlog';
import { Info, Interrupteur, Segments } from './controles';
import type { ContexteReglages } from './contexte';

/** Groupe « Contenu » de l'onglet Général, selon le type de contenu (maquette Editeur de Site). */
export function ContenuElement({ el, c }: { el: Element; c: ContexteReglages }) {
  const maj = c.maj;
  switch (el.type) {
    case 'titre':
    case 'texte':
      return (
        <>
          <EditeurTexte
            libelle="Texte"
            texte={el.p.texte}
            {...(el.p.liens ? { liens: el.p.liens } : {})}
            onChange={maj}
            c={c}
          />
          {el.type === 'titre' ? (
            <Segments
              libelle="Niveau (référencement)"
              valeur={el.p.niveau}
              options={[
                ['h1', 'H1'],
                ['h2', 'H2'],
                ['h3', 'H3'],
              ]}
              onChange={(niveau) => maj({ niveau })}
            />
          ) : null}
        </>
      );
    case 'surtitre':
      return <Champ libelle="Texte" valeur={el.p.texte} onChange={(texte) => maj({ texte })} />;
    case 'bouton':
      return (
        <>
          <Champ
            libelle="Texte du bouton"
            valeur={el.p.texte}
            onChange={(texte) => maj({ texte })}
          />
          <Interrupteur
            libelle="Sur la même ligne que le bouton voisin"
            actif={el.p.enLigne}
            onChange={(enLigne) => maj({ enLigne })}
            aide="Pour deux boutons côte à côte, ajoutez un second bouton juste en dessous."
          />
        </>
      );
    case 'image':
      return (
        <>
          <ChoixImage
            libelle="Photo"
            src={el.p.src}
            medias={c.medias}
            artisanId={c.artisanId}
            onMedia={c.onMedia}
            onChoisir={(src) => maj({ src })}
          />
          <Champ
            libelle="Texte alternatif (référencement)"
            valeur={el.p.legende}
            onChange={(legende) => maj({ legende })}
          />
        </>
      );
    case 'liste':
      return (
        <>
          <Champ
            libelle="Lignes de la liste (une par ligne)"
            valeur={el.p.items.join('\n')}
            long
            onChange={(v) => maj({ items: v.split('\n').slice(0, 30) })}
          />
          <Segments
            libelle="Puce"
            valeur={el.p.icone}
            options={[
              ['✓', '✓'],
              ['•', '•'],
              ['→', '→'],
            ]}
            onChange={(icone) => maj({ icone })}
          />
        </>
      );
    case 'avis':
      return (
        <>
          <Champ libelle="Nom et ville" valeur={el.p.nom} onChange={(nom) => maj({ nom })} />
          <Champ libelle="Avis" valeur={el.p.texte} long onChange={(texte) => maj({ texte })} />
          <Segments
            libelle="Note"
            valeur={el.p.note}
            options={[
              [3, '3★'],
              [4, '4★'],
              [5, '5★'],
            ]}
            onChange={(note) => maj({ note })}
          />
        </>
      );
    case 'chiffre':
      return (
        <>
          <Champ libelle="Chiffre" valeur={el.p.valeur} onChange={(valeur) => maj({ valeur })} />
          <Champ libelle="Légende" valeur={el.p.label} onChange={(label) => maj({ label })} />
        </>
      );
    case 'formulaire':
      return (
        <>
          <Champ
            libelle="Texte du bouton"
            valeur={el.p.bouton}
            onChange={(bouton) => maj({ bouton })}
          />
          <Info>
            Les champs se règlent dans le tableau de bord du site, onglet{' '}
            <Link href={`${routes.proSite}?onglet=formulaire`}>Formulaire</Link>. Chaque envoi
            arrive dans « Mes demandes ».
          </Info>
        </>
      );
    case 'video':
      return (
        <Champ libelle="Lien YouTube" valeur={el.p.url ?? ''} onChange={(url) => maj({ url })} />
      );
    case 'carte':
      return (
        <Champ
          libelle="Adresse ou zone affichée"
          valeur={el.p.adresse ?? ''}
          onChange={(adresse) => maj({ adresse })}
        />
      );
    case 'separateur':
      return (
        <Segments
          libelle="Longueur"
          valeur={el.p.largeur}
          options={[
            ['court', 'Courte'],
            ['plein', 'Pleine'],
          ]}
          onChange={(largeur) => maj({ largeur })}
        />
      );
    case 'logo':
      return (
        <Champ libelle="Nom affiché" valeur={el.p.texte} onChange={(texte) => maj({ texte })} />
      );
    case 'menu':
      return <Info>Ce menu reprend les liens de la navigation.</Info>;
    case 'blog':
      return <ContenuBlog el={el} c={c} />;
    case 'espace':
      return null;
  }
}
