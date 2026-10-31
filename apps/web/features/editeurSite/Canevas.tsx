'use client';

import type { Appareil } from '@ph/core/sites';
import { Chargeur } from '@ph/ui';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

export const LARGEURS: Record<Appareil, number> = { desktop: 1200, tablet: 768, mobile: 390 };

/** Message venu de l'aperçu (script d'édition, origine opaque). */
export type MessageApercu =
  | { type: 'choisir'; id: string | null }
  | { type: 'action'; op: string; id?: string }
  | { type: 'touche'; key: string; ctrl: boolean; shift: boolean }
  | { type: 'texte'; id: string; html: string; texte: string; simple: boolean }
  | { type: 'edition'; id: string }
  /** Mode Aperçu : lien vers une autre page du site, ou lien externe (appel, email, site…). */
  | { type: 'page'; slug: string; ancre: string }
  | { type: 'lien'; href: string };

/** Ce que l'aperçu doit encadrer : identifiant, niveau, badge, actions, bouton d'ajout. */
export interface SelectionApercu {
  id: string;
  niveau: string;
  badge: string;
  actions: { op: string; label: string }[];
  ajout?: { op: string; label: string };
}

/**
 * Aperçu de la page à l'échelle de l'appareil (ordinateur 1200 px, tablette 768, mobile 390),
 * dans un cadre isolé (`allow-scripts` sans `allow-same-origin` : aucun accès à l'espace pro).
 * Le script d'édition renvoie clics et touches ; la position de défilement survit au rendu.
 */
