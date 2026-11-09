'use client';

import { Banner, Button, ConfirmDialog } from '@ph/ui';
import { useState } from 'react';
import { useAppelSite } from './appelSite';

type Etat = 'en_ligne' | 'maintenance' | 'retire';

const CHOIX: Record<
  Exclude<Etat, 'en_ligne'>,
  { bouton: string; titre: string; texte: string; confirmer: string }
> = {
  maintenance: {
    bouton: 'Mettre en maintenance',
    titre: 'Mettre le site en maintenance ?',
    texte:
      'Vos visiteurs verront une page « Site en maintenance, revenez bientôt » avec votre nom, à la place de vos pages. Rien n’est effacé : vous le remettez en ligne d’un clic.',
    confirmer: 'Mettre en maintenance',
  },
  retire: {
    bouton: 'Retirer le site',
    titre: 'Retirer le site d’Internet ?',
    texte:
      'Votre adresse n’affichera plus rien et Google finira par oublier vos pages. Rien n’est effacé : vos pages restent dans l’éditeur et vous le remettez en ligne d’un clic.',
    confirmer: 'Retirer le site',
  },
};

/**
 * Site publié : le passer en maintenance, le retirer d'Internet, ou le remettre en ligne. Chaque
 * changement est confirmé ; effet en moins d'une minute.
 */
export function EtatEnLigne({ etat }: { etat: Etat }) {
  const { appeler, erreur, enCours } = useAppelSite();
  const [ouvert, setOuvert] = useState<Exclude<Etat, 'en_ligne'> | null>(null);
  const changer = (e: Etat) => appeler('etat', { etat: e });
  return (
    <span className="flex flex-wrap items-center gap-2">
      {etat !== 'en_ligne' ? (
        <Button onClick={() => void changer('en_ligne')} disabled={enCours}>
          Remettre en ligne
        </Button>
      ) : null}
      {(['maintenance', 'retire'] as const)
        .filter((e) => e !== etat)
        .map((e) => (
          <ConfirmDialog
            key={e}
            open={ouvert === e}
            onOpenChange={(o) => setOuvert(o ? e : null)}
            declencheur={
              <Button variant="fantome" disabled={enCours}>
                {CHOIX[e].bouton}
              </Button>
            }
            titre={CHOIX[e].titre}
            libelleConfirmer={CHOIX[e].confirmer}
            danger={e === 'retire'}
            onConfirmer={async () => {
              await changer(e);
              setOuvert(null);
            }}
          >
            {CHOIX[e].texte}
          </ConfirmDialog>
        ))}
      {erreur ? <Banner tone="danger">{erreur}</Banner> : null}
    </span>
  );
}
