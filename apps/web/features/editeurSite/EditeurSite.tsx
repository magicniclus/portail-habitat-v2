'use client';

import {
  elementsDe,
  FORMULAIRE_GRATUIT,
  majElement,
  type Appareil,
  type ChampFormulaire,
  type PageSite,
} from '@ph/core/sites';
import { Banner, Button } from '@ph/ui';
import { useMemo, useState } from 'react';
import { rendreDocument } from '@/features/siteArtisan/document';
import { posterJson } from '@/lib/posterJson';
import { Apercu } from './Apercu';
import { BarreEditeur, NavPanneaux, type Panneau } from './BarreEditeur';
import { PanneauCalques } from './PanneauCalques';
import { PanneauIa } from './PanneauIa';
import { PanneauNavigation } from './PanneauNavigation';
import { PanneauPages } from './PanneauPages';
import { PanneauSeo } from './PanneauSeo';
import { PanneauStyles } from './PanneauStyles';
import { ReglagesElement } from './ReglagesElement';
import { useBrouillonSite, type BrouillonSite } from './useBrouillonSite';

/** Éditeur plein écran (maquette Editeur de Site) : panneaux à gauche, aperçu mis à l'échelle. */
export function EditeurSite(props: {
  initial: BrouillonSite;
  pageInitiale: string;
  panneauInitial: Panneau;
  medias: Record<string, string>;
  hote: string;
  offre: 'gratuit' | 'site_pro';
  champs?: ChampFormulaire[];
  ville?: string;
  /** Droits IA (Site Pro) calculés côté serveur ; revérifiés à chaque demande. */
  iaComplete: boolean;
}) {
  const s = useBrouillonSite(props.initial);
  const [pageId, setPageId] = useState(props.pageInitiale);
  const [panneau, setPanneau] = useState<Panneau>(props.panneauInitial);
  const [selection, setSelection] = useState<string | null>(null);
  const [appareil, setAppareil] = useState<Appareil>('desktop');
  const [message, setMessage] = useState<{ ton: 'succes' | 'danger'; texte: string } | null>(null);
  const [enCours, setEnCours] = useState(false);
  const page = s.b.pages[pageId] ?? s.b.pages.accueil!;
  const majPage = (f: (p: PageSite) => PageSite) =>
    s.modifier((b) => ({ ...b, pages: { ...b.pages, [pageId]: f(b.pages[pageId]!) } }));
  const element = selection ? elementsDe(page).find((e) => e.el.id === selection)?.el : undefined;

  const html = useMemo(
    () =>
      rendreDocument(
        {
          hote: props.hote,
          offre: props.offre,
          theme: s.b.theme,
          navigation: s.b.navigation,
          page,
          pages: s.b.pages,
          nomEntreprise: s.b.navigation.nom,
        },
        {
          pages: s.b.pages,
          media: (src) => props.medias[src] ?? null,
          champs: props.offre === 'site_pro' && props.champs ? props.champs : FORMULAIRE_GRATUIT,
        },
      ),
    [s.b, page, props.hote, props.offre, props.medias, props.champs],
  );

  const executer = async (f: () => Promise<string | null>, succes: string) => {
    setEnCours(true);
    setMessage(null);
    const erreur = await f();
    setEnCours(false);
    setMessage(erreur ? { ton: 'danger', texte: erreur } : { ton: 'succes', texte: succes });
  };
  const publier = () =>
    executer(async () => {
      const e = await s.enregistrer();
      if (e) return e;
      const r = await posterJson<{ version: number }>('/api/pro/site/publier', {});
      return r.ok ? null : r.message;
    }, 'Site publié : il est en ligne en moins d’une minute.');

  const operationSection = (id: string, op: 'haut' | 'bas' | 'dupliquer' | 'supprimer') =>
    s.operationSection(pageId, id, op);

  return (
    <div className="flex min-h-dvh flex-col bg-blanc">
      <BarreEditeur
        nomPage={page.nom}
        appareil={appareil}
        onAppareil={setAppareil}
        onAnnuler={s.annuler}
        onRetablir={s.retablir}
        peutAnnuler={s.peutAnnuler}
        peutRetablir={s.peutRetablir}
        onEnregistrer={() => executer(s.enregistrer, 'Modifications enregistrées.')}
        aEnregistrer={s.aEnregistrer}
        onPublier={publier}
        enCours={enCours}
      />
      {message ? (
        <Banner tone={message.ton} className="m-3">
          {message.texte}
        </Banner>
      ) : null}
      <div className="flex flex-1 flex-col min-[900px]:flex-row">
        <aside className="grid content-start gap-3 border-trait p-3 min-[900px]:w-[380px] min-[900px]:border-r">
          <NavPanneaux
            actif={panneau}
            onChoisir={(p) => {
              setPanneau(p);
              setSelection(null);
            }}
          />
          {panneau === 'calques' && element ? (
            <>
              <Button variant="fantome" taille="sm" onClick={() => setSelection(null)}>
                ← Calques
              </Button>
              <ReglagesElement
                el={element}
                onChange={(r) => majPage((p) => majElement(p, element.id, r))}
                pages={s.b.pages}
                medias={props.medias}
                erreurAction={s.erreurAction(pageId)}
              />
            </>
          ) : null}
          {panneau === 'calques' && !element ? (
            <PanneauCalques page={page} onSection={operationSection} onSelection={setSelection} />
          ) : null}
          {panneau === 'pages' ? (
            <PanneauPages
              pages={s.b.pages}
              pageId={pageId}
              onChoisir={(id) => {
                setPageId(id);
                setSelection(null);
              }}
              onAjouter={(nom) => setPageId(s.ajouterPage(nom))}
              onSupprimer={(id) => {
                s.supprimerPage(id);
                setPageId('accueil');
              }}
              onRegler={(r) => majPage((p) => ({ ...p, ...r }))}
            />
          ) : null}
          {panneau === 'seo' ? (
            <PanneauSeo
              page={page}
              hote={props.hote}
              {...(props.ville ? { ville: props.ville } : {})}
              onChange={(seo) => majPage((p) => ({ ...p, seo }))}
            />
          ) : null}
          {panneau === 'navigation' ? (
            <PanneauNavigation
              nav={s.b.navigation}
              pages={s.b.pages}
              onChange={(n) => s.modifier((b) => ({ ...b, navigation: n }))}
              nonEnregistree={s.navModifiee}
              onEnregistrer={() =>
                executer(s.enregistrerNavigation, 'Navigation enregistrée sur toutes les pages.')
              }
              enCours={enCours}
              erreurAction={s.erreurAction(pageId)}
            />
          ) : null}
          {panneau === 'ia' ? (
            <PanneauIa
              pageId={pageId}
              selection={selection}
              iaComplete={props.iaComplete}
              enregistrer={s.enregistrer}
              appliquer={s.appliquerIa}
            />
          ) : null}
          {panneau === 'styles' ? (
            <PanneauStyles
              theme={s.b.theme}
              onChange={(t) => s.modifier((b) => ({ ...b, theme: t }))}
            />
          ) : null}
        </aside>
        <main className="min-w-0 flex-1">
          <Apercu html={html} appareil={appareil} />
        </main>
      </div>
    </div>
  );
}