export function Canevas({
  html,
  appareil,
  selection,
  defiler,
  onMessage,
  onEchelle,
  filigrane,
  menuOuvert = false,
  ancre,
  surPlace = false,
  pageId,
}: {
  html: string;
  appareil: Appareil;
  selection: SelectionApercu | null;
  /** Amène la sélection à l'écran (choix depuis la structure). */
  defiler: number;
  onMessage: (m: MessageApercu) => void;
  onEchelle: (e: number) => void;
  filigrane?: string;
  /** Menu mobile ouvert dans l'aperçu (réglages de la navigation). */
  menuOuvert?: boolean;
  /** Mode Aperçu : zone où arriver après un changement de page. */
  ancre?: string;
  /** Édition : chaque nouveau rendu remplace la page sur place, sans recharger le cadre. */
  surPlace?: boolean;
  /** Page affichée : en changer remonte en haut, sans recharger le cadre ni l'animer. */
  pageId?: string;
}) {
  const largeur = LARGEURS[appareil];
  const boite = useRef<HTMLDivElement>(null);
  const cadre = useRef<HTMLIFrameElement>(null);
  const y = useRef(0);
  const [echelle, setEchelle] = useState(1);
  // Pas d'animation avant la première mesure : sinon la page « rétrécit » à chaque affichage.
  const [mesure, setMesure] = useState(false);
  useLayoutEffect(() => {
    const el = boite.current;
    if (!el) return;
    const calculer = (w: number) => setEchelle(Math.min(1, (w - 32) / largeur));
    calculer(el.getBoundingClientRect().width);
    const ro = new ResizeObserver(([e]) => {
      if (e) calculer(e.contentRect.width);
    });
    ro.observe(el);
    const t = requestAnimationFrame(() => setMesure(true));
    return () => {
      ro.disconnect();
      cancelAnimationFrame(t);
    };
  }, [largeur]);
  useEffect(() => onEchelle(echelle), [echelle, onEchelle]);

  const envoyer = useCallback((m: object) => {
    cadre.current?.contentWindow?.postMessage({ ...m, source: 'ph-editeur' }, '*');
  }, []);
  // Document chargé une fois ; les rendus suivants partent par message (pas de rechargement,
  // donc ni éclair blanc ni saut de défilement).
  const [initial] = useState(html);
  const dernier = useRef(html);
  const pret = useRef(false);
  // Chargeur au-dessus du cadre jusqu'au premier « prêt » (page affichée, script en place).
  const [charge, setCharge] = useState(false);
  useEffect(() => {
    dernier.current = html;
    if (surPlace && pret.current) envoyer({ type: 'html', html });
  }, [html, surPlace, envoyer]);
  // Autre page : en haut de la nouvelle page (le rendu ci-dessus l'a déjà remplacée).
  const pagePrecedente = useRef(pageId);
  useEffect(() => {
    if (pagePrecedente.current === pageId) return;
    pagePrecedente.current = pageId;
    y.current = 0;
    envoyer({ type: 'defiler', y: 0 });
  }, [pageId, envoyer]);
  const derniere = useRef(selection);
  useEffect(() => {
    derniere.current = selection;
    envoyer({ type: 'selection', selection: selection ? { ...selection, defiler: false } : null });
  }, [selection, envoyer]);
  useEffect(() => {
    if (defiler)
      envoyer({
        type: 'selection',
        selection: derniere.current ? { ...derniere.current, defiler: true } : null,
      });
  }, [defiler, envoyer]);
  const menu = useRef(menuOuvert);
  useEffect(() => {
    menu.current = menuOuvert;
    envoyer({ type: 'menu', ouvert: menuOuvert });
  }, [menuOuvert, envoyer]);
  const ancreRef = useRef(ancre);
  useEffect(() => {
    ancreRef.current = ancre;
  }, [ancre]);
  // Cadre prêt (message du script, réponse au « ping » ou événement load) : dernier rendu,
  // position, sélection, menu et ancre.
  const quandPret = useCallback(() => {
    pret.current = true;
    setCharge(true);
    if (surPlace && dernier.current !== initial) envoyer({ type: 'html', html: dernier.current });
    envoyer({ type: 'defiler', y: y.current });
    envoyer({ type: 'selection', selection: derniere.current });
    if (menu.current) envoyer({ type: 'menu', ouvert: true });
    if (ancreRef.current) envoyer({ type: 'ancre', ancre: ancreRef.current });
  }, [envoyer, surPlace, initial]);
  useEffect(() => {
    const recevoir = (e: MessageEvent) => {
      if (e.source !== cadre.current?.contentWindow) return;
      const m = e.data as { source?: string; type?: string; y?: number };
      if (m?.source !== 'ph-editeur') return;
      if (m.type === 'defilement') y.current = m.y ?? 0;
      else if (m.type === 'pret') quandPret();
      else onMessage(m as MessageApercu);
    };
    window.addEventListener('message', recevoir);
    return () => window.removeEventListener('message', recevoir);
  }, [onMessage, quandPret]);
  // Le cadre est dans le HTML du serveur : il peut avoir dit « prêt » avant que React écoute.
  // On le lui redemande une fois l'éditeur monté (il répond s'il est chargé).
  useEffect(() => envoyer({ type: 'ping' }), [envoyer]);

  return (
    <div ref={boite} className="h-full min-h-[60vh] overflow-hidden bg-neutre-200 p-4">
      <div
        className={`relative mx-auto h-full ${mesure ? 'transition-[width] duration-300 ease-out motion-reduce:transition-none' : ''}`}
        style={{ width: largeur * echelle }}
      >
        {filigrane ? (
          <div
            aria-hidden="true"
            data-filigrane
            className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center overflow-hidden"
          >
            <span className="-rotate-[24deg] text-[clamp(48px,10vw,120px)] font-extrabold text-neutre-900/15 select-none">
              {filigrane}
            </span>
          </div>
        ) : null}
        {charge ? null : (
          <div className="absolute inset-0 z-20 grid place-items-center bg-blanc shadow-lg">
            <Chargeur message="Chargement de la page…" className="flex-col" />
          </div>
        )}
        <iframe
          ref={cadre}
          title="Aperçu de la page"
          sandbox="allow-scripts"
          srcDoc={surPlace ? initial : html}
          onLoad={quandPret}
          className={`block border-0 bg-blanc shadow-lg ${mesure ? 'transition-[width,height,transform] duration-300 ease-out motion-reduce:transition-none' : ''}`}
          style={{
            width: largeur,
            height: `${100 / echelle}%`,
            transform: `scale(${echelle})`,
            transformOrigin: '0 0',
          }}
        />
      </div>
    </div>
  );
}
