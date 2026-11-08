'use client';

import { ajouterPiste, clipParId, FORMATS_STUDIO, type Frise } from '@ph/core/studio';
import { useState } from 'react';
import { nomClip } from './ClipFrise';
import { Interrupteur } from './Curseur';
import { ReglagesClip } from './ReglagesClip';
import { ReglagesImage, ReglagesSon } from './ReglagesFiltres';

type Onglet = 'clip' | 'son' | 'image';
const AJOUT =
  'min-h-10 rounded-[8px] bg-montage-surface px-3 text-sm font-semibold hover:bg-montage-survol';

/**
 * Panneau de droite : sans sélection, les réglages du projet et l'ajout de pistes ; avec un clip
 * sélectionné, ses onglets Clip, Son (si le clip a du son) et Image (s'il est à l'image).
 */
export function InspecteurFrise(p: {
  frise: Frise;
  selection: string | null;
  tete: number;
  changer: (f: Frise) => void;
  onSelection: (id: string | null) => void;
}) {
  const [onglet, setOnglet] = useState<Onglet>('clip');
  const r = p.selection ? clipParId(p.frise, p.selection) : null;
  if (!r) {
    const f = p.frise;
    return (
      <div className="grid gap-4">
        <div>
          <h3 className="m-0 text-sm font-semibold">Projet</h3>
          <p className="m-0 text-xs text-montage-texte-doux">
            {f.titre} · {FORMATS_STUDIO[f.format].libelle}
          </p>
        </div>
        <Interrupteur
          libelle="Sous-titres automatiques"
          coche={f.sousTitres}
          onChange={(v) => p.changer({ ...f, sousTitres: v })}
        />
        <Interrupteur
          libelle="Nappe musicale du robot"
          coche={f.musique}
          onChange={(v) => p.changer({ ...f, musique: v })}
        />
        <div className="grid gap-2">
          <h3 className="m-0 text-sm font-semibold">Ajouter une piste</h3>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={AJOUT}
              onClick={() => p.changer(ajouterPiste(f, 'video'))}
            >
              + Vidéo
            </button>
            <button
              type="button"
              className={AJOUT}
              onClick={() => p.changer(ajouterPiste(f, 'audio'))}
            >
              + Audio
            </button>
            <button
              type="button"
              className={AJOUT}
              onClick={() => p.changer(ajouterPiste(f, 'texte'))}
            >
              + Effets
            </button>
          </div>
          <p className="m-0 text-xs text-montage-texte-doux">
            Entre deux pistes vidéo, celle du haut passe devant. 16 pistes au plus.
          </p>
        </div>
      </div>
    );
  }
  const { piste, clip } = r;
  const s = clip.source;
  const media = s.type === 'media' ? p.frise.medias.find((m) => m.id === s.mediaId) : undefined;
  const aDuSon =
    piste.type === 'audio' || s.type === 'prise' || (media !== undefined && media.type === 'video');
  const aImage = piste.type === 'video';
  const onglets: { id: Onglet; libelle: string }[] = [
    { id: 'clip', libelle: 'Clip' },
    ...(aDuSon ? [{ id: 'son' as const, libelle: 'Son' }] : []),
    ...(aImage && s.type !== 'carton' ? [{ id: 'image' as const, libelle: 'Image' }] : []),
  ];
  const actif = onglets.some((o) => o.id === onglet) ? onglet : 'clip';
  const commun = { frise: p.frise, clip, tete: p.tete, changer: p.changer };
  return (
    <div className="grid gap-3">
      <div>
        <h3 className="m-0 truncate text-sm font-semibold">{nomClip(p.frise, clip)}</h3>
        <p className="m-0 text-xs text-montage-texte-doux">
          {piste.nom}
          {piste.verrou ? ' · verrouillée' : ''}
        </p>
      </div>
      <div
        role="tablist"
        aria-label="Réglages du clip"
        className="flex gap-1 rounded-[8px] bg-montage-fond p-1"
      >
        {onglets.map((o) => (
          <button
            key={o.id}
            type="button"
            role="tab"
            aria-selected={actif === o.id}
            onClick={() => setOnglet(o.id)}
            className="min-h-9 flex-1 rounded-[6px] text-sm text-montage-texte-doux aria-selected:bg-montage-surface aria-selected:text-montage-texte"
          >
            {o.libelle}
          </button>
        ))}
      </div>
      <div role="tabpanel" aria-label={onglets.find((o) => o.id === actif)!.libelle}>
        {actif === 'clip' ? (
          <ReglagesClip {...commun} image={aImage} onSupprime={() => p.onSelection(null)} />
        ) : actif === 'son' ? (
          <ReglagesSon {...commun} />
        ) : (
          <ReglagesImage {...commun} />
        )}
      </div>
    </div>
  );
}
