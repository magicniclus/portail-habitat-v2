import { cn } from '@ph/ui';
import type { ReactNode } from 'react';

export const BASE = '/landing/videos/site';

/** Les 4 temps du site, filmés dans le vrai éditeur (`public/landing/videos/site/{id}.mp4`). */
export const ETAPES = [
  {
    id: 'ia',
    titre: 'L’IA crée votre site',
    texte:
      'Répondez à quelques questions : l’IA reprend votre fiche, vos photos et vos avis, puis écrit toutes vos pages. Accueil, prestations, réalisations, avis, contact.',
    url: 'portailtravaux.fr/pro/site/editeur',
  },
  {
    id: 'modifier',
    titre: 'Vous modifiez en un clic',
    texte:
      'Cliquez sur un texte pour le changer, vérifiez le rendu sur téléphone. Rien n’est publié sans votre accord.',
    url: 'portailtravaux.fr/pro/site/editeur',
  },
  {
    id: 'en-ligne',
    titre: 'Votre site est en ligne',
    texte:
      'Un clic sur « Publier » : votre site est en ligne avec son adresse, son menu et toutes ses pages, sur ordinateur comme sur téléphone.',
    url: 'bertrand-renovation.portailtravaux.fr',
  },
  {
    id: 'clients',
    titre: 'Les demandes arrivent',
    texte:
      'L’IA rédige le titre et la description de chaque page pour Google. Quand un client remplit le formulaire de votre site, sa demande arrive dans votre espace.',
    url: 'portailtravaux.fr/pro/demandes',
  },
] as const;
export function TexteEtape(p: { i: number; titre: string; texte: string; court?: boolean }) {
  return (
    <span className="grid gap-1.5">
      <span className="flex items-center gap-3 text-[clamp(18px,1.8vw,22px)] leading-tight font-bold">
        <span className="flex size-8 flex-none items-center justify-center rounded-full bg-accent text-[15px] text-blanc">
          {p.i + 1}
        </span>
        {p.titre}
      </span>
      <span
        className={cn('text-[15.5px] leading-[24px] text-neutre-800', p.court && 'line-clamp-1')}
      >
        {p.texte}
      </span>
    </span>
  );
}

/** Cadre de navigateur autour des vidéos (barre d'adresse de l'étape). */
export function Ecran(p: { url: string; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[16px] border border-trait bg-blanc shadow-lg">
      <div className="flex items-center gap-3 border-b border-trait bg-neutre-100/60 px-3.5 py-2">
        <span aria-hidden="true" className="flex flex-none gap-1.5">
          {[0, 1, 2].map((i) => (
            <span key={i} className="size-2.5 rounded-full bg-neutre-200" />
          ))}
        </span>
        <span className="min-w-0 flex-1 truncate rounded-[8px] bg-blanc px-3 py-1 text-[13px] text-neutre-700">
          {p.url}
        </span>
      </div>
      <div className="relative aspect-[16/10] bg-neutre-100">{p.children}</div>
    </div>
  );
}
