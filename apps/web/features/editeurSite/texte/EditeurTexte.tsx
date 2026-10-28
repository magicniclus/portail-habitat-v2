'use client';

import { LIBELLES_ACTION, retirerLien, type Action, type PageSite } from '@ph/core/sites';
import { LinkSimpleIcon, XIcon } from '@phosphor-icons/react';
import { useEffect, useId, useRef, useState } from 'react';
import { ChampAction } from '../ChampAction';
import { depuisHtml, liensUtilises, nouveauLien, versHtml } from './texteRiche';

const outil =
  'grid min-h-11 min-w-11 place-items-center rounded-[6px] px-2 text-[13px] font-bold text-neutre-800 hover:bg-neutre-100';

/**
 * Éditeur de texte (maquette Editeur de Site) : sélectionner des mots puis Gras, Italique,
 * Souligné, Lien ou Effacer ; chaque lien reçoit sa destination (page, zone, téléphone, email…).
 * Ce qui est collé arrive en texte simple.
 */
export function EditeurTexte({
  libelle,
  texte,
  liens = {},
  onChange,
  pages,
  erreurAction,
}: {
  libelle: string;
  texte: string;
  liens?: Record<string, Action>;
  onChange: (p: { texte: string; liens: Record<string, Action> }) => void;
  pages: Record<string, PageSite>;
  erreurAction: (a: Action) => string | null;
}) {
  const id = useId();
  const zone = useRef<HTMLDivElement>(null);
  const source = useRef<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [ouvert, setOuvert] = useState<string | null>(null);

  // Texte changé ailleurs (Ctrl Z, IA, sur la page) : la zone suit, sauf pendant la saisie.
  useEffect(() => {
    const el = zone.current;
    if (el && source.current !== texte && document.activeElement !== el) {
      el.innerHTML = versHtml(texte);
      source.current = texte;
    }
  }, [texte]);

  const sauver = () => {
    const el = zone.current;
    if (!el) return;
    const v = depuisHtml(el);
    source.current = v;
    onChange({ texte: v, liens: liensUtilises(v, liens) });
  };
  const selectionDedans = () => {
    const s = window.getSelection();
    return s && !s.isCollapsed && zone.current?.contains(s.anchorNode) ? s : null;
  };
  const commande = (e: React.MouseEvent, c: string) => {
    e.preventDefault();
    if (!selectionDedans()) return setMessage('Sélectionnez d’abord le texte à mettre en forme.');
    setMessage(null);
    document.execCommand('styleWithCSS', false, 'false');
    document.execCommand(c);
    sauver();
  };
  const lier = (e: React.MouseEvent) => {
    e.preventDefault();
    const s = selectionDedans();
    const mot = s?.toString().trim();
    const dansLien = (n: Node | null) => Boolean(n?.parentElement?.closest('a'));
    if (!s || !mot) return setMessage('Sélectionnez d’abord le ou les mots à transformer en lien.');
    if (dansLien(s.anchorNode) || dansLien(s.focusNode) || /[[\]()]/.test(mot))
      return setMessage('La sélection chevauche un lien existant.');
    setMessage(null);
    const lid = nouveauLien(texte, liens);
    document.execCommand('createLink', false, `#${lid}`);
    const v = depuisHtml(zone.current!);
    source.current = v;
    onChange({
      texte: v,
      liens: { ...liensUtilises(v, liens), [lid]: { type: 'page', page: 'accueil' } },
    });
    setOuvert(lid);
  };
  const mots = [...texte.matchAll(/\[([^\]]+)\]\(#(L\d+)\)/g)].map((m) => ({
    mot: m[1]!,
    lid: m[2]!,
  }));
  const decrire = (a: Action | undefined) =>
    !a
      ? 'Aucune action'
      : a.type === 'page' && a.page
        ? `Page · ${pages[a.page]?.nom ?? '?'}`
        : LIBELLES_ACTION[a.type];

  return (
    <div className="grid gap-2">
      <span id={id} className="text-[13px] font-bold text-neutre-800">
        {libelle}
      </span>
      <div className="overflow-hidden rounded-[8px] border border-trait focus-within:border-accent">
        <div
          role="toolbar"
          aria-label="Mise en forme"
          className="flex flex-wrap items-center gap-0.5 border-b border-trait bg-neutre-100 p-0.5"
        >
          <button
            type="button"
            className={outil}
            onMouseDown={(e) => commande(e, 'bold')}
            title="Gras (Ctrl B)"
            aria-label="Gras"
          >
            B
          </button>
          <button
            type="button"
            className={`${outil} italic`}
            onMouseDown={(e) => commande(e, 'italic')}
            title="Italique (Ctrl I)"
            aria-label="Italique"
          >
            I
          </button>
          <button
            type="button"
            className={`${outil} underline`}
            onMouseDown={(e) => commande(e, 'underline')}
            title="Souligné (Ctrl U)"
            aria-label="Souligné"
          >
            U
          </button>
          <span aria-hidden="true" className="mx-1 h-5 w-px bg-trait" />
          <button
            type="button"
            className={`${outil} flex gap-1`}
            onMouseDown={lier}
            title="Transformer la sélection en lien"
          >
            <LinkSimpleIcon size={15} aria-hidden="true" /> Lien
          </button>
          <button
            type="button"
            className={outil}
            onMouseDown={(e) => commande(e, 'removeFormat')}
            title="Retirer gras, italique et souligné"
          >
            Effacer
          </button>
        </div>
        <div
          ref={zone}
          role="textbox"
          aria-multiline="true"
          aria-labelledby={id}
          contentEditable
          suppressContentEditableWarning
          onInput={sauver}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              document.execCommand('insertLineBreak');
              sauver();
            }
          }}
          onPaste={(e) => {
            e.preventDefault();
            document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
          }}
          className="min-h-24 px-3 py-2 text-base leading-6 outline-none [&_a]:text-accent-700 [&_a]:underline"
        />
      </div>
      <span className="text-xs text-neutre-600">
        Sélectionnez des mots, puis Gras, Italique, Souligné ou Lien.
      </span>
      {message ? (
        <p role="status" className="m-0 text-xs font-semibold text-danger">
          {message}
        </p>
      ) : null}
      {mots.length ? (
        <div className="grid gap-1.5 [grid-template-columns:minmax(0,1fr)]">
          <span className="text-xs font-bold text-neutre-700">Liens dans ce texte</span>
          {mots.map(({ mot, lid }) => {
            const a = liens[lid];
            return (
              <div
                key={lid}
                className="grid gap-1.5 rounded-[8px] border border-trait p-2 [grid-template-columns:minmax(0,1fr)]"
              >
                <div className="flex items-center gap-1">
                  <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">
                    « {mot} »
                  </span>
                  <button
                    type="button"
                    aria-label={`Retirer le lien « ${mot} »`}
                    title="Retirer le lien (garder le texte)"
                    onClick={() => {
                      const r = retirerLien(texte, liens, lid);
                      onChange(r);
                      if (zone.current) zone.current.innerHTML = versHtml(r.texte);
                      source.current = r.texte;
                    }}
                    className="grid size-11 place-items-center rounded-[6px] text-neutre-700 hover:bg-neutre-100"
                  >
                    <XIcon size={14} aria-hidden="true" />
                  </button>
                </div>
                <button
                  type="button"
                  aria-expanded={ouvert === lid}
                  onClick={() => setOuvert(ouvert === lid ? null : lid)}
                  className={`min-h-11 rounded-[6px] border px-2 text-left text-xs ${a && erreurAction(a) ? 'border-danger text-danger' : 'border-trait text-neutre-800'}`}
                >
                  {decrire(a)}
                </button>
                {ouvert === lid ? (
                  <ChampAction
                    libelle={`Lien « ${mot} »`}
                    action={a ?? { type: 'aucun' }}
                    onChange={(x) => onChange({ texte, liens: { ...liens, [lid]: x } })}
                    pages={pages}
                    erreur={a ? erreurAction(a) : null}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
