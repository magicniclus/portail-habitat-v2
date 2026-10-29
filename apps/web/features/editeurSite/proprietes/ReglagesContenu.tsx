'use client';

import type { Appareil, Couleur, Element } from '@ph/core/sites';
import { ChampAction } from '../ChampAction';
import { Identifiant, Visibilite } from './Communs';
import { Animation } from './Animation';
import { Marges } from './Marges';
import { ContenuElement } from './ContenuElement';
import { Curseur, Groupe, Interrupteur, Segments } from './controles';
import { Couleurs } from './Couleurs';
import { StyleImage, StyleLiens } from './StylesElement';
import { NOMS_APPAREIL, pourAppareil, type ContexteReglages } from './contexte';

const ALIGNABLES = new Set([
  'titre',
  'surtitre',
  'texte',
  'bouton',
  'liste',
  'avis',
  'chiffre',
  'separateur',
]);
const TEINTABLES = new Set(['titre', 'surtitre', 'texte', 'liste', 'chiffre']);
const TAILLES: Partial<Record<Element['type'], [number, number]>> = {
  titre: [14, 80],
  surtitre: [11, 22],
  texte: [12, 28],
  chiffre: [16, 80],
};
const TEXTE_MOBILE = new Set(['titre', 'surtitre', 'texte', 'bouton']);

/** Contenu sélectionné : Général (contenu, au clic, style) ou Avancé (mobile, ID, marge, visibilité). */
export function ReglagesContenu({
  el,
  onglet,
  c,
  idPris,
}: {
  el: Element;
  onglet: 'general' | 'avance';
  c: ContexteReglages;
  idPris: (v: string) => boolean;
}) {
  const p = el.p as Record<string, unknown>;
  const a: Appareil = c.appareil;
  if (onglet === 'avance')
    return (
      <>
        {TEXTE_MOBILE.has(el.type) ? (
          <Groupe titre="Contenu mobile">
            <Interrupteur
              libelle="Texte différent sur mobile"
              actif={el.p.texteMobileOn === true}
              onChange={(texteMobileOn) => c.maj({ texteMobileOn })}
            />
            {el.p.texteMobileOn ? (
              <label className="grid gap-1.5 text-[13px] font-bold text-neutre-800">
                Texte affiché sur mobile
                <textarea
                  rows={3}
                  value={el.p.texteMobile ?? ''}
                  onChange={(e) => c.maj({ texteMobile: e.target.value })}
                  className="rounded-[8px] border border-trait px-3 py-2 text-base"
                />
              </label>
            ) : null}
          </Groupe>
        ) : null}
        <Identifiant valeur={el.p.htmlId} cle="htmlId" dejaPris={idPris(el.p.htmlId)} c={c} />
        <Marges el={el} c={c} />
        <Animation anim={el.p.anim} c={c} />
        <Visibilite masque={el.p.masque} appareil={a} c={c} />
      </>
    );
  const taille = TAILLES[el.type];
  const action = 'action' in el.p ? el.p.action : null;
  return (
    <>
      {el.type !== 'espace' ? (
        <Groupe titre="Contenu">
          <ContenuElement el={el} c={c} />
        </Groupe>
      ) : null}
      {action ? (
        <Groupe titre={el.type === 'image' ? 'Au clic sur l’image' : 'Au clic'}>
          <ChampAction
            action={action}
            onChange={(x) => c.maj({ action: x })}
            c={c}
            libelle="Action"
          />
        </Groupe>
      ) : null}
      <Groupe titre="Style">
        {ALIGNABLES.has(el.type) ? (
          <Segments
            libelle="Alignement"
            valeur={String(p.align)}
            options={[
              ['left', 'Gauche'],
              ['center', 'Centre'],
              ['right', 'Droite'],
            ]}
            onChange={(align) => c.maj({ align })}
          />
        ) : null}
        {TEINTABLES.has(el.type) ? (
          <Couleurs
            libelle="Couleur"
            valeur={p.couleur as Couleur}
            jetons={['auto', 'sombre', 'primaire', 'accent', 'blanc']}
            palette={c.palette}
            onChange={(couleur) => c.maj({ couleur })}
          />
        ) : null}
        {taille ? (
          <Curseur
            libelle="Taille"
            valeur={(p.taille as Record<Appareil, number>)[a]}
            min={taille[0]}
            max={taille[1]}
            suffixe={NOMS_APPAREIL[a]}
            onChange={(v) =>
              c.maj({ taille: pourAppareil(p.taille as Record<Appareil, number>, a, v) })
            }
          />
        ) : null}
        {el.type === 'espace' ? (
          <Curseur
            libelle="Hauteur"
            valeur={el.p.hauteur[a]}
            min={8}
            max={160}
            pas={4}
            suffixe={NOMS_APPAREIL[a]}
            onChange={(v) => c.maj({ hauteur: pourAppareil(el.p.hauteur, a, v) })}
          />
        ) : null}
        {el.type === 'bouton' ? (
          <>
            <Segments
              libelle="Style"
              valeur={el.p.variante}
              options={[
                ['plein', 'Plein'],
                ['contour', 'Contour'],
              ]}
              onChange={(variante) => c.maj({ variante })}
            />
            <Couleurs
              libelle="Couleur"
              valeur={el.p.couleur}
              jetons={['primaire', 'accent', 'sombre', 'blanc']}
              palette={c.palette}
              onChange={(couleur) => c.maj({ couleur })}
            />
            <Segments
              libelle="Largeur"
              valeur={el.p.largeur}
              options={[
                ['auto', 'Auto'],
                ['plein', 'Pleine'],
              ]}
              onChange={(largeur) => c.maj({ largeur })}
            />
          </>
        ) : null}
        {el.type === 'titre' || el.type === 'texte' ? <StyleLiens el={el} c={c} /> : null}
        {el.type === 'image' ? <StyleImage el={el} c={c} /> : null}
      </Groupe>
    </>
  );
}
