'use client';

import { Button, Checkbox, Feuille } from '@ph/ui';
import { useState } from 'react';

/** Détail des catégories, chargé seulement à l'ouverture (Radix Dialog hors du JavaScript initial). */
export default function PreferencesCookies({
  audienceInitiale,
  enregistrer,
  fermer,
}: {
  audienceInitiale: boolean;
  enregistrer: (audience: boolean) => void;
  fermer: () => void;
}) {
  const [audience, setAudience] = useState(audienceInitiale);
  return (
    <Feuille
      open
      onOpenChange={(o) => (o ? undefined : fermer())}
      titre="Gérer les cookies"
      description="Vous pouvez changer d'avis à tout moment depuis le lien « Gérer les cookies » en bas de page."
      actions={
        <Button pleineLargeur onClick={() => enregistrer(audience)}>
          Enregistrer mes choix
        </Button>
      }
    >
      <div className="grid gap-4">
        <div>
          <p className="m-0 font-semibold">Indispensables</p>
          <p className="m-0 text-sm text-neutre-800">
            Connexion, sécurité, mémorisation de ce choix. Toujours actifs, ils ne servent à aucun
            suivi.
          </p>
        </div>
        <Checkbox checked={audience} onChange={(e) => setAudience(e.target.checked)}>
          <span className="grid gap-0.5">
            <span className="font-semibold">Mesure d&apos;audience détaillée</span>
            <span className="text-sm text-neutre-800">
              Parcours de navigation anonymisés pour améliorer les pages, hébergés en Union
              européenne.
            </span>
          </span>
        </Checkbox>
      </div>
    </Feuille>
  );
}
