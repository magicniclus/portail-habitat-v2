'use client';

import { type Appareil, type OperationIa, type PageSite } from '@ph/core/sites';
import { Banner } from '@ph/ui';
import { useCallback, useState } from 'react';
import { BarreEditeur, Rail, type Panneau } from './BarreEditeur';
import { colonnes } from './disposition';
import { Canevas } from './Canevas';
import { Toast, useToast } from './Toast';
import { useApercuCliquable, useMediatheque } from './useApercuCliquable';
import { CreationEnCours, useCreation } from './creation/CreationEnCours';
import { PanneauGauche, type DemandeIa } from './gauche/PanneauGauche';
import type { OngletAjout } from './gauche/PanneauAjout';
import { useTexteSurPage } from './texte/useTexteSurPage';
import { ColonneDroite } from './proprietes/ColonneDroite';
import { contexteReglages } from './proprietes/contexteReglages';
import { badgeSelection, infoSelection } from './selection';
import { useActionsEditeur } from './useActionsEditeur';
import { useBrouillonSite } from './useBrouillonSite';
import { useHtmlApercu } from './useHtmlApercu';
import { useSauvegardeAuto } from './useSauvegardeAuto';
import { useSelection } from './useSelection';
import type { ProprietesEditeur } from './proprietes';

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
  const [ia, setIa] = useState<DemandeIa | null>(null);
  const [proposition, setProposition] = useState<OperationIa[] | null>(null);
  const m = useMediatheque(props.medias, props.fichiers);
  const cr = useCreation(props);
  const apercuIa = cr.apercuIa;
  const { message, enCours, executer, publier } = useActionsEditeur(s.enregistrer);
  const sauvegarde = useSauvegardeAuto({ ...s, version: s.b });
  const page = s.b.pages[pageId] ?? s.b.pages.accueil!;
  const majPage = useCallback(
    (f: (p: PageSite) => PageSite) =>
      s.modifier((b) => ({ ...b, pages: { ...b.pages, [pageId]: f(b.pages[pageId]!) } })),
    [s, pageId],
  );
  const { toast, flash, fermerToast } = useToast();
  const ouvrirAjout = useCallback((o: OngletAjout) => {
    setOngletAjout(o);
    setPanneau('ajouter');
  }, []);
  const onTexte = useTexteSurPage(majPage);
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
  const ap = useApercuCliquable(s.b.pages, sel.recevoir, flash, setPageId);
  const html = useHtmlApercu(s.b, pageId, {
    ...props,
    medias: m.apercu,
    apercuIa,
    proposition,
    edition: !apercu,
  });
  const changerPage = (id: string) => (setPageId(id), sel.choisir(null));
  const ouvrirIa = useCallback((d: Omit<DemandeIa, 'n'>) => {
    setIa({ ...d, n: Date.now() });
    setPanneau('ia');
  }, []);
  const demanderIa = useCallback(
    (demande: string) => ouvrirIa({ mode: 'textes', portee: 'selection', demande }),
    [ouvrirIa],
  );
  const contexte = contexteReglages({
    s,
    pageId,
    appareil,
    m,
    props,
    selection: sel.selection,
    majPage,
    ouvrirAjout,
    setAppareil,
    basculerMenu: () => setMenuOuvert((x) => !x),
    demanderIa,
  });

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
        onApercu={() => {
          setApercu((a) => !a);
          ap.setAncre('');
        }}
        onPublier={publier}
        enCours={enCours}
        publicationBloquee={apercuIa !== null}
      />
      {message ? (
        <Banner tone={message.ton} className="m-3">
          {message.texte}
        </Banner>
      ) : null}
      <CreationEnCours
        assistant={cr.assistant}
        onAssistant={cr.setAssistant}
        aReprendre={cr.aReprendre}
        onAReprendre={cr.setAReprendre}
        apercu={apercuIa !== null}
        onApercu={cr.setApercuIa}
        s={s}
        {...(props.questionnaire ? { questionnaire: props.questionnaire } : {})}
      />
      <div
        className="grid min-h-0 flex-1 grid-cols-1 min-[900px]:[grid-template-columns:var(--colonnes)]"
        style={{ ['--colonnes' as string]: colonnes(outils, panneau) }}
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
            onIa={ouvrirIa}
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
            key={pageId}
            onMessage={ap.recevoir}
            {...(apercu && ap.ancre ? { ancre: ap.ancre } : {})}
            onEchelle={setEchelle}
            {...(apercuIa ? { filigrane: 'Aperçu' } : {})}
          />
        </main>
        {outils ? (
          <ColonneDroite
            s={s}
            page={page}
            info={info}
            c={contexte}
            selection={sel.selection}
            agir={sel.agir}
            majPage={majPage}
            flash={flash}
            executer={executer}
            enCours={enCours}
          />
        ) : null}
      </div>
      <Toast message={toast} onFin={fermerToast} />
    </div>
  );
}
