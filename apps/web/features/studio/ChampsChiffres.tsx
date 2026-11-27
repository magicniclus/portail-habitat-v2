'use client';

import { Field, Input } from '@ph/ui';

/** Chiffres lus dans l'appli du réseau ; vide = inconnu (sauf les vues). */
export interface Chiffres {
  vues: string;
  likes: string;
  commentaires: string;
  partages: string;
  abonnesGagnes: string;
  retentionPourcent: string;
}

export const CHIFFRES_VIDES: Chiffres = {
  vues: '',
  likes: '',
  commentaires: '',
  partages: '',
  abonnesGagnes: '',
  retentionPourcent: '',
};

const nombre = (x: string) =>
  x.trim() === '' ? null : Math.max(0, Math.round(Number(x.replace(/\s/g, '')))) || 0;

export const versEntree = (c: Chiffres) => ({
  vues: nombre(c.vues) ?? 0,
  likes: nombre(c.likes),
  commentaires: nombre(c.commentaires),
  partages: nombre(c.partages),
  abonnesGagnes: nombre(c.abonnesGagnes),
  retentionPourcent: (() => {
    const r = nombre(c.retentionPourcent);
    return r === null ? null : Math.min(100, r);
  })(),
});

const CHAMPS: [keyof Chiffres, string, string?][] = [
  ['vues', 'Vues'],
  ['abonnesGagnes', 'Abonnés gagnés'],
  ['retentionPourcent', 'Regardé (%)', 'Durée moyenne ÷ durée de la vidéo'],
  ['likes', 'J’aime'],
  ['commentaires', 'Commentaires'],
  ['partages', 'Partages'],
];

export function ChampsChiffres({
  valeur,
  onChange,
}: {
  valeur: Chiffres;
  onChange: (c: Chiffres) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {CHAMPS.map(([k, l, aide]) => (
        <Field key={k} label={l} {...(aide ? { aide } : {})}>
          <Input
            inputMode="numeric"
            value={valeur[k]}
            onChange={(e) => onChange({ ...valeur, [k]: e.target.value })}
          />
        </Field>
      ))}
    </div>
  );
}
