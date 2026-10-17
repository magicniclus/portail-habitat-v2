'use client';

import {
  elementsDe,
  majElement,
  type Appareil,
  type OperationIa,
  type PageSite,
} from '@ph/core/sites';
import { Banner, Button } from '@ph/ui';
import { useState } from 'react';
import { Apercu } from './Apercu';
import { BarreEditeur, NavPanneaux, type Panneau } from './BarreEditeur';
import { AssistantCreation } from './creation/AssistantCreation';
import { BandeauCreation } from './creation/BandeauCreation';
import { PanneauAjout } from './PanneauAjout';
import { PanneauCalques } from './PanneauCalques';
import { PanneauIa } from './PanneauIa';
import { PanneauModeles } from './PanneauModeles';
import { PanneauNavigation } from './PanneauNavigation';
import { PanneauPages } from './PanneauPages';
import { PanneauSeo } from './PanneauSeo';
import { PanneauStyles } from './PanneauStyles';
import { ReglagesElement } from './ReglagesElement';
import { useActionsEditeur } from './useActionsEditeur';
import { useBrouillonSite } from './useBrouillonSite';
import { useHtmlApercu } from './useHtmlApercu';
import type { ProprietesEditeur } from './proprietes';

/** Éditeur plein écran (maquette Editeur de Site) : panneaux à gauche, aperçu mis à l'échelle. */
export function EditeurSite(props: ProprietesEditeur) {
  const s = useBrouillonSite(props.initial);
  const [pageId, setPageId] = useState(props.pageInitiale);
  const [panneau, setPanneau] = useState<Panneau>(props.panneauInitial);
  const [selection, setSelection] = useState<string | null>(null);
  const [appareil, setAppareil] = useState<Appareil>('desktop');
  const { message, enCours, executer, publier } = useActionsEditeur(s.enregistrer);
  const [assistant, setAssistant] = useState<'questionnaire' | 'reprise' | null>(
    props.questionnaire ? 'questionnaire' : props.reprise === 'auto' ? 'reprise' : null,
  );
  const [apercuIa, setApercuIa] = useState(props.apercuInitial);
  const [aReprendre, setAReprendre] = useState(props.reprise === 'proposee');
  const page = s.b.pages[pageId] ?? s.b.pages.accueil!;
  const majPage = (f: (p: PageSite) => PageSite) =>
    s.modifier((b) => ({ ...b, pages: { ...b.pages, [pageId]: f(b.pages[pageId]!) } }));
  const element = selection ? elementsDe(page).find((e) => e.el.id === selection)?.el : undefined;

  const [proposition, setProposition] = useState<OperationIa[] | null>(null);
  const html = useHtmlApercu(s.b, pageId, { ...props, apercuIa, proposition });

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
      <div className="flex flex-1 flex-col min-[900px]:flex-row">
        <aside className="grid content-start gap-3 border-trait p-3 min-[900px]:w-[380px] min-[900px]:border-r">
          {assistant ? (
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
          ) : null}
          <div className={assistant ? 'hidden' : 'contents'}>
            <NavPanneaux
              actif={panneau}
              onChoisir={(p) => {
                setPanneau(p);
                if (p !== 'ajouter') setSelection(null);
              }}
            />
            {panneau === 'ajouter' ? (
              <PanneauAjout
                page={page}
                selection={selection}
                onPage={(n) => majPage(() => n)}
                onElement={(id) => {
                  setPanneau('calques');
                  setSelection(id);
                }}
              />
            ) : null}
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
                  categoriesBlog={props.blog.classement.categories}
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
                restantsInitiaux={props.restantsIa}
                enregistrer={s.enregistrer}
                appliquer={s.appliquerIa}
                onProposition={setProposition}
              />
            ) : null}
            {panneau === 'modeles' ? <PanneauModeles onRestaurer={s.restaurer} /> : null}
            {panneau === 'styles' ? (
              <PanneauStyles
                theme={s.b.theme}
                onChange={(t) => s.modifier((b) => ({ ...b, theme: t }))}
              />
            ) : null}
          </div>
        </aside>
        <main className="min-w-0 flex-1">
          <Apercu html={html} appareil={appareil} {...(apercuIa ? { filigrane: 'Aperçu' } : {})} />
        </main>
      </div>
    </div>
  );
}
