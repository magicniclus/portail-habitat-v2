'use client';

import type { TauxTva, Totaux } from '@ph/core/devis';
import { formatDate } from '@ph/core/format';
import type { PrestationBiblio } from '@ph/firebase/devis';
import type { EntrepriseFeuille } from '@/server/pageDevis';
import type { EtatDevis } from '../etat';
import { ChampFeuille, ZoneFeuille } from './ChampFeuille';
import { EnTeteFeuille } from './EnTeteFeuille';
import { LignesFeuille } from './LignesFeuille';
import { PiedFeuille } from './PiedFeuille';

/**
 * La feuille A4 de l'éditeur (captures du propriétaire, à nos couleurs) : tout se saisit sur la
 * feuille ; ce n'est pas le PDF (produit côté serveur à l'envoi, DEV-05).
 */
export function FeuilleA4({
  e,
  maj,
  totaux,
  entreprise,
  franchiseTva,
  tvaDefaut,
  bibliotheque,
  avecCout,
  aujourdHui,
  onMessage,
}: {
  e: EtatDevis;
  maj: (patch: Partial<EtatDevis>) => void;
  totaux: Totaux;
  entreprise: EntrepriseFeuille;
  franchiseTva: boolean;
  tvaDefaut: TauxTva;
  bibliotheque: PrestationBiblio[];
  avecCout: boolean;
  aujourdHui: number;
  onMessage: (m: { ton: 'succes' | 'danger'; texte: string }) => void;
}) {
  return (
    <article
      aria-label="Feuille du devis"
      className="mx-auto grid w-full max-w-[820px] content-start gap-7 rounded-[4px] bg-blanc px-[clamp(16px,5vw,56px)] py-[clamp(20px,5vw,56px)] shadow-lg sm:min-h-[1160px]"
    >
      <EnTeteFeuille
        entreprise={entreprise}
        client={e.client}
        onClient={(p) => maj({ client: { ...e.client, ...p } })}
      />
      <div className="grid gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <p className="m-0 text-[clamp(22px,3vw,28px)] font-bold">
            {e.intitule?.trim() || 'Devis'}{' '}
            <span className="font-normal text-neutre-700">
              {e.numero ?? '(numéro à l’enregistrement)'}
            </span>
          </p>
          <div className="flex flex-wrap items-center gap-x-4 text-sm text-neutre-800">
            <span>Émis le {formatDate(aujourdHui)}</span>
            <label className="flex items-center gap-1">
              Valable jusqu’au
              <ChampFeuille
                aria-label="Valable jusqu’au"
                type="date"
                value={e.validiteLe}
                onChange={(x) => maj({ validiteLe: x.target.value })}
                className="w-auto"
              />
            </label>
          </div>
        </div>
        <ChampFeuille
          aria-label="Objet du devis"
          placeholder="Objet du devis (ex. Rénovation de la salle de bain)"
          value={e.objet}
          onChange={(x) => maj({ objet: x.target.value })}
          className="text-lg font-semibold sm:text-lg"
        />
        <ZoneFeuille
          aria-label="Description"
          placeholder="Description des travaux (facultatif)"
          value={e.descriptionHtml}
          onChange={(x) => maj({ descriptionHtml: x.target.value })}
          className="text-neutre-800"
        />
        {e.adresseChantier?.trim() ? (
          <p className="m-0 px-1.5 text-sm text-neutre-800">
            <strong>Adresse du chantier :</strong> {e.adresseChantier}
          </p>
        ) : null}
      </div>
      <LignesFeuille
        lignes={e.lignes}
        tvaDefaut={tvaDefaut}
        bibliotheque={bibliotheque}
        rapide={e.modeSaisie === 'rapide'}
        avecCout={avecCout}
        onChange={(lignes) => maj({ lignes })}
        onMessage={onMessage}
      />
      <PiedFeuille e={e} totaux={totaux} franchiseTva={franchiseTva} entreprise={entreprise} />
    </article>
  );
}
