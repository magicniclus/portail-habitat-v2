'use client';

import type { Appareil, Couleur, Section } from '@ph/core/sites';
import { useId } from 'react';
import { ChoixImage } from './ChoixImage';
import { Groupe, Info, Interrupteur, Libelle, Segments, Curseur } from './controles';
import { Couleurs } from './Couleurs';
import { NOMS_APPAREIL, pourAppareil, type ContexteReglages } from './contexte';

const JETONS_FOND: Couleur[] = ['blanc', 'clair', 'primaire', 'sombre', 'accent'];

/** Fond d'une zone (couleur ou image avec voile) ou d'un bloc (couleur). */
export function ReglagesFond({
  p,
  c,
  image,
}: {
  p: Pick<
    Section['p'],
    'fond' | 'fondType' | 'fondImage' | 'voile' | 'voileOpacite' | 'fondPos' | 'texteCouleur'
  >;
  c: ContexteReglages;
  /** Image de fond possible (zones). */
  image: boolean;
}) {
  const typeImage = image && p.fondType === 'image';
  return (
    <Groupe titre="Fond">
      {image ? (
        <Segments
          libelle="Type de fond"
          valeur={p.fondType}
          options={[
            ['couleur', 'Couleur'],
            ['image', 'Image'],
          ]}
          onChange={(fondType) => c.maj({ fondType })}
        />
      ) : null}
      {typeImage ? (
        <>
          <ChoixImage
            libelle="Image de fond"
            src={p.fondImage}
            medias={c.medias}
            artisanId={c.artisanId}
            onMedia={c.onMedia}
            onChoisir={(fondImage) => c.maj({ fondImage })}
          />
          <Segments
            libelle="Cadrage"
            valeur={p.fondPos}
            options={[
              ['top', 'Haut'],
              ['center', 'Centre'],
              ['bottom', 'Bas'],
            ]}
            onChange={(fondPos) => c.maj({ fondPos })}
          />
          <Couleurs
            libelle="Couleur par-dessus"
            valeur={p.voile}
            jetons={['sombre', 'primaire', 'accent', 'blanc']}
            palette={c.palette}
            onChange={(voile) => c.maj({ voile })}
          />
          <Curseur
            libelle="Opacité de la couleur"
            valeur={p.voileOpacite}
            min={0}
            max={90}
            pas={5}
            unite="%"
            onChange={(voileOpacite) => c.maj({ voileOpacite })}
          />
        </>
      ) : (
        <Couleurs
          libelle={image ? 'Couleur de fond' : 'Fond du bloc'}
          valeur={p.fond}
          jetons={image ? JETONS_FOND : ['aucun', ...JETONS_FOND]}
          palette={c.palette}
          onChange={(fond) => c.maj({ fond })}
        />
      )}
      {image ? (
        <Segments
          libelle="Couleur du texte"
          valeur={p.texteCouleur}
          options={[
            ['auto', 'Auto'],
            ['fonce', 'Foncé'],
            ['clair', 'Clair'],
          ]}
          onChange={(texteCouleur) => c.maj({ texteCouleur })}
        />
      ) : null}
    </Groupe>
  );
}

/** Identifiant unique sur la page (ancre des liens, outils de suivi). */
export function Identifiant({
  valeur,
  cle,
  ancre,
  dejaPris,
  c,
}: {
  valeur: string;
  cle: 'ancre' | 'htmlId';
  ancre?: boolean;
  dejaPris: boolean;
  c: ContexteReglages;
}) {
  const id = useId();
  return (
    <Groupe titre="Identifiant">
      <Libelle
        texte={ancre ? 'ID / ancre (sans #)' : 'ID (sans #)'}
        htmlFor={id}
        droite={valeur ? `#${valeur}` : 'aucun'}
      />
      <input
        id={id}
        value={valeur}
        maxLength={40}
        onChange={(e) =>
          c.maj({
            [cle]: e.target.value
              .toLowerCase()
              .normalize('NFD')
              .replace(/[̀-ͯ]/g, '')
              .replace(/[^a-z0-9-]+/g, '-'),
          })
        }
        className="min-h-11 rounded-[8px] border border-trait px-3 text-base"
      />
      {dejaPris ? (
        <p role="alert" className="m-0 text-xs font-semibold text-danger">
          Cet ID est déjà utilisé sur la page : il doit être unique.
        </p>
      ) : (
        <Info>
          Unique sur la page. Sert aux liens directs (#{valeur || 'mon-id'}) et aux outils de suivi.
        </Info>
      )}
    </Groupe>
  );
}

/** Masquer sur l'appareil affiché (SITE-02 : sans effet sur les autres). */
export function Visibilite({
  masque,
  appareil,
  c,
}: {
  masque: Record<Appareil, boolean>;
  appareil: Appareil;
  c: ContexteReglages;
}) {
  return (
    <Groupe titre="Visibilité">
      <Interrupteur
        libelle={`Masquer sur ${NOMS_APPAREIL[appareil].toLowerCase()}`}
        actif={masque[appareil]}
        onChange={(v) => c.maj({ masque: pourAppareil(masque, appareil, v) })}
        aide="Changez d’appareil en haut de l’écran pour régler les autres."
      />
    </Groupe>
  );
}
