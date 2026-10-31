'use client';

import type { Bloc } from '@ph/core/sites';
import { Action, Curseur, Groupe, Info, Interrupteur, Segments } from './controles';
import { Identifiant, ReglagesFond, Visibilite } from './Communs';
import type { ContexteReglages } from './contexte';

type Onglet = 'general' | 'avance';

export const ALIGN_V = [
  ['start', 'Haut'],
  ['center', 'Centre'],
  ['end', 'Bas'],
] as const;

/** Bloc (colonne) : largeur sur 12, fond, bordure, alignement du contenu. */
export function ReglagesBloc(p: {
  bloc: Bloc;
  onglet: Onglet;
  c: ContexteReglages;
  idPris: (v: string) => boolean;
}) {
  const { bloc: b, c } = p;
  if (p.onglet === 'avance')
    return (
      <>
        <Identifiant
          valeur={b.p.htmlId ?? ''}
          cle="htmlId"
          dejaPris={p.idPris(b.p.htmlId ?? '')}
          c={c}
        />
        <Visibilite masque={b.p.masque} appareil={c.appareil} c={c} />
      </>
    );
  return (
    <>
      <Groupe titre="Dimensions">
        <Curseur
          libelle="Largeur"
          valeur={b.w}
          min={1}
          max={12}
          unite="/ 12"
          onChange={(w) => c.maj({ w })}
        />
        <Info>
          Les blocs d’une même section se partagent 12 unités. Ajoutez-en depuis la section.
        </Info>
      </Groupe>
      <ReglagesFond p={b.p} c={c} image={false} />
      <Groupe titre="Bordure">
        <Curseur
          libelle="Marge intérieure"
          valeur={b.p.pad}
          min={0}
          max={64}
          pas={2}
          onChange={(pad) => c.maj({ pad })}
        />
        <Curseur
          libelle="Arrondi"
          valeur={b.p.arrondi}
          min={0}
          max={32}
          onChange={(arrondi) => c.maj({ arrondi })}
        />
        <Interrupteur
          libelle="Ombre portée"
          actif={b.p.ombre}
          onChange={(ombre) => c.maj({ ombre })}
        />
      </Groupe>
      <Groupe titre="Contenu">
        <Segments
          libelle="Alignement vertical"
          valeur={b.p.valign === 'stretch' ? 'start' : b.p.valign}
          options={ALIGN_V}
          onChange={(valign) => c.maj({ valign })}
        />
        <Action onClick={() => c.ouvrirAjout('contenus')}>+ Ajouter un contenu dans ce bloc</Action>
      </Groupe>
    </>
  );
}
