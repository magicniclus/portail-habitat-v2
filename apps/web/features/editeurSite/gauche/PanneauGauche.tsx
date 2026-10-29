'use client';

import {
  deplacerNoeud,
  insererSectionPrete,
  type ModeIaSite,
  type OperationIa,
  type PageSite,
} from '@ph/core/sites';
import { XIcon } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import { TITRES_PANNEAU, type Panneau } from '../BarreEditeur';
import { PanneauIa } from '../PanneauIa';
import { PanneauModeles } from '../PanneauModeles';
import { PanneauVersions } from '../PanneauVersions';
import { suggestionsIa } from '../ia/suggestionsIa';
import { infoSelection } from '../selection';
import type { ProprietesEditeur } from '../proprietes';
import type { useBrouillonSite } from '../useBrouillonSite';
import { PanneauAjout, type OngletAjout } from './PanneauAjout';
import { PanneauPages } from './PanneauPages';
import { PanneauSeo } from './PanneauSeo';
import { PanneauStructure } from './PanneauStructure';
import { PanneauStyles } from './PanneauStyles';
import { nouvelId } from '../ids';

export interface DemandeIa {
  mode: ModeIaSite;
  portee: 'selection' | 'page' | 'site';
  demande: string;
  /** Change à chaque demande : le panneau IA repart de zéro. */
  n: number;
}

