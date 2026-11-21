'use client';

import { zonesGlobales, type Section } from '@ph/core/sites';
import { Button } from '@ph/ui';
import { Groupe, Info } from './controles';
import type { ContexteReglages } from './contexte';

const identifiant = () =>
  `g${Array.from(crypto.getRandomValues(new Uint8Array(10)), (o) => 'abcdefghijklmnopqrstuvwxyz0123456789'[o % 36]).join('')}`;

/**
 * Zone globale (pied de page, bandeau d'appel, réassurance…) : réutilisée sur plusieurs pages
 * depuis Ajouter › Zones ; une modification sur une page s'applique partout. « Détacher » rend
 * cette copie indépendante.
 */
export function ReglagesGlobale({ zone: z, c }: { zone: Section; c: ContexteReglages }) {
  const g = z.p.globale;
  const pages = g ? (zonesGlobales(c.pages).find((x) => x.globale === g)?.pages ?? 1) : 0;
  return (
    <Groupe titre="Zone globale">
      {g ? (
        <>
          <Info>
            Présente sur {pages} page{pages > 1 ? 's' : ''} : chaque modification s’applique
            partout.
          </Info>
          <div>
            <Button variant="secondaire" taille="sm" onClick={() => c.maj({ globale: undefined })}>
              Détacher sur cette page
            </Button>
          </div>
        </>
      ) : (
        <>
          <Info>
            Réutilisez cette zone sur d’autres pages (Ajouter › Zones › Zones globales) ; une
            modification sera faite partout à la fois.
          </Info>
          <div>
            <Button
              variant="secondaire"
              taille="sm"
              onClick={() => c.maj({ globale: identifiant() })}
            >
              Rendre cette zone globale
            </Button>
          </div>
        </>
      )}
    </Groupe>
  );
}
