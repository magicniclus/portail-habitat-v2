import type { NomModele } from '@ph/core/notifications';
import { definition } from '@ph/core/notifications';
import { charteEmail } from '../chartes';
import { MODELES_EMAIL } from '../index';
import { Email } from '../rendu/Email';

const pied = {
  preferences: 'https://portailhabitat.fr/preferences',
  desabonnement: 'https://portailhabitat.fr/api/desabonnement',
  aide: 'https://portailhabitat.fr/aide',
  editeur: 'Portail Habitat · Raison sociale · Adresse postale',
};

/** Aperçu d'un modèle avec ses données d'exemple (serveur `pnpm email:dev`). */
export function apercu(nom: NomModele) {
  const m = MODELES_EMAIL[nom] as unknown as {
    preheader: (d: unknown) => string;
    blocs: (d: unknown) => never[];
    exemple: unknown;
  };
  const def = definition(nom);
  return function Apercu() {
    return (
      <Email
        preheader={m.preheader(m.exemple)}
        blocs={m.blocs(m.exemple)}
        charte={charteEmail(def.charte, 'pro')}
        categorie={def.categorie}
        pied={pied}
      />
    );
  };
}
