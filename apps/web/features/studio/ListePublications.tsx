'use client';

import { RESEAUX } from '@ph/core/studio';
import { formatDate, formatNombre } from '@ph/core/format';
import type { PublicationStudio, StatutPublication } from '@ph/firebase/studio';
import { Badge, Button } from '@ph/ui';
import { useTransition } from 'react';
import { MajChiffres } from './MajChiffres';
import { annulerPublication, relancerPublication } from './publication';

const STATUTS: Record<
  StatutPublication,
  [string, 'neutre' | 'info' | 'succes' | 'danger' | 'attention']
> = {
  programmee: ['Programmée', 'info'],
  en_cours: ['Envoi en cours', 'attention'],
  publiee: ['Publiée', 'succes'],
  echec: ['Échec', 'danger'],
  annulee: ['Annulée', 'neutre'],
};

/** Publications d'une vidéo ou d'une journée : statut, lien, résultats, annuler ou relancer. */
export function ListePublications({
  publications,
  avecTitre = false,
}: {
  publications: PublicationStudio[];
  avecTitre?: boolean;
}) {
  const [enCours, demarrer] = useTransition();
  return (
    <ul className="m-0 grid list-none gap-2 p-0">
      {publications.map((p) => {
        const [libelle, ton] = STATUTS[p.statut];
        return (
          <li
            key={p.id}
            className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-control border border-trait px-3 py-2 text-sm"
          >
            <span className="font-semibold">{RESEAUX[p.reseau].libelle}</span>
            <span className="tabular-nums text-neutre-700">
              {formatDate(p.programmeeLe, 'dateHeure')}
            </span>
            {avecTitre ? <span className="min-w-0 flex-1 truncate">{p.titre}</span> : null}
            <Badge tone={ton}>
              {p.prive ? `${libelle} (privée)` : p.manuelle ? `${libelle} (à la main)` : libelle}
            </Badge>
            {p.stats ? (
              <span className="tabular-nums">
                {formatNombre(p.stats.vues)} vues
                {p.stats.retention !== null
                  ? ` · ${Math.round(p.stats.retention * 100)} % regardé`
                  : ''}
              </span>
            ) : null}
            {p.lien ? (
              <a href={p.lien} target="_blank" rel="noopener noreferrer">
                Voir ↗
              </a>
            ) : null}
            {p.erreur ? <span className="w-full text-danger">{p.erreur}</span> : null}
            {p.manuelle ? <MajChiffres publication={p} /> : null}
            {p.statut === 'programmee' ? (
              <Button
                variant="fantome"
                taille="sm"
                disabled={enCours}
                onClick={() =>
                  demarrer(async () => void (await annulerPublication({ publicationId: p.id })))
                }
              >
                Annuler
              </Button>
            ) : null}
            {p.statut === 'echec' ? (
              <Button
                variant="fantome"
                taille="sm"
                disabled={enCours}
                onClick={() =>
                  demarrer(async () => void (await relancerPublication({ publicationId: p.id })))
                }
              >
                Relancer
              </Button>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
