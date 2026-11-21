'use client';

import type { SortieIaBlog } from '@ph/core/blog';
import { Button } from '@ph/ui';

export type ReponseIaBlog = SortieIaBlog & { avertissements: string[]; restant: number };
type Reponse = ReponseIaBlog;

/** Propositions de retouche de l’IA : chacune s’applique d’un clic (« Utiliser »). */
export function PropositionsIa({
  r,
  appliquer,
  onIdee,
}: {
  r: Reponse;
  appliquer: (r: SortieIaBlog, choix?: string) => void;
  onIdee: (sujet: string) => void;
}) {
  const ligne = (texte: string, faire: () => void, libelle = 'Utiliser') => (
    <li key={texte} className="grid gap-2 rounded-[12px] border border-trait p-3">
      <span className="text-[15px]">{texte}</span>
      <span>
        <Button taille="sm" variant="secondaire" onClick={faire}>
          {libelle}
        </Button>
      </span>
    </li>
  );
  return (
    <ul className="m-0 grid list-none gap-2 p-0" aria-label="Propositions de l’IA">
      {r.action === 'titres' || r.action === 'meta' || r.action === 'alt'
        ? r.sortie.propositions.map((p) => ligne(p, () => appliquer(r, p)))
        : null}
      {r.action === 'classement'
        ? ligne(
            [r.sortie.categorie, ...r.sortie.tags.map((t) => `#${t}`)].filter(Boolean).join(' · '),
            () => appliquer(r),
          )
        : null}
      {r.action === 'idees'
        ? r.sortie.idees.map((i) =>
            ligne(`${i.titre} (${i.motCle})`, () => onIdee(i.titre), 'Rédiger sur ce sujet'),
          )
        : null}
      {r.action === 'reseaux'
        ? ligne('Textes prêts dans l’onglet Diffusion.', () => appliquer(r), 'Afficher')
        : null}
    </ul>
  );
}
