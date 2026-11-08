'use client';

import { clipParId, type Frise } from '@ph/core/studio';
import { useState } from 'react';
import { nomClip } from './ClipFrise';
import { ReglagesClip } from './ReglagesClip';
import { ReglagesImage, ReglagesSon } from './ReglagesFiltres';
import { ReglagesProjet } from './ReglagesProjet';

type Onglet = 'clip' | 'son' | 'image';

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
  if (!r) return <ReglagesProjet frise={p.frise} tete={p.tete} changer={p.changer} />;
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
