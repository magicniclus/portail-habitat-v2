'use client';

import type { Element } from '@ph/core/sites';
import { Curseur, Interrupteur, Segments } from './controles';
import { Couleurs } from './Couleurs';
import type { ContexteReglages } from './contexte';

/** Liens d'un titre ou d'un texte : couleur et soulignement des mots liés. */
export function StyleLiens({
  el,
  c,
}: {
  el: Extract<Element, { type: 'titre' | 'texte' }>;
  c: ContexteReglages;
}) {
  if (!Object.keys(el.p.liens ?? {}).length) return null;
  return (
    <>
      <Couleurs
        libelle="Couleur des liens"
        valeur={el.p.lienCouleur ?? 'auto'}
        jetons={['auto', 'accent', 'primaire', 'sombre', 'blanc']}
        palette={c.palette}
        onChange={(lienCouleur) => c.maj({ lienCouleur })}
      />
      <Interrupteur
        libelle="Liens soulignés"
        actif={el.p.lienSouligne !== false}
        onChange={(lienSouligne) => c.maj({ lienSouligne })}
      />
    </>
  );
}

/** Image : format, ajustement, cadrage, arrondi et couleur par-dessus. */
export function StyleImage({
  el,
  c,
}: {
  el: Extract<Element, { type: 'image' }>;
  c: ContexteReglages;
}) {
  return (
    <>
      <Segments
        libelle="Format"
        valeur={el.p.ratio}
        options={[
          ['4 / 3', '4:3'],
          ['16 / 9', '16:9'],
          ['1 / 1', '1:1'],
          ['3 / 4', '3:4'],
        ]}
        onChange={(ratio) => c.maj({ ratio })}
      />
      <Segments
        libelle="Ajustement"
        valeur={el.p.ajuste}
        options={[
          ['cover', 'Remplir'],
          ['contain', 'Contenir'],
        ]}
        onChange={(ajuste) => c.maj({ ajuste })}
      />
      <Segments
        libelle="Cadrage"
        valeur={el.p.pos}
        options={[
          ['top', 'Haut'],
          ['center', 'Centre'],
          ['bottom', 'Bas'],
        ]}
        onChange={(pos) => c.maj({ pos })}
      />
      <Curseur
        libelle="Arrondi"
        valeur={el.p.arrondi}
        min={0}
        max={40}
        onChange={(arrondi) => c.maj({ arrondi })}
      />
      <Couleurs
        libelle="Couleur par-dessus"
        valeur={el.p.voile}
        jetons={['aucun', 'sombre', 'primaire', 'accent', 'blanc']}
        palette={c.palette}
        onChange={(voile) => c.maj({ voile })}
      />
      {el.p.voile !== 'aucun' ? (
        <Curseur
          libelle="Opacité de la couleur"
          valeur={el.p.voileOpacite}
          min={0}
          max={90}
          pas={5}
          unite="%"
          onChange={(voileOpacite) => c.maj({ voileOpacite })}
        />
      ) : null}
    </>
  );
}
