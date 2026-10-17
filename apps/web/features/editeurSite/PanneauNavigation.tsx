'use client';

import type { Action, Navigation, PageSite } from '@ph/core/sites';
import { Banner, Button, Checkbox, Field, Input } from '@ph/ui';
import { ChampAction } from './ChampAction';

/**
 * Navigation globale (SITE-11) : une seule pour tout le site, enregistrée à part avec son propre
 * bouton ; état « non enregistrée » tant qu'elle diffère de la version enregistrée.
 */
export function PanneauNavigation({
  nav,
  pages,
  onChange,
  nonEnregistree,
  onEnregistrer,
  enCours,
  erreurAction,
}: {
  nav: Navigation;
  pages: Record<string, PageSite>;
  onChange: (n: Navigation) => void;
  nonEnregistree: boolean;
  onEnregistrer: () => void;
  enCours: boolean;
  erreurAction: (a: Action) => string | null;
}) {
  const majLien = (i: number, l: Partial<Navigation['liens'][number]>) =>
    onChange({ ...nav, liens: nav.liens.map((x, j) => (j === i ? { ...x, ...l } : x)) });
  return (
    <div className="grid gap-4">
      {nonEnregistree ? <Banner tone="attention">Navigation non enregistrée.</Banner> : null}
      <Field label="Nom affiché">
        <Input
          value={nav.nom}
          maxLength={120}
          onChange={(e) => onChange({ ...nav, nom: e.target.value })}
        />
      </Field>
      <fieldset className="m-0 grid gap-3 border-0 p-0">
        <legend className="mb-1 font-semibold">Liens du menu</legend>
        {nav.liens.map((l, i) => (
          <div key={l.id} className="grid gap-2 rounded-[12px] border border-trait p-3">
            <Field label={`Lien ${i + 1}`}>
              <Input
                value={l.label}
                maxLength={40}
                onChange={(e) => majLien(i, { label: e.target.value })}
              />
            </Field>
            <ChampAction
              action={l.action}
              onChange={(a) => majLien(i, { action: a })}
              pages={pages}
              erreur={erreurAction(l.action)}
            />
            <Button
              variant="fantome"
              taille="sm"
              onClick={() => onChange({ ...nav, liens: nav.liens.filter((_, j) => j !== i) })}
            >
              Retirer le lien
            </Button>
          </div>
        ))}
        <Button
          variant="secondaire"
          disabled={nav.liens.length >= 12}
          onClick={() =>
            onChange({
              ...nav,
              liens: [
                ...nav.liens,
                {
                  id: `l${Date.now().toString(36)}`,
                  label: 'Lien',
                  action: { type: 'page', page: 'accueil' },
                },
              ],
            })
          }
        >
          Ajouter un lien
        </Button>
      </fieldset>
      <Checkbox
        checked={nav.cta.visible}
        onChange={(e) => onChange({ ...nav, cta: { ...nav.cta, visible: e.target.checked } })}
      >
        Bouton devis
      </Checkbox>
      {nav.cta.visible ? (
        <>
          <Field label="Libellé du bouton">
            <Input
              value={nav.cta.texte}
              maxLength={40}
              onChange={(e) => onChange({ ...nav, cta: { ...nav.cta, texte: e.target.value } })}
            />
          </Field>
          <ChampAction
            action={nav.cta.action}
            onChange={(a) => onChange({ ...nav, cta: { ...nav.cta, action: a } })}
            pages={pages}
            erreur={erreurAction(nav.cta.action)}
          />
        </>
      ) : null}
      <Checkbox
        checked={nav.tel.visible}
        onChange={(e) => onChange({ ...nav, tel: { ...nav.tel, visible: e.target.checked } })}
      >
        Afficher le téléphone
      </Checkbox>
      {nav.tel.visible ? (
        <Field label="Téléphone">
          <Input
            type="tel"
            value={nav.tel.numero}
            maxLength={30}
            onChange={(e) => onChange({ ...nav, tel: { ...nav.tel, numero: e.target.value } })}
          />
        </Field>
      ) : null}
      <div>
        <Button onClick={onEnregistrer} disabled={enCours || !nonEnregistree}>
          Enregistrer la navigation
        </Button>
      </div>
    </div>
  );
}
