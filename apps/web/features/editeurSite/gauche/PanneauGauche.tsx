'use client';

import type { ModeIaSite, OperationIa, PageSite } from '@ph/core/sites';
import { XIcon } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import { TITRES_PANNEAU, type Panneau } from '../BarreEditeur';
import { PanneauIa } from '../PanneauIa';
import { PanneauModeles } from '../PanneauModeles';
import type { ProprietesEditeur } from '../proprietes';
import type { useBrouillonSite } from '../useBrouillonSite';
import { PanneauAjout, type OngletAjout } from './PanneauAjout';
import { PanneauPages } from './PanneauPages';
import { PanneauSeo } from './PanneauSeo';
import { PanneauStructure } from './PanneauStructure';
import { PanneauStyles } from './PanneauStyles';

export interface DemandeIa {
  mode: ModeIaSite;
  portee: 'page' | 'site';
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
  let contenu: ReactNode = null;
  if (p.panneau === 'structure')
    contenu = (
      <PanneauStructure
        page={page}
        selection={p.selection}
        appareil={p.appareil}
        onChoisir={(id) => p.onChoisir(id, true)}
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
        onMessage={p.flash}
      />
    );
  if (p.panneau === 'pages')
    contenu = (
      <PanneauPages
        pages={s.b.pages}
        pageId={pageId}
        onChoisir={p.onPageId}
        onAjouter={(nom) => p.onPageId(s.ajouterPage(nom))}
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
      />
    );
  return (
    <aside
      aria-label={TITRES_PANNEAU[p.panneau]}
      className="grid min-w-0 auto-rows-max content-start gap-3.5 overflow-x-hidden overflow-y-auto border-trait bg-blanc px-3.5 pt-4 pb-8 [grid-template-columns:minmax(0,1fr)] min-[900px]:border-r"
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
