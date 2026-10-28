'use client';

import { controlesSeo, libelleScoreSeo, type PageSite } from '@ph/core/sites';
import { Button } from '@ph/ui';
import { apercuGoogle } from '@ph/ui/tokens';
import { useState } from 'react';
import { Onglets } from './Onglets';

const AUTOMATIQUE = [
  'Plan du site (sitemap.xml) et robots.txt à jour à chaque publication',
  'Adresse canonique sur chaque page',
  'Données structurées de votre entreprise',
  'Site sécurisé (HTTPS) et adapté au mobile',
  'Images en WebP avec texte alternatif',
];

const enSlug = (t: string) =>
  t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+/, '')
    .slice(0, 80);

/**
 * Référencement (maquette) : « Cette page » (aperçu Google, titre, description, adresse,
 * mot-clé, vérifications) et « Tout le site » (ce qui est automatique, score de chaque page).
 * Les réécritures passent par l'assistant IA (mode référencement), jamais publiées par lui.
 */
export function PanneauSeo({
  page,
  pageId,
  pages,
  ville,
  hote,
  onChange,
  onIa,
  onPage,
}: {
  page: PageSite;
  pageId: string;
  pages: Record<string, PageSite>;
  ville?: string;
  hote: string;
  onChange: (p: Partial<PageSite>) => void;
  onIa: (portee: 'page' | 'site') => void;
  onPage: (id: string) => void;
}) {
  const [onglet, setOnglet] = useState<'page' | 'site'>('page');
  const villeDe = (p: PageSite) => (p.type === 'mentions' ? undefined : ville);
  const { controles, score } = controlesSeo(page, villeDe(page));
  const maj = (p: Partial<PageSite['seo']>) => onChange({ seo: { ...page.seo, ...p } });
  const pris = (slug: string) =>
    Object.entries(pages).some(([id, p]) => id !== pageId && p.slug === slug);
  const [erreurSlug, setErreurSlug] = useState(false);
  const champ = 'min-h-11 min-w-0 rounded-[8px] border border-trait px-3 text-base font-normal';
  return (
    <div className="grid gap-3.5">
      <Onglets
        libelle="Référencement"
        valeur={onglet}
        options={[
          ['page', 'Cette page'],
          ['site', 'Tout le site'],
        ]}
        onChange={setOnglet}
      />
      {onglet === 'page' ? (
        <>
          <div className="grid gap-[3px] rounded-[10px] border border-trait px-3.5 py-3 font-[Arial,sans-serif]">
            <span className="text-[11px] text-neutre-600">Aperçu dans Google</span>
            <span className="truncate text-xs" style={{ color: apercuGoogle.url }}>
              {hote}/{page.slug}
            </span>
            <span className="text-[17px] leading-[22px]" style={{ color: apercuGoogle.titre }}>
              {page.seo.title || page.nom}
            </span>
            <span className="text-[13px] leading-[19px]" style={{ color: apercuGoogle.texte }}>
              {page.seo.meta || 'Ajoutez une description.'}
            </span>
          </div>
          <label className="grid gap-1 text-[13px] font-bold text-neutre-800">
            <span className="flex justify-between">
              Titre de la page
              <span className="font-semibold text-neutre-600">{page.seo.title.length} / 60</span>
            </span>
            <input
              value={page.seo.title}
              maxLength={120}
              onChange={(e) => maj({ title: e.target.value })}
              className={champ}
            />
          </label>
          <label className="grid gap-1 text-[13px] font-bold text-neutre-800">
            <span className="flex justify-between">
              Méta-description
              <span className="font-semibold text-neutre-600">{page.seo.meta.length} / 155</span>
            </span>
            <textarea
              rows={4}
              value={page.seo.meta}
              maxLength={320}
              onChange={(e) => maj({ meta: e.target.value })}
              className={`${champ} py-2`}
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="grid gap-1 text-[13px] font-bold text-neutre-800">
              Adresse
              <input
                value={page.slug}
                disabled={pageId === 'accueil'}
                onChange={(e) => {
                  const slug = enSlug(e.target.value);
                  setErreurSlug(pris(slug));
                  if (!pris(slug)) onChange({ slug });
                }}
                className={champ}
              />
            </label>
            <label className="grid gap-1 text-[13px] font-bold text-neutre-800">
              Mot-clé
              <input
                value={page.seo.motCle}
                maxLength={80}
                onChange={(e) => maj({ motCle: e.target.value })}
                className={champ}
              />
            </label>
          </div>
          {erreurSlug ? (
            <p role="alert" className="m-0 text-xs font-semibold text-danger">
              Cette adresse est déjà prise par une autre page.
            </p>
          ) : null}
          <Button onClick={() => onIa('page')}>Régénérer avec l’IA</Button>
          <div className="grid gap-1.5">
            <strong className="flex justify-between text-[13px]">
              Vérifications
              <span>
                {score}/100 · {libelleScoreSeo(score).libelle}
              </span>
            </strong>
            <ul className="m-0 grid list-none gap-1 p-0 text-[13px]">
              {controles.map((c) => (
                <li key={c.cle} className="flex gap-2">
                  <span aria-hidden="true" className={c.ok ? 'text-succes' : 'text-danger'}>
                    {c.ok ? '✓' : '!'}
                  </span>
                  <span>
                    {c.libelle}
                    <span className="sr-only">{c.ok ? ' : correct' : ' : à corriger'}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : (
        <>
          <div className="grid gap-1.5">
            <strong className="text-[13px]">Automatique</strong>
            <ul className="m-0 grid list-none gap-1 p-0 text-[13px]">
              {AUTOMATIQUE.map((t) => (
                <li key={t} className="flex gap-2">
                  <span aria-hidden="true" className="text-succes">
                    ✓
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <ul className="m-0 grid list-none gap-1 p-0">
            {Object.entries(pages)
              .sort(([, a], [, b]) => a.ordre - b.ordre)
              .map(([id, p]) => {
                const s = controlesSeo(p, villeDe(p)).score;
                return (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() => {
                        onPage(id);
                        setOnglet('page');
                      }}
                      className="flex min-h-11 w-full items-center justify-between gap-2 rounded-[8px] px-2 text-left text-sm hover:bg-neutre-100"
                    >
                      <span className="truncate font-semibold">{p.nom}</span>
                      <span
                        className={s >= 80 ? 'font-bold text-succes' : 'font-bold text-neutre-800'}
                      >
                        {s}/100
                      </span>
                    </button>
                  </li>
                );
              })}
          </ul>
          <Button onClick={() => onIa('site')}>Optimiser toutes les pages</Button>
        </>
      )}
    </div>
  );
}
