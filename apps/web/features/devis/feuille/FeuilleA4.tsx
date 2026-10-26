'use client';

import type { TauxTva, Totaux } from '@ph/core/devis';
import { formatEuros } from '@ph/core/format';
import type { PrestationBiblio } from '@ph/firebase/devis';
import { cn } from '@ph/ui';
import type { EntrepriseFeuille } from '@/server/pageDevis';
import type { EtatDevis } from '../etat';
import type { Blocs } from './blocs';
import { EnTeteFeuille } from './EnTeteFeuille';
import { caseLigne } from './CasesFeuille';
import { LignesFeuille } from './LignesFeuille';
import { PiedFeuille } from './PiedFeuille';
import { RangeeDocument } from './RangeeDocument';

const zone = cn(caseLigne, 'resize-none py-2.5 leading-[1.5] [field-sizing:content]');

/**
 * La feuille A4 de l'éditeur (captures du propriétaire, à nos couleurs) : en-tête entreprise et
 * client, rangée du document, lignes, totaux et pied. Les blocs facultatifs n'apparaissent que
 * cochés dans Options. Ce n'est pas le PDF (produit côté serveur, DEV-05).
 */
export function FeuilleA4({
  e,
  maj,
  blocs,
  totaux,
  entreprise,
  franchiseTva,
  tvaDefaut,
  bibliotheque,
  aujourdHui,
  onMessage,
  typeDocument = 'devis',
}: {
  /** Facture sans devis : titre, date de prestation, pas de validité. */
  typeDocument?: 'devis' | 'facture';
  e: EtatDevis;
  maj: (patch: Partial<EtatDevis>) => void;
  blocs: Blocs;
  totaux: Totaux;
  entreprise: EntrepriseFeuille;
  franchiseTva: boolean;
  tvaDefaut: TauxTva;
  bibliotheque: PrestationBiblio[];
  aujourdHui: number;
  onMessage: (m: { ton: 'succes' | 'danger'; texte: string }) => void;
}) {
  const facture = typeDocument === 'facture';
  const remise = blocs.remise ? (
    <div className="flex flex-wrap items-center justify-end gap-2 border-t border-dashed border-neutre-300 pt-2 text-[15px]">
      <label className="flex items-center gap-2 font-semibold">
        Remise globale
        <input
          aria-label="Remise globale (%)"
          inputMode="decimal"
          value={e.remisePct}
          onChange={(x) => maj({ remisePct: x.target.value })}
          className={cn(caseLigne, 'w-20 text-right')}
        />
        %
      </label>
      <span className="min-w-28 text-right tabular-nums">
        − {formatEuros(totaux.remiseCentimes, { decimales: 'toujours' })}
      </span>
    </div>
  ) : null;
  return (
    <article
      aria-label={facture ? 'Feuille de la facture' : 'Feuille du devis'}
      className="mx-auto grid w-full max-w-[900px] min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-7 rounded-[4px] bg-blanc px-[clamp(16px,5vw,56px)] py-[clamp(20px,5vw,56px)] shadow-lg sm:min-h-[1160px]"
    >
      <EnTeteFeuille
        entreprise={entreprise}
        e={e}
        maj={maj}
        blocs={{
          livraison: blocs.livraison,
          siren: e.typeClient === 'pro',
          tvaIntra: blocs.tvaIntra,
        }}
      />
      <RangeeDocument
        e={e}
        maj={maj}
        aujourdHui={aujourdHui}
        facture={facture}
        intitule={blocs.intitule}
      />
      {facture ? null : (
        <textarea
          aria-label="Description"
          rows={1}
          placeholder="Description des travaux (facultatif)"
          value={e.descriptionHtml}
          onChange={(x) => maj({ descriptionHtml: x.target.value })}
          className={zone}
        />
      )}
      <LignesFeuille
        lignes={e.lignes}
        tvaDefaut={tvaDefaut}
        bibliotheque={bibliotheque}
        rapide={e.modeSaisie === 'rapide'}
        avecCout={blocs.cout}
        onChange={(lignes) => maj({ lignes })}
        onMessage={onMessage}
        apresLignes={remise}
      />
      <PiedFeuille
        typeDocument={typeDocument}
        e={e}
        maj={maj}
        totaux={totaux}
        franchiseTva={franchiseTva}
        entreprise={entreprise}
        blocs={{
          conditions: blocs.conditions,
          signature: Boolean(e.champSignature),
          champLibre: blocs.champLibre,
        }}
      />
      {facture ? null : (
        <textarea
          aria-label="Notes (imprimées sur le devis)"
          rows={1}
          placeholder="Notes (facultatif, imprimées sur le devis)"
          value={e.notes}
          onChange={(x) => maj({ notes: x.target.value })}
          className={zone}
        />
      )}
    </article>
  );
}
