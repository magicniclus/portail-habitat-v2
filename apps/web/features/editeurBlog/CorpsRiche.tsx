'use client';

import { statsTexte } from '@ph/core/blog';
import { Button, Input } from '@ph/ui';
import { useEffect, useRef, useState } from 'react';

const OUTILS: [string, string, () => void][] = [
  ['G', 'Gras', () => document.execCommand('bold')],
  ['I', 'Italique', () => document.execCommand('italic')],
  ['S', 'Souligné', () => document.execCommand('underline')],
  ['H2', 'Intertitre', () => document.execCommand('formatBlock', false, 'h2')],
  ['H3', 'Sous-intertitre', () => document.execCommand('formatBlock', false, 'h3')],
  ['¶', 'Paragraphe', () => document.execCommand('formatBlock', false, 'p')],
  ['•', 'Liste', () => document.execCommand('insertUnorderedList')],
  ['1.', 'Liste numérotée', () => document.execCommand('insertOrderedList')],
  ['❝', 'Citation', () => document.execCommand('formatBlock', false, 'blockquote')],
  ['↶', 'Annuler', () => document.execCommand('undo')],
];

/**
 * Corps de l'article (BLOG §3) : gras, italique, souligné, H2, H3, paragraphe, listes, citation,
 * lien (pages du site ou adresse https), annuler. Le HTML est assaini par le serveur.
 */
export function CorpsRiche({
  html,
  onChange,
  liens,
}: {
  html: string;
  onChange: (html: string) => void;
  liens: { libelle: string; href: string }[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const plage = useRef<Range | null>(null);
  const [lien, setLien] = useState<string | null>(null);
  useEffect(() => {
    // Contenu initial seulement : ensuite, l'éditeur est la source (curseur préservé).
    if (ref.current && !ref.current.innerHTML) ref.current.innerHTML = html;
  }, [html]);
  const sync = () => onChange(ref.current?.innerHTML ?? '');
  const inserer = (href: string) => {
    const sel = window.getSelection();
    if (plage.current && sel) {
      sel.removeAllRanges();
      sel.addRange(plage.current);
    }
    if (/^(https:\/\/|\/(?!\/))/.test(href)) document.execCommand('createLink', false, href);
    setLien(null);
    sync();
  };
  return (
    <div className="grid gap-2">
      <div
        role="toolbar"
        aria-label="Mise en forme"
        className="flex flex-wrap items-center gap-1 border-b border-trait pb-2"
      >
        {OUTILS.map(([l, titre, faire]) => (
          <button
            key={titre}
            type="button"
            title={titre}
            aria-label={titre}
            className="min-h-11 min-w-11 rounded-control font-semibold hover:bg-neutre-100"
            onMouseDown={(e) => {
              e.preventDefault();
              faire();
              sync();
            }}
          >
            {l}
          </button>
        ))}
        <button
          type="button"
          aria-label="Lien"
          className="min-h-11 rounded-control px-2 font-semibold hover:bg-neutre-100"
          onMouseDown={(e) => {
            e.preventDefault();
            const sel = window.getSelection();
            plage.current = sel?.rangeCount ? sel.getRangeAt(0).cloneRange() : null;
            setLien('');
          }}
        >
          Lien
        </button>
        <span className="ml-auto text-sm text-neutre-700">{statsTexte(html, '').mots} mots</span>
      </div>
      {lien !== null ? (
        <form
          className="grid gap-2 rounded-[12px] border border-trait p-2"
          onSubmit={(e) => {
            e.preventDefault();
            inserer(lien);
          }}
        >
          <div className="flex gap-2">
            <Input
              aria-label="Adresse du lien"
              placeholder="/contact-devis ou https://…"
              value={lien}
              onChange={(e) => setLien(e.target.value)}
            />
            <Button type="submit">Insérer</Button>
            <Button variant="fantome" onClick={() => setLien(null)}>
              Annuler
            </Button>
          </div>
          {liens.length ? (
            <div className="flex flex-wrap items-center gap-1 text-sm">
              <span>Vos pages :</span>
              {liens.slice(0, 12).map((l) => (
                <Button key={l.href} taille="sm" variant="fantome" onClick={() => inserer(l.href)}>
                  {l.libelle}
                </Button>
              ))}
            </div>
          ) : null}
        </form>
      ) : null}
      <div
        ref={ref}
        role="textbox"
        aria-multiline="true"
        aria-label="Texte de l’article"
        contentEditable
        suppressContentEditableWarning
        onInput={sync}
        onBlur={sync}
        className="prose-article min-h-[320px] rounded-[12px] border border-trait p-4 text-base outline-none focus-visible:ring-2 focus-visible:ring-accent [&_blockquote]:border-l-4 [&_blockquote]:border-trait [&_blockquote]:pl-3 [&_h2]:text-2xl [&_h3]:text-xl [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6"
      />
    </div>
  );
}
