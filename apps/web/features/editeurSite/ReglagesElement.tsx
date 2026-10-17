'use client';

import {
  APPAREILS,
  LIBELLES_ELEMENT,
  type Action,
  type Element,
  type PageSite,
} from '@ph/core/sites';
import { Checkbox, Field, Input, Select, Textarea } from '@ph/ui';
import { ChampAction } from './ChampAction';
import { TexteLie } from './TexteLie';

const NOMS_APPAREIL = { desktop: 'ordinateur', tablet: 'tablette', mobile: 'mobile' } as const;
const AVEC_TEXTE_MOBILE = new Set(['titre', 'surtitre', 'texte', 'bouton']);

/**
 * Réglages de l'élément sélectionné (onglet Général) : contenu selon le type, masquage par appareil
 * et texte différent sur mobile (SITE-02 : sans effet sur l'ordinateur).
 */
export function ReglagesElement({
  el,
  onChange,
  pages,
  medias,
  erreurAction,
  categoriesBlog = [],
}: {
  el: Element;
  onChange: (p: Record<string, unknown>) => void;
  pages: Record<string, PageSite>;
  medias: Record<string, string>;
  erreurAction: (a: Action) => string | null;
  /** Catégories du blog, pour l'élément « Articles du blog ». */
  categoriesBlog?: { id: string; nom: string }[];
}) {
  const p = el.p as Record<string, unknown>;
  const texte = (cle: string, label: string, long = false) => (
    <Field label={label}>
      {long ? (
        <Textarea
          value={String(p[cle] ?? '')}
          onChange={(e) => onChange({ [cle]: e.target.value })}
        />
      ) : (
        <Input value={String(p[cle] ?? '')} onChange={(e) => onChange({ [cle]: e.target.value })} />
      )}
    </Field>
  );
  const action = (a: Action) => (
    <ChampAction
      action={a}
      onChange={(x) => onChange({ action: x })}
      pages={pages}
      erreur={erreurAction(a)}
    />
  );
  return (
    <div className="grid gap-4">
      <h3 className="m-0 text-lg">{LIBELLES_ELEMENT[el.type]}</h3>
      {el.type === 'titre' || el.type === 'texte' ? (
        <TexteLie
          texte={el.p.texte}
          {...(el.p.liens ? { liens: el.p.liens } : {})}
          onChange={onChange}
          pages={pages}
          erreurAction={erreurAction}
        />
      ) : null}
      {el.type === 'titre' ? (
        <>
          <Field label="Niveau">
            <Select value={el.p.niveau} onChange={(e) => onChange({ niveau: e.target.value })}>
              <option value="h1">Titre principal (H1)</option>
              <option value="h2">Titre de section (H2)</option>
              <option value="h3">Sous-titre (H3)</option>
            </Select>
          </Field>
        </>
      ) : null}
      {el.type === 'surtitre' ? texte('texte', 'Texte') : null}
      {el.type === 'bouton' ? (
        <>
          {texte('texte', 'Libellé')}
          {action(el.p.action)}
        </>
      ) : null}
      {el.type === 'image' ? (
        <>
          <Field label="Photo" aide="Photos de vos réalisations publiées.">
            <Select value={el.p.src} onChange={(e) => onChange({ src: e.target.value })}>
              <option value="">Aucune</option>
              {Object.keys(medias).map((m, i) => (
                <option key={m} value={m}>
                  Photo {i + 1}
                </option>
              ))}
            </Select>
          </Field>
          {texte('legende', 'Texte alternatif (décrit la photo)')}
          {action(el.p.action)}
        </>
      ) : null}
      {el.type === 'liste' ? (
        <Field label="Éléments" aide="Un par ligne.">
          <Textarea
            value={el.p.items.join('\n')}
            onChange={(e) => onChange({ items: e.target.value.split('\n').slice(0, 30) })}
          />
        </Field>
      ) : null}
      {el.type === 'avis' ? (
        <>
          {texte('nom', 'Nom du client')}
          {texte('texte', 'Avis', true)}
        </>
      ) : null}
      {el.type === 'chiffre' ? (
        <>
          {texte('valeur', 'Valeur')}
          {texte('label', 'Libellé')}
        </>
      ) : null}
      {el.type === 'formulaire' ? texte('bouton', 'Bouton d’envoi') : null}
      {el.type === 'video' ? texte('url', 'Adresse YouTube') : null}
      {el.type === 'carte' ? texte('adresse', 'Adresse') : null}
      {el.type === 'logo' ? texte('texte', 'Nom affiché') : null}
      {el.type === 'blog' ? (
        <>
          <Field label="Affichage">
            <Select
              value={el.p.affichage}
              onChange={(e) => onChange({ affichage: e.target.value })}
            >
              <option value="grille">Grille</option>
              <option value="liste">Liste</option>
              <option value="une">À la une</option>
            </Select>
          </Field>
          <Field label="Nombre d’articles">
            <Select
              value={String(el.p.nb)}
              onChange={(e) => onChange({ nb: Number(e.target.value) })}
            >
              {[3, 6, 9].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Catégorie">
            <Select value={el.p.cat} onChange={(e) => onChange({ cat: e.target.value })}>
              <option value="">Toutes</option>
              {categoriesBlog.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom}
                </option>
              ))}
            </Select>
          </Field>
          <Checkbox
            checked={el.p.extrait}
            onChange={(e) => onChange({ extrait: e.target.checked })}
          >
            Afficher le résumé
          </Checkbox>
        </>
      ) : null}
      {AVEC_TEXTE_MOBILE.has(el.type) ? (
        <div className="grid gap-2">
          <Checkbox
            checked={el.p.texteMobileOn === true}
            onChange={(e) => onChange({ texteMobileOn: e.target.checked })}
          >
            Texte différent sur mobile
          </Checkbox>
          {el.p.texteMobileOn ? texte('texteMobile', 'Texte sur mobile', true) : null}
        </div>
      ) : null}
      <fieldset className="m-0 grid gap-2 border-0 p-0">
        <legend className="mb-1 font-semibold">Masquer sur</legend>
        {APPAREILS.map((a) => (
          <Checkbox
            key={a}
            checked={el.p.masque[a]}
            onChange={(e) => onChange({ masque: { ...el.p.masque, [a]: e.target.checked } })}
          >
            {NOMS_APPAREIL[a]}
          </Checkbox>
        ))}
      </fieldset>
    </div>
  );
}
