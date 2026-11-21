'use client';

import { STYLES_TEXTE, type Calque } from '@ph/core/studio';
import { Checkbox, Field, Input, Select, Textarea } from '@ph/ui';

const LIBELLES_STYLE: Record<(typeof STYLES_TEXTE)[number], string> = {
  accroche: 'Accroche (très gros)',
  titre: 'Titre',
  chiffre: 'Chiffre',
  note: 'Petite note',
};
const ent = (v: string) => Math.max(0, Math.round(Number(v)) || 0);

/** Contenu propre à chaque type d'animation (texte, chiffre animé, notification, liste, barre). */
export function ChampsCalque({
  calque: c,
  onChange,
}: {
  calque: Calque;
  onChange: (champs: Partial<Calque>) => void;
}) {
  return (
    <>
      {c.type === 'texte' ? (
        <>
          <Field label="Texte">
            <Input
              value={c.texte}
              maxLength={80}
              onChange={(e) => onChange({ texte: e.target.value })}
            />
          </Field>
          <Field label="Style">
            <Select
              value={c.style}
              onChange={(e) => onChange({ style: e.target.value as typeof c.style })}
            >
              {STYLES_TEXTE.map((s) => (
                <option key={s} value={s}>
                  {LIBELLES_STYLE[s]}
                </option>
              ))}
            </Select>
          </Field>
        </>
      ) : null}
      {c.type === 'compteur' ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Field label="De">
              <Input
                inputMode="numeric"
                value={String(c.euros ? c.de / 100 : c.de)}
                onChange={(e) =>
                  onChange({ de: c.euros ? ent(e.target.value) * 100 : ent(e.target.value) })
                }
              />
            </Field>
            <Field label="À">
              <Input
                inputMode="numeric"
                value={String(c.euros ? c.a / 100 : c.a)}
                onChange={(e) =>
                  onChange({ a: c.euros ? ent(e.target.value) * 100 : ent(e.target.value) })
                }
              />
            </Field>
          </div>
          <Checkbox
            checked={Boolean(c.euros)}
            onChange={(e) =>
              onChange({
                euros: e.target.checked,
                de: e.target.checked ? c.de * 100 : Math.round(c.de / 100),
                a: e.target.checked ? c.a * 100 : Math.round(c.a / 100),
              })
            }
          >
            Montant en euros
          </Checkbox>
          <Field label="Texte sous le chiffre">
            <Input
              value={c.libelle}
              maxLength={80}
              onChange={(e) => onChange({ libelle: e.target.value })}
            />
          </Field>
        </>
      ) : null}
      {c.type === 'notification' ? (
        <>
          <Field label="Titre">
            <Input
              value={c.titre}
              maxLength={80}
              onChange={(e) => onChange({ titre: e.target.value })}
            />
          </Field>
          <Field label="Message">
            <Input
              value={c.texte}
              maxLength={120}
              onChange={(e) => onChange({ texte: e.target.value })}
            />
          </Field>
        </>
      ) : null}
      {c.type === 'liste' ? (
        <Field label="Éléments (un par ligne, 5 au plus)">
          <Textarea
            rows={4}
            value={c.elements.join('\n')}
            onChange={(e) => {
              const elements = e.target.value
                .split('\n')
                .map((x) => x.slice(0, 80))
                .slice(0, 5);
              onChange({ elements: elements.length ? elements : [''] });
            }}
          />
        </Field>
      ) : null}
      {c.type === 'barre' ? (
        <>
          <Field label="Texte">
            <Input
              value={c.libelle}
              maxLength={80}
              onChange={(e) => onChange({ libelle: e.target.value })}
            />
          </Field>
          <Field label={`Valeur : ${c.valeur} %`}>
            <input
              type="range"
              min={0}
              max={100}
              value={c.valeur}
              onChange={(e) => onChange({ valeur: Number(e.target.value) })}
              className="min-h-11 w-full"
            />
          </Field>
        </>
      ) : null}
    </>
  );
}
