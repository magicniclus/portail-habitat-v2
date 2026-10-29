'use client';

import { retirerLien, type Action } from '@ph/core/sites';
import { useEffect, useId, useRef, useState } from 'react';
import type { ContexteReglages } from '../proprietes/contexte';
import { BarreTexte } from './BarreTexte';
import { LiensDuTexte } from './LiensDuTexte';
import { depuisHtml, liensUtilises, nouveauLien, versHtml } from './texteRiche';

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
  c,
  listes = true,
}: {
  libelle: string;
  texte: string;
  liens?: Record<string, Action>;
  onChange: (p: { texte: string; liens: Record<string, Action> }) => void;
  c: ContexteReglages;
  /** Listes à puces et numérotées (textes ; un titre n'en a pas). */
  listes?: boolean;
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
  /** Surligné ou couleur : la sélection est enveloppée (aucune couleur libre, seulement le thème). */
  const envelopper = (e: React.MouseEvent, balise: 'mark' | 'ka' | 'kp' | 'ks' | 'kb') => {
    e.preventDefault();
    const s = selectionDedans();
    if (!s) return setMessage('Sélectionnez d’abord le texte à mettre en forme.');
    setMessage(null);
    const r = s.getRangeAt(0);
    const el = document.createElement(balise === 'mark' ? 'mark' : 'span');
    if (balise !== 'mark') el.className = balise;
    el.appendChild(r.extractContents());
    r.insertNode(el);
    sauver();
  };
  const effacer = (e: React.MouseEvent) => {
    e.preventDefault();
    const s = selectionDedans();
    if (!s) return setMessage('Sélectionnez d’abord le texte à mettre en forme.');
    setMessage(null);
    document.execCommand('removeFormat');
    // Surlignés et couleurs touchés par la sélection : retirés, le texte reste.
    zone.current?.querySelectorAll('mark,span.ka,span.kp,span.ks,span.kb').forEach((n) => {
      if (s.containsNode(n, true)) n.replaceWith(...Array.from(n.childNodes));
    });
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
  const retirer = (lid: string) => {
    const r = retirerLien(texte, liens, lid);
    onChange(r);
    if (zone.current) zone.current.innerHTML = versHtml(r.texte);
    source.current = r.texte;
  };

  return (
    <div className="grid gap-2">
      <span id={id} className="text-[13px] font-bold text-neutre-800">
        {libelle}
      </span>
      <div className="overflow-hidden rounded-[8px] border border-trait focus-within:border-accent">
        <BarreTexte
          a={{ commande, envelopper, effacer, lier }}
          listes={listes}
          palette={c.palette}
        />
        <div
          ref={zone}
          role="textbox"
          aria-multiline="true"
          aria-labelledby={id}
          contentEditable
          suppressContentEditableWarning
          onInput={sauver}
          onKeyDown={(e) => {
            // Dans une liste, Entrée crée la puce suivante (comportement du navigateur).
            const noeud = window.getSelection()?.anchorNode;
            const dansListe = (noeud instanceof Element ? noeud : noeud?.parentElement)?.closest(
              'li',
            );
            if (e.key === 'Enter' && !dansListe) {
              e.preventDefault();
              document.execCommand('insertLineBreak');
              sauver();
            }
          }}
          onPaste={(e) => {
            e.preventDefault();
            document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
          }}
          className="min-h-24 px-3 py-2 text-base leading-6 outline-none [&_a]:text-accent-700 [&_a]:underline [&_mark]:bg-accent-100 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5 [&_.ka]:text-accent-700 [&_.kp]:text-accent-800"
        />
      </div>
      <span className="text-xs text-neutre-600">
        Sélectionnez des mots, puis choisissez une mise en forme ou Lien.
      </span>
      {message ? (
        <p role="status" className="m-0 text-xs font-semibold text-danger">
          {message}
        </p>
      ) : null}
      <LiensDuTexte
        texte={texte}
        liens={liens}
        c={c}
        ouvert={ouvert}
        onOuvert={setOuvert}
        onChange={onChange}
        onRetirer={retirer}
      />
    </div>
  );
}