/** Panneau de gauche ouvert depuis le rail : titre, fermeture, contenu de l'outil. */
export function PanneauGauche(p: {
  panneau: Panneau;
  onFermer: () => void;
  s: ReturnType<typeof useBrouillonSite>;
  props: ProprietesEditeur;
  pageId: string;
  page: PageSite;
  selection: string | null;
  onChoisir: (id: string, amener?: boolean) => void;
  onPageId: (id: string) => void;
  majPage: (f: (p: PageSite) => PageSite) => void;
  ongletAjout: OngletAjout;
  onOngletAjout: (o: OngletAjout) => void;
  ia: DemandeIa | null;
  onIa: (d: Omit<DemandeIa, 'n'>) => void;
  onPanneau: (x: Panneau) => void;
  onProposition: (ops: OperationIa[] | null) => void;
  flash: (m: string) => void;
  appareil: Parameters<typeof PanneauStructure>[0]['appareil'];
}) {
  const { s, page, pageId } = p;
  const nomSel =
    p.selection && p.selection !== 'nav' ? infoSelection(page, p.selection)?.nom : undefined;
  let contenu: ReactNode = null;
  if (p.panneau === 'structure')
    contenu = (
      <PanneauStructure
        page={page}
        selection={p.selection}
        appareil={p.appareil}
        onChoisir={(id) => p.onChoisir(id, true)}
        navigationMasquee={Boolean(s.b.navigation.masquee)}
        onDeplacer={(id, cible, position) => {
          const r = deplacerNoeud(page, id, cible, position);
          if (!r) return p.flash('Impossible de déposer ici.');
          p.majPage(() => r);
          p.onChoisir(id);
          p.flash('Déplacé · Ctrl+Z pour annuler');
        }}
      />
    );
  if (p.panneau === 'ajouter')
    contenu = (
      <PanneauAjout
        page={page}
        selection={p.selection}
        onglet={p.ongletAjout}
        onOnglet={p.onOngletAjout}
        onPage={(n, sel) => {
          p.majPage(() => n);
          if (sel) p.onChoisir(sel, true);
        }}
        palette={s.b.theme.palette}
      />
    );
  if (p.panneau === 'pages')
    contenu = (
      <PanneauPages
        pages={s.b.pages}
        pageId={pageId}
        onChoisir={p.onPageId}
        onAjouter={(nom, vierge) => p.onPageId(s.ajouterPage(nom, vierge))}
        onGenerer={(d) =>
          p.onIa({ mode: 'page', portee: 'site', demande: `Crée une page « ${d} »` })
        }
        onSupprimer={(id) => {
          s.supprimerPage(id);
          p.onPageId('accueil');
        }}
        onRegler={(id, r) =>
          s.modifier((b) => ({ ...b, pages: { ...b.pages, [id]: { ...b.pages[id]!, ...r } } }))
        }
        onSeo={(id) => {
          p.onPageId(id);
          p.onPanneau('seo');
        }}
      />
    );
  if (p.panneau === 'seo')
    contenu = (
      <PanneauSeo
        page={page}
        pageId={pageId}
        pages={s.b.pages}
        hote={p.props.hote}
        nomSite={s.b.navigation.nom}
        {...(p.props.ville ? { ville: p.props.ville } : {})}
        onChange={(r) => p.majPage((x) => ({ ...x, ...r }))}
        onIa={(portee) =>
          p.onIa({
            mode: 'seo',
            portee,
            demande:
              portee === 'site'
                ? 'Optimise les titres et descriptions de toutes les pages.'
                : 'Améliore le titre et la description de cette page.',
          })
        }
        onPage={p.onPageId}
      />
    );
  if (p.panneau === 'styles')
    contenu = (
      <PanneauStyles theme={s.b.theme} onChange={(t) => s.modifier((b) => ({ ...b, theme: t }))} />
    );
  if (p.panneau === 'modeles') contenu = <PanneauModeles site={s.b} onRestaurer={s.restaurer} />;
  if (p.panneau === 'versions')
    contenu = (
      <PanneauVersions
        versions={p.props.versions}
        {...(p.props.versionPubliee ? { enLigne: p.props.versionPubliee } : {})}
        // Pages de la version à la place des mêmes pages ; celles jamais publiées restent.
        onReprendre={(v) => s.restaurer({ ...v, pages: { ...s.b.pages, ...v.pages } })}
        flash={p.flash}
      />
    );
  if (p.panneau === 'ia')
    contenu = (
      <PanneauIa
        key={p.ia?.n ?? 0}
        pageId={pageId}
        selection={p.selection === 'nav' ? null : p.selection}
        iaComplete={p.props.iaComplete}
        restantsInitiaux={p.props.restantsIa}
        enregistrer={s.enregistrer}
        appliquer={s.appliquerIa}
        onProposition={p.onProposition}
        {...(p.ia ? { initial: p.ia } : {})}
        {...(nomSel ? { nomSelection: nomSel } : {})}
        suggestions={suggestionsIa(page, {
          ...(p.props.ville ? { ville: p.props.ville } : {}),
          ajouterZone: (cle, ou) => {
            // En fin de page, la zone passe avant le pied de page.
            const pied = page.sections.findIndex((x) => x.p.nom === 'Pied de page');
            const apres =
              ou === 'debut'
                ? (page.sections[0]?.id ?? null)
                : pied > 0
                  ? page.sections[pied - 1]!.id
                  : null;
            const r = insererSectionPrete(page, cle, apres, nouvelId);
            if (!r) return;
            p.majPage(() => r.page);
            p.onChoisir(r.id, true);
            p.flash('Zone ajoutée · Ctrl+Z pour annuler');
          },
          pageLocale: (ville) =>
            p.onIa({
              mode: 'page',
              portee: 'site',
              demande: `Crée une page locale pour ${ville} : mes travaux, la zone desservie et un appel à demander un devis.`,
            }),
          referencement: () => p.onPanneau('seo'),
        })}
      />
    );
  return (
    <aside
      aria-label={TITRES_PANNEAU[p.panneau]}
      className="grid min-w-0 auto-rows-max content-start gap-3.5 overflow-x-hidden overflow-y-auto border-trait bg-blanc px-3.5 pt-4 pb-8 [grid-template-columns:minmax(0,1fr)] min-[900px]:h-full min-[900px]:w-[300px] min-[900px]:border-r"
    >
      <span className="flex items-center justify-between">
        <h2 className="m-0 text-base font-bold">{TITRES_PANNEAU[p.panneau]}</h2>
        <button
          type="button"
          onClick={p.onFermer}
          aria-label="Fermer le panneau"
          className="grid size-11 place-items-center rounded-[8px] text-neutre-700 hover:bg-neutre-100"
        >
          <XIcon size={18} aria-hidden="true" />
        </button>
      </span>
      {contenu}
    </aside>
  );
}
