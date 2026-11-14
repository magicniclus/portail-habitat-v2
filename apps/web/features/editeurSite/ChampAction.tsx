'use client';

import type { Action } from '@ph/core/sites';
import { lienAction } from '@/features/siteArtisan/actions';
import { ChoixZone, sansAncre } from './action/ChoixZone';
import { depart } from './action/depart';
import { ChoixPopup } from './action/ChoixPopup';
import { TuilesAction } from './action/TuilesAction';
import { ImportImage } from './ImportImage';
import { Info, Interrupteur, Libelle, Segments } from './proprietes/controles';
import type { ContexteReglages } from './proprietes/contexte';

const champ = 'min-h-11 w-full rounded-[8px] border border-trait bg-blanc px-3 text-base';
const etiquette = 'grid gap-1.5 text-[13px] font-bold text-neutre-800';

/**
 * Action au clic d'un bouton, d'une image, d'un lien du menu ou d'un mot lié (maquette Editeur de
 * Site) : tuiles du type, puis ses réglages ; le lien obtenu et l'erreur éventuelle (même règle
 * qu'à la publication, SITE-09) s'affichent dessous.
 */
export function ChampAction({
  action: a,
  onChange,
  c,
  libelle = 'Action au clic',
}: {
  action: Action;
  onChange: (a: Action) => void;
  c: ContexteReglages;
  libelle?: string;
}) {
  const erreur = c.erreurAction(a);
  const maj = (r: Partial<Action>) => onChange({ ...a, ...r });
  const texte = (cle: 'url' | 'tel' | 'email' | 'objet' | 'message', l: string, type = 'text') => (
    <label className={etiquette}>
      {l}
      {cle === 'message' ? (
        <textarea
          value={a.message ?? ''}
          maxLength={500}
          rows={3}
          onChange={(e) => maj({ message: e.target.value })}
          className={`${champ} py-2`}
        />
      ) : (
        <input
          type={type}
          value={a[cle] ?? ''}
          onChange={(e) => maj({ [cle]: e.target.value })}
          className={champ}
          {...(type === 'url' ? { placeholder: 'https://' } : {})}
        />
      )}
    </label>
  );
  const lien = lienAction(a, { pages: c.pages, media: (k) => c.fichiers[k]?.url ?? null });

  return (
    <div className="grid gap-3 [grid-template-columns:minmax(0,1fr)]">
      <Libelle texte={libelle} />
      <TuilesAction libelle={libelle} valeur={a.type} onChange={(t) => onChange(depart(t, c))} />
      {a.type === 'page' ? (
        <>
          <label className={etiquette}>
            Page
            <select
              value={a.page ?? ''}
              onChange={(e) => onChange({ ...sansAncre(a), page: e.target.value })}
              className={champ}
            >
              <option value="">Choisir…</option>
              {Object.entries(c.pages).map(([id, p]) => (
                <option key={id} value={id}>
                  {p.nom}
                  {p.statut === 'brouillon' ? ' (brouillon)' : ''}
                </option>
              ))}
            </select>
          </label>
          {a.page ? (
            <ChoixZone
              libelle="Arriver directement sur une zone"
              pageId={a.page}
              action={a}
              onChange={onChange}
              c={c}
              vide="Haut de la page"
            />
          ) : null}
          <Interrupteur
            libelle="Ouvrir dans un nouvel onglet"
            actif={Boolean(a.onglet)}
            onChange={(onglet) => maj({ onglet })}
          />
        </>
      ) : null}
      {a.type === 'ancre' ? (
        <ChoixZone
          libelle="Zone de la page"
          pageId={c.pageId}
          action={a}
          onChange={onChange}
          c={c}
          vide="Choisir une zone…"
        />
      ) : null}
      {a.type === 'url' ? (
        <>
          {texte('url', 'Adresse du site', 'url')}
          <Interrupteur
            libelle="Ouvrir dans un nouvel onglet"
            actif={a.onglet !== false}
            onChange={(onglet) => maj({ onglet })}
          />
          <Interrupteur
            libelle="Lien non suivi (nofollow)"
            aide="Conseillé pour un site qui n’est pas le vôtre : il ne profite pas de votre référencement."
            actif={a.nofollow !== false}
            onChange={(nofollow) => maj({ nofollow })}
          />
        </>
      ) : null}
      {a.type === 'tel' ? texte('tel', 'Numéro à appeler', 'tel') : null}
      {a.type === 'sms' || a.type === 'whatsapp' ? (
        <>
          {texte('tel', 'Numéro', 'tel')}
          {texte('message', 'Message prérempli (facultatif)')}
        </>
      ) : null}
      {a.type === 'email' ? (
        <>
          {texte('email', 'Adresse email', 'email')}
          {texte('objet', 'Objet (facultatif)')}
          {texte('message', 'Message prérempli (facultatif)')}
        </>
      ) : null}
      {a.type === 'formulaire' ? (
        <>
          <Segments
            libelle="Affichage"
            valeur={a.formulaire ?? 'defiler'}
            options={[
              ['defiler', 'Faire défiler'],
              ['popup', 'Fenêtre'],
            ]}
            onChange={(formulaire) => maj({ formulaire })}
          />
          <Info>Les demandes arrivent dans « Mes demandes ».</Info>
        </>
      ) : null}
      {a.type === 'fichier' ? (
        <>
          {Object.keys(c.fichiers).length ? (
            <label className={etiquette}>
              Fichier à télécharger
              <select
                value={a.fichierId ?? ''}
                onChange={(e) => maj({ fichierId: e.target.value })}
                className={champ}
              >
                <option value="">Choisir…</option>
                {Object.entries(c.fichiers).map(([cle, f]) => (
                  <option key={cle} value={cle}>
                    {f.nom}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <ImportImage
            artisanId={c.artisanId}
            usage="fichier"
            onImportee={(cle, url, nom) => {
              c.onFichier(cle, nom, url);
              maj({ fichierId: cle });
            }}
          />
        </>
      ) : null}
      {a.type === 'popup' ? <ChoixPopup action={a} onChange={onChange} c={c} /> : null}
      {a.type === 'aucun' ? <Info>Rien ne se passe au clic.</Info> : null}
      {erreur ? (
        <p role="alert" className="m-0 text-[13px] font-semibold text-danger">
          {erreur}
        </p>
      ) : lien && a.type !== 'fichier' ? (
        <Info>
          Lien : <span className="break-all">{lien.href}</span>
        </Info>
      ) : null}
    </div>
  );
}
