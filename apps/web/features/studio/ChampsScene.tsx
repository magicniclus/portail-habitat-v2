'use client';

import { ENTREES, LIBELLES_ENTREE, type Calque, type EntreeAnimee } from '@ph/core/studio';
import { Field, Input, Select, Textarea } from '@ph/ui';

const lignesDe = (v: string, max: number) =>
  v
    .split('\n')
    .map((x) => x.slice(0, 80))
    .slice(0, max);

/**
 * Contenu des scènes animées (demandes, outils, tampon, avant / après, fin) et entrée animée
 * de tout élément.
 */
export function ChampsScene({
  calque: c,
  onChange,
}: {
  calque: Calque;
  onChange: (champs: Partial<Calque>) => void;
}) {
  return (
    <>
      {c.type === 'demandes' ? (
        <Field label="Demandes (une par ligne : travaux, ville ; 4 au plus)">
          <Textarea
            rows={4}
            value={c.elements.map((d) => `${d.titre}, ${d.ville}`).join('\n')}
            onChange={(e) => {
              const elements = lignesDe(e.target.value, 4).map((l) => {
                const [titre = '', ...ville] = l.split(',');
                return { titre: titre.trim() || ' ', ville: ville.join(',').trim() || ' ' };
              });
              onChange({ elements: elements.length ? elements : [{ titre: ' ', ville: ' ' }] });
            }}
          />
        </Field>
      ) : null}
      {c.type === 'outils' ? (
        <Field label="Tuiles (une par ligne, 2 à 6)">
          <Textarea
            rows={4}
            value={c.elements.join('\n')}
            onChange={(e) => {
              const elements = lignesDe(e.target.value, 6);
              onChange({
                elements: elements.length >= 2 ? elements : [...elements, ' ', ' '].slice(0, 2),
              });
            }}
          />
        </Field>
      ) : null}
      {c.type === 'tampon' ? (
        <Field label="Texte du tampon">
          <Input
            value={c.texte}
            maxLength={40}
            onChange={(e) => onChange({ texte: e.target.value })}
          />
        </Field>
      ) : null}
      {c.type === 'comparaison' ? (
        <>
          <Field label="Avant (barré)">
            <Input
              value={c.avant}
              maxLength={80}
              onChange={(e) => onChange({ avant: e.target.value })}
            />
          </Field>
          <Field label="Après">
            <Input
              value={c.apres}
              maxLength={80}
              onChange={(e) => onChange({ apres: e.target.value })}
            />
          </Field>
        </>
      ) : null}
      {c.type === 'fin' ? (
        <>
          <Field label="Phrase de fin">
            <Input
              value={c.titre}
              maxLength={80}
              onChange={(e) => onChange({ titre: e.target.value })}
            />
          </Field>
          <Field label="Bouton">
            <Input
              value={c.bouton}
              maxLength={40}
              onChange={(e) => onChange({ bouton: e.target.value })}
            />
          </Field>
        </>
      ) : null}
      <Field label="Entrée">
        <Select
          value={c.entree ?? ''}
          onChange={(e) =>
            onChange({ entree: (e.target.value || undefined) as EntreeAnimee | undefined })
          }
        >
          <option value="">Propre à l’élément</option>
          {ENTREES.map((x) => (
            <option key={x} value={x}>
              {LIBELLES_ENTREE[x]}
            </option>
          ))}
        </Select>
      </Field>
    </>
  );
}
