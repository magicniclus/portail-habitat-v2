'use client';

import { APPAREILS, LIBELLES_APPAREIL, type Clip } from '@ph/core/studio';

/** Présentation d'un écran : image entière, ou posé dans un ordinateur / un téléphone. */
export function PresentationClip(p: {
  appareil: Clip['appareil'];
  onChange: (a: Clip['appareil']) => void;
}) {
  return (
    <label className="grid gap-1 text-xs">
      <span className="text-montage-texte-doux">Présentation</span>
      <select
        value={p.appareil ?? ''}
        onChange={(e) => p.onChange((e.target.value || undefined) as Clip['appareil'])}
        className="min-h-11 rounded-[8px] border border-montage-trait bg-montage-surface px-3 text-base text-montage-texte"
      >
        <option value="">Image entière</option>
        {APPAREILS.map((a) => (
          <option key={a} value={a}>
            {LIBELLES_APPAREIL[a]} (fond animé)
          </option>
        ))}
      </select>
    </label>
  );
}
