'use client';

import {
  changerDisposition,
  changerNombreBlocs,
  majNoeud,
  trouverNoeud,
  type Appareil,
  type Element,
  type OperationIa,
  type PageSite,
} from '@ph/core/sites';
import { Banner } from '@ph/ui';
import { useCallback, useEffect, useState } from 'react';
import { BarreEditeur, Rail, type Panneau } from './BarreEditeur';
import { Canevas } from './Canevas';
import { AssistantCreation } from './creation/AssistantCreation';
import { BandeauCreation } from './creation/BandeauCreation';
import { PanneauGauche, type DemandeIa } from './gauche/PanneauGauche';
import type { OngletAjout } from './gauche/PanneauAjout';
import { appelSections } from './MesSections';
import { depuisHtml, liensUtilises } from './texte/texteRiche';
import { PanneauProprietes } from './proprietes/PanneauProprietes';
import { ReglagesNavigation } from './proprietes/ReglagesNavigation';
import { badgeSelection, infoSelection } from './selection';
import { useActionsEditeur } from './useActionsEditeur';
import { useBrouillonSite } from './useBrouillonSite';
import { useHtmlApercu } from './useHtmlApercu';
import { useSauvegardeAuto } from './useSauvegardeAuto';
import { useSelection } from './useSelection';
import type { ProprietesEditeur } from './proprietes';

const nouvelId = () => Math.random().toString(36).slice(2, 10);

/**
 * Éditeur plein écran (maquette Editeur de Site) : barre du haut, outils à gauche, page
 * cliquable au centre, réglages de la sélection à droite. Enregistrement automatique du
 * brouillon ; rien n'est en ligne avant « Publier ».
 */
