'use client';

import { Button, Chip, ChipGroup } from '@ph/ui';
import { useState } from 'react';
import type { ChampsArticle } from './useArticle';

const RESEAUX = [
  ['facebook', 'Facebook'],
  ['instagram', 'Instagram'],
  ['linkedin', 'LinkedIn'],
  ['google', 'Fiche Google'],
] as const;

/**
 * Diffusion (BLOG §3, D69 : copier-coller en v1) : texte prêt à coller pour chaque réseau, à
 * partir du titre, de la description et des tags de l'article. Aucune publication automatique.
 */
export function PanneauDiffusion({
  c,
  url,
  tags,
}: {
  c: ChampsArticle;
  url: string;
  tags: string[];
}) {
  const [reseau, setReseau] = useState<(typeof RESEAUX)[number][0]>('facebook');
  const [copie, setCopie] = useState(false);
  const hashtags = tags.map(
    (t) =>
      `#${t
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
        .replace(/[^A-Za-z0-9]/g, '')}`,
  );
  const lien = reseau === 'instagram' ? 'Lien dans la bio.' : url;
  const texte = [c.titre, c.meta, lien, reseau === 'google' ? '' : hashtags.join(' ')]
    .filter(Boolean)
    .join('\n\n');
  return (
    <div className="grid gap-3">
      <p className="m-0 text-[15px] text-neutre-800">Copiez, collez, publiez.</p>
      <ChipGroup libelle="Réseau">
        {RESEAUX.map(([r, l]) => (
          <Chip key={r} selectionne={reseau === r} onClick={() => setReseau(r)}>
            {l}
          </Chip>
        ))}
      </ChipGroup>
      <pre className="m-0 rounded-[12px] border border-trait p-3 font-sans text-[15px] whitespace-pre-wrap">
        {texte || 'Écrivez d’abord le titre et la description.'}
      </pre>
      <div>
        <Button
          variant="secondaire"
          disabled={!c.titre}
          onClick={() =>
            void navigator.clipboard.writeText(texte).then(() => {
              setCopie(true);
              setTimeout(() => setCopie(false), 2000);
            })
          }
        >
          {copie ? 'Texte copié' : 'Copier le texte'}
        </Button>
      </div>
    </div>
  );
}
