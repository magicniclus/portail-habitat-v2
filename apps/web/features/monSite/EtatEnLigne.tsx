'use client';

import {
  ArrowSquareOutIcon,
  CaretDownIcon,
  GlobeIcon,
  ProhibitIcon,
  WrenchIcon,
} from '@phosphor-icons/react';
import { Banner, ConfirmDialog } from '@ph/ui';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useAppelSite } from './appelSite';

type Etat = 'en_ligne' | 'maintenance' | 'retire';
type Confirme = Exclude<Etat, 'en_ligne'>;

const CHOIX: Record<Confirme, { titre: string; texte: string; confirmer: string }> = {
  maintenance: {
    titre: 'Mettre le site en maintenance ?',
    texte:
      'Vos visiteurs verront une page « Site en maintenance, revenez bientôt » avec votre nom, à la place de vos pages. Rien n’est effacé : vous le remettez en ligne d’un clic.',
    confirmer: 'Mettre en maintenance',
  },
  retire: {
    titre: 'Retirer le site d’Internet ?',
    texte:
      'Votre adresse n’affichera plus rien et Google finira par oublier vos pages. Rien n’est effacé : vos pages restent dans l’éditeur et vous le remettez en ligne d’un clic.',
    confirmer: 'Retirer le site',
  },
};

const item =
  'flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-[8px] border-0 bg-transparent px-3 text-left text-[15px] text-texte no-underline hover:bg-neutre-100 focus-visible:bg-neutre-100 focus-visible:outline-none';

/**
 * « Gérer le site » : un seul bouton qui s'ouvre sur Voir le site, Mettre en maintenance, Retirer
 * le site ou Remettre en ligne. Maintenance et retrait sont confirmés ; effet en moins d'une minute.
 */
export function EtatEnLigne({ etat, urlVisite }: { etat: Etat; urlVisite?: string }) {
  const { appeler, erreur, enCours } = useAppelSite();
  const [menu, setMenu] = useState(false);
  const [confirme, setConfirme] = useState<Confirme | null>(null);
  const id = useId();
  const racine = useRef<HTMLDivElement>(null);
  const bouton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!menu) return;
    const dehors = (e: PointerEvent) => {
      if (!racine.current?.contains(e.target as Node)) setMenu(false);
    };
    const echap = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setMenu(false);
      bouton.current?.focus();
    };
    document.addEventListener('pointerdown', dehors);
    document.addEventListener('keydown', echap);
    return () => {
      document.removeEventListener('pointerdown', dehors);
      document.removeEventListener('keydown', echap);
    };
  }, [menu]);
  const changer = (e: Etat) => appeler('etat', { etat: e });
  const action = (libelle: string, icone: ReactNode, faire: () => void) => (
    <button
      key={libelle}
      type="button"
      className={item}
      onClick={() => {
        setMenu(false);
        faire();
      }}
    >
      <span aria-hidden="true">{icone}</span>
      {libelle}
    </button>
  );
  return (
    <div ref={racine} className="relative grid gap-1">
      <button
        ref={bouton}
        type="button"
        aria-expanded={menu}
        aria-controls={id}
        disabled={enCours}
        onClick={() => setMenu((o) => !o)}
        className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-control border border-trait bg-blanc px-4 font-semibold text-texte hover:bg-neutre-100 focus-visible:outline-2 focus-visible:outline-accent"
      >
        Gérer le site
        <CaretDownIcon size={16} weight="bold" aria-hidden="true" />
      </button>
      {menu ? (
        <div
          id={id}
          role="group"
          aria-label="Gérer le site"
          className="absolute top-full right-0 z-20 mt-1 grid w-max min-w-60 gap-0.5 rounded-[12px] border border-trait bg-blanc p-1.5 shadow-lg"
        >
          {urlVisite && etat !== 'retire' ? (
            <a
              href={urlVisite}
              target="_blank"
              rel="noopener"
              className={item}
              onClick={() => setMenu(false)}
            >
              <span aria-hidden="true">
                <ArrowSquareOutIcon size={18} />
              </span>
              Voir le site
            </a>
          ) : null}
          {etat !== 'en_ligne'
            ? action('Remettre en ligne', <GlobeIcon size={18} />, () => void changer('en_ligne'))
            : null}
          {etat !== 'maintenance'
            ? action('Mettre en maintenance', <WrenchIcon size={18} />, () =>
                setConfirme('maintenance'),
              )
            : null}
          {etat !== 'retire'
            ? action('Retirer le site', <ProhibitIcon size={18} />, () => setConfirme('retire'))
            : null}
        </div>
      ) : null}
      {confirme ? (
        <ConfirmDialog
          open
          onOpenChange={(o) => {
            if (!o) setConfirme(null);
          }}
          titre={CHOIX[confirme].titre}
          libelleConfirmer={CHOIX[confirme].confirmer}
          danger={confirme === 'retire'}
          onConfirmer={async () => {
            await changer(confirme);
            setConfirme(null);
          }}
        >
          {CHOIX[confirme].texte}
        </ConfirmDialog>
      ) : null}
      {erreur ? <Banner tone="danger">{erreur}</Banner> : null}
    </div>
  );
}