export function EditeurSite(props: ProprietesEditeur) {
  const s = useBrouillonSite(props.initial);
  const [pageId, setPageId] = useState(props.pageInitiale);
  const [panneau, setPanneau] = useState<Panneau | null>(props.panneauInitial);
  const [ongletAjout, setOngletAjout] = useState<OngletAjout>('contenus');
  const [appareil, setAppareil] = useState<Appareil>('desktop');
  const [apercu, setApercu] = useState(false);
  const [menuOuvert, setMenuOuvert] = useState(false);
  const [echelle, setEchelle] = useState(1);
  const [toast, setToast] = useState<string | null>(null);
  const [ia, setIa] = useState<DemandeIa | null>(null);
  const [proposition, setProposition] = useState<OperationIa[] | null>(null);
  const [medias, setMedias] = useState(props.medias);
  const [assistant, setAssistant] = useState<'questionnaire' | 'reprise' | null>(
    props.questionnaire ? 'questionnaire' : props.reprise === 'auto' ? 'reprise' : null,
  );
  const [apercuIa, setApercuIa] = useState(props.apercuInitial);
  const [aReprendre, setAReprendre] = useState(props.reprise === 'proposee');
  const { message, enCours, executer, publier } = useActionsEditeur(s.enregistrer);
  const sauvegarde = useSauvegardeAuto({ ...s, version: s.b });
  const page = s.b.pages[pageId] ?? s.b.pages.accueil!;
  const majPage = useCallback(
    (f: (p: PageSite) => PageSite) =>
      s.modifier((b) => ({ ...b, pages: { ...b.pages, [pageId]: f(b.pages[pageId]!) } })),
    [s, pageId],
  );
  const flash = useCallback((m: string) => setToast(m), []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(t);
  }, [toast]);
  const ouvrirAjout = useCallback((o: OngletAjout) => {
    setOngletAjout(o);
    setPanneau('ajouter');
  }, []);
  const onTexte = useCallback(
    (id: string, html: string, brut: string, simple: boolean) =>
      majPage((p) => {
        const el = trouverNoeud(p, id)?.noeud as Element | undefined;
        if (!el || !('texte' in el.p)) return p;
        // HTML du cadre isolé relu dans un document inerte : rien ne s'exécute, seules les
        // balises du texte riche sont gardées.
        const texte = simple
          ? brut.replace(/\s+/g, ' ').trim()
          : depuisHtml(new DOMParser().parseFromString(html, 'text/html').body);
        if (texte === el.p.texte) return p;
        return majNoeud(
          p,
          id,
          simple
            ? { texte }
            : { texte, liens: liensUtilises(texte, 'liens' in el.p ? el.p.liens : undefined) },
        );
      }),
    [majPage],
  );
  const sel = useSelection({
    page,
    majPage,
    annuler: s.annuler,
    retablir: s.retablir,
    flash,
    ouvrirAjout,
    onTexte,
  });
  const info = apercu ? null : infoSelection(page, sel.selection);
  const html = useHtmlApercu(s.b, pageId, {
    ...props,
    medias,
    apercuIa,
    proposition,
    edition: !apercu,
  });
  const changerPage = (id: string) => {
    setPageId(id);
    sel.choisir(null);
  };
  const contexte = {
    pages: s.b.pages,
    palette: s.b.theme.palette,
    appareil,
    medias,
    artisanId: props.artisanId,
    onMedia: (cle: string, url: string) => setMedias((m) => ({ ...m, [cle]: url })),
    erreurAction: s.erreurAction(pageId),
    categoriesBlog: props.blog.classement.categories,
    maj: (r: Record<string, unknown>) =>
      sel.selection && majPage((p) => majNoeud(p, sel.selection!, r)),
    ouvrirAjout,
    onAppareil: setAppareil,
    basculerMenu: () => setMenuOuvert((x) => !x),
  };
  const outils = !apercu;
  return (
    <div className="flex h-dvh min-h-0 flex-col bg-blanc max-[899px]:h-auto max-[899px]:min-h-dvh">
      <BarreEditeur
        nomSite={s.b.navigation.nom}
        pages={s.b.pages}
        pageId={pageId}
        onPage={changerPage}
        appareil={appareil}
        onAppareil={setAppareil}
        echelle={echelle}
        onAnnuler={s.annuler}
        onRetablir={s.retablir}
        peutAnnuler={s.peutAnnuler}
        peutRetablir={s.peutRetablir}
        etat={sauvegarde.texte}
        apercu={apercu}
        onApercu={() => setApercu((a) => !a)}
        onPublier={publier}
        enCours={enCours}
        publicationBloquee={apercuIa !== null}
      />
      <BandeauCreation
        apercu={apercuIa !== null}
        aReprendre={aReprendre && !assistant}
        onFermerApercu={() => setApercuIa(null)}
        onReprendre={() => {
          setAReprendre(false);
          setAssistant('reprise');
        }}
      />
      {message ? (
        <Banner tone={message.ton} className="m-3">
          {message.texte}
        </Banner>
      ) : null}
      {assistant ? (
        <div className="border-b border-trait p-3">
          <AssistantCreation
            {...(assistant === 'questionnaire' && props.questionnaire
              ? { questionnaire: props.questionnaire }
              : {})}
            reprise={assistant === 'reprise'}
            enregistrer={s.enregistrer}
            appliquer={s.appliquerIa}
            onApercu={setApercuIa}
            onFermer={() => setAssistant(null)}
            theme={s.b.theme}
            onTheme={(t) => s.modifier((b) => ({ ...b, theme: t }))}
          />
        </div>
      ) : null}
      <div
        className="grid min-h-0 flex-1 grid-cols-1 min-[900px]:[grid-template-columns:var(--colonnes)]"
        style={{
          ['--colonnes' as string]: outils
            ? `auto ${panneau ? (panneau === 'seo' ? '340px ' : '300px ') : ''}minmax(0,1fr) 320px`
            : 'minmax(0,1fr)',
        }}
      >
        {outils ? (
          <Rail actif={panneau} onChoisir={(x) => setPanneau((p) => (p === x ? null : x))} />
        ) : null}
        {outils && panneau ? (
          <PanneauGauche
            panneau={panneau}
            onFermer={() => setPanneau(null)}
            s={s}
            props={props}
            pageId={pageId}
            page={page}
            selection={sel.selection}
            onChoisir={sel.choisir}
            onPageId={changerPage}
            majPage={majPage}
            ongletAjout={ongletAjout}
            onOngletAjout={setOngletAjout}
            ia={ia}
            onIa={(d) => {
              setIa({ ...d, n: Date.now() });
              setPanneau('ia');
            }}
            onPanneau={setPanneau}
            onProposition={setProposition}
            flash={flash}
            appareil={appareil}
          />
        ) : null}
        <main className="min-h-[60vh] min-w-0">
          <Canevas
            html={html}
            appareil={appareil}
            selection={info ? { ...info, badge: badgeSelection(page, info) } : null}
            defiler={sel.defiler}
            menuOuvert={menuOuvert}
            onMessage={sel.recevoir}
            onEchelle={setEchelle}
            {...(apercuIa ? { filigrane: 'Aperçu' } : {})}
          />
        </main>
        {outils ? (
          <aside
            aria-label="Réglages de la sélection"
            className="min-h-0 min-w-0 overflow-x-hidden overflow-y-auto border-trait bg-blanc min-[900px]:border-l"
          >
            <PanneauProprietes
              page={page}
              info={info}
              c={contexte}
              onAction={(op) => sel.agir(op)}
              onBlocs={(n) =>
                sel.selection && majPage((p) => changerNombreBlocs(p, sel.selection!, n, nouvelId))
              }
              onDisposition={(l) =>
                sel.selection && majPage((p) => changerDisposition(p, sel.selection!, l, nouvelId))
              }
              onEnregistrerZone={async (z) => {
                const r = await appelSections({
                  action: 'enregistrer',
                  nom: z.p.nom || 'Zone',
                  section: z,
                });
                flash(
                  r.ok
                    ? `« ${z.p.nom || 'Zone'} » ajoutée à Mes zones (Ajouter › Zones).`
                    : r.message,
                );
              }}
              navigation={(onglet) => (
                <ReglagesNavigation
                  nav={s.b.navigation}
                  page={page}
                  onglet={onglet}
                  c={contexte}
                  onChange={(n) => s.modifier((b) => ({ ...b, navigation: n }))}
                  onPage={(r) => majPage((p) => ({ ...p, ...r }))}
                  nonEnregistree={s.navModifiee}
                  onEnregistrer={() =>
                    executer(
                      s.enregistrerNavigation,
                      'Navigation enregistrée sur toutes les pages.',
                    )
                  }
                  onAnnuler={s.annulerNavigation}
                  enCours={enCours}
                />
              )}
            />
          </aside>
        ) : null}
      </div>
      {toast ? (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-[10px] bg-neutre-900 px-4 py-2.5 text-sm text-blanc shadow-lg"
        >
          {toast}
        </div>
      ) : null}
    </div>
  );
}
