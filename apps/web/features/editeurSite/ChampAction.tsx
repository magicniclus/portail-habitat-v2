'use client';

import { LIBELLES_ACTION, TYPES_ACTION, type Action, type PageSite } from '@ph/core/sites';
import { Field, Input, Select } from '@ph/ui';

/** Réglage d'une action (bouton, image, lien du menu) ; l'erreur vient de `validerAction`. */
export function ChampAction({
  action,
  onChange,
  pages,
  erreur,
  libelle = 'Au clic',
}: {
  action: Action;
  onChange: (a: Action) => void;
  pages: Record<string, PageSite>;
  erreur: string | null;
  libelle?: string;
}) {
  const champ = (cle: keyof Action, label: string, type = 'text') => (
    <Field label={label}>
      <Input
        type={type}
        value={(action[cle] as string | undefined) ?? ''}
        onChange={(e) => onChange({ ...action, [cle]: e.target.value })}
      />
    </Field>
  );
  return (
    <div className="grid gap-3">
      <Field label={libelle} erreur={erreur ?? undefined}>
        <Select
          value={action.type}
          onChange={(e) => onChange({ type: e.target.value as Action['type'] })}
        >
          {TYPES_ACTION.filter((t) => t !== 'fichier').map((t) => (
            <option key={t} value={t}>
              {LIBELLES_ACTION[t]}
            </option>
          ))}
        </Select>
      </Field>
      {action.type === 'page' ? (
        <Field label="Page">
          <Select
            value={action.page ?? ''}
            onChange={(e) => onChange({ ...action, page: e.target.value })}
          >
            <option value="">Choisir…</option>
            {Object.entries(pages).map(([id, p]) => (
              <option key={id} value={id}>
                {p.nom}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}
      {action.type === 'ancre' ? champ('ancre', 'Ancre de la section (ID)') : null}
      {action.type === 'url' ? champ('url', 'Adresse (https://…)', 'url') : null}
      {['tel', 'sms', 'whatsapp'].includes(action.type) ? champ('tel', 'Numéro', 'tel') : null}
      {action.type === 'email' ? champ('email', 'Adresse email', 'email') : null}
    </div>
  );
}
