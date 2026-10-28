'use client';

import {
  ajouterLigne,
  DISPOSITIONS,
  insererCopieSection,
  insererDans,
  insererSectionPrete,
  LIBELLES_ELEMENT,
  SECTIONS_PRETES,
  trouverNoeud,
  type Bloc,
  type Ligne,
  type PageSite,
  type Palette,
  type Section,
  type TypeElement,
} from '@ph/core/sites';
import { cn } from '@ph/ui';
import { niveauxEditeur } from '@ph/ui/tokens';
import { ICONES_ELEMENT } from '../icones';
import { MesSections } from '../MesSections';
import { Onglets } from './Onglets';
import { Vignette } from './Vignette';

export type OngletAjout = 'zones' | 'sections' | 'contenus';
const nouvelId = () => Math.random().toString(36).slice(2, 10);
const carte =
  'flex min-h-11 w-full items-center gap-3 rounded-[10px] border border-trait bg-blanc p-2 text-left hover:border-accent-300 hover:bg-accent-100';

/**
 * Ajouter (maquette) : Zones (Mes zones enregistrées et les 12 zones prêtes, sous la zone
 * sélectionnée), Sections (8 dispositions de blocs, dans la zone sélectionnée) et Contenus (16
 * types, dans le bloc sélectionné).
 */
export function PanneauAjout({
  page,
  selection,
  onglet,
  onOnglet,
  onPage,
  palette,
}: {
  page: PageSite;
  /** Couleurs du site, pour les vignettes des zones. */
  palette: Palette;
  selection: string | null;
  onglet: OngletAjout;
  onOnglet: (o: OngletAjout) => void;
  /** Nouvelle page et ce qu'il faut sélectionner ensuite. */
  onPage: (p: PageSite, selection: string | null) => void;
}) {
  const f = selection && selection !== 'nav' ? trouverNoeud(page, selection) : null;
  const z = f?.chaine[0] as Section | undefined;
  const l = f?.chaine[1] as Ligne | undefined;
  const b = f?.chaine[2] as Bloc | undefined;
  const zoneNom = z?.p.nom ?? '';
  const lieu = [
    b && l ? `Bloc ${l.cols.indexOf(b) + 1}` : '',
    l && z ? `Section ${z.rows.indexOf(l) + 1}` : '',
    zoneNom,
  ]
    .filter(Boolean)
    .join(' · ');
  const contexte =
    onglet === 'zones'
      ? z
        ? `Zone ajoutée sous « ${zoneNom} ».`
        : 'Zone ajoutée en bas de la page.'
      : onglet === 'sections'
        ? z
          ? `Section ajoutée dans la zone « ${zoneNom} ».`
          : 'Rien de sélectionné : la section part dans une nouvelle zone en bas de la page.'
        : f
          ? `Ajouté dans : ${lieu}`
          : 'Rien de sélectionné : le contenu part dans une nouvelle zone en bas de la page.';
  const ajouterZone = (cle: string) => {
    const r = insererSectionPrete(page, cle, z?.id ?? null, nouvelId);
    if (r) onPage(r.page, r.id);
  };
  const ajouterSection = (largeurs: readonly number[]) => {
    const r = ajouterLigne(page, selection === 'nav' ? null : selection, largeurs, nouvelId);
    if (r) onPage(r.page, r.id);
  };
  const ajouterContenu = (t: TypeElement) => {
    const r = insererDans(page, selection === 'nav' ? null : selection, t, nouvelId);
    if (r) onPage(r.page, r.id);
  };
  return (
    <div className="grid gap-3">
      <Onglets
        libelle="Que voulez-vous ajouter ?"
        valeur={onglet}
        options={[
          ['zones', 'Zones'],
          ['sections', 'Sections'],
          ['contenus', 'Contenus'],
        ]}
        onChange={onOnglet}
      />
      <p className="m-0 text-[13px] leading-[18px] text-neutre-700">{contexte}</p>
      {onglet === 'zones' ? (
        <div className="grid gap-2">
          <MesSections
            carte={carte}
            onInserer={(x) =>
              onPage(insererCopieSection(page, x.section, z?.id ?? null, nouvelId), null)
            }
          />
          {SECTIONS_PRETES.map((s) => (
            <button key={s.cle} type="button" className={carte} onClick={() => ajouterZone(s.cle)}>
              <Vignette fond={s.vignette.fond} largeurs={s.vignette.largeurs} palette={palette} />
              <span className="grid gap-0.5">
                <span className="text-sm font-bold">{s.nom}</span>
                <span className="text-xs text-neutre-700">{s.description}</span>
              </span>
            </button>
          ))}
        </div>
      ) : null}
      {onglet === 'sections' ? (
        <div className="grid grid-cols-2 gap-2">
          {DISPOSITIONS.map((d) => (
            <button
              key={d.cle}
              type="button"
              disabled={!z}
              onClick={() => ajouterSection(d.largeurs)}
              className="grid min-h-11 gap-2 rounded-[10px] border border-trait bg-blanc p-2.5 hover:border-[color:var(--c)] disabled:opacity-50"
              style={{ ['--c' as string]: niveauxEditeur.section }}
            >
              <span aria-hidden="true" className="flex h-[26px] gap-[3px]">
                {d.largeurs.map((w, i) => (
                  <span
                    key={i}
                    className="rounded-[3px] border"
                    style={{
                      flex: w,
                      borderColor: niveauxEditeur.section,
                      background: `${niveauxEditeur.section}2e`,
                    }}
                  />
                ))}
              </span>
              <span className="text-[13px] font-semibold">{d.libelle}</span>
            </button>
          ))}
        </div>
      ) : null}
      {onglet === 'contenus' ? (
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(LIBELLES_ELEMENT) as TypeElement[]).map((t) => {
            const I = ICONES_ELEMENT[t];
            return (
              <button
                key={t}
                type="button"
                onClick={() => ajouterContenu(t)}
                className={cn(
                  'grid min-h-11 justify-items-center gap-1.5 rounded-[10px] border border-trait bg-blanc px-1 pt-3 pb-2.5 text-neutre-800 hover:border-accent-300 hover:bg-accent-100',
                )}
              >
                <I size={20} aria-hidden="true" />
                <span className="text-center text-xs font-semibold">{LIBELLES_ELEMENT[t]}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
