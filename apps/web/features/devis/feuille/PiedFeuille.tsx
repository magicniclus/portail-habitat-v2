import { TEXTE_BON_POUR_ACCORD, TEXTE_FRANCHISE, type Totaux } from '@ph/core/devis';
import { formatEuros } from '@ph/core/format';
import Link from 'next/link';
import { routes } from '@/lib/routes';
import type { EntrepriseFeuille } from '@/server/pageDevis';
import type { EtatDevis } from '../etat';

const eur = (c: number) => formatEuros(c, { decimales: 'toujours' });

/**
 * Bas de la feuille : totaux (calculés comme sur le serveur), mention de TVA lue dans Paramètres
 * (lien « Modifier »), conditions d'acceptation, champ libre, cadre de signature et identité.
 */
export function PiedFeuille({
  e,
  totaux,
  franchiseTva,
  entreprise,
}: {
  e: EtatDevis;
  totaux: Totaux;
  franchiseTva: boolean;
  entreprise: EntrepriseFeuille;
}) {
  return (
    <>
      <dl className="m-0 ml-auto grid w-full max-w-[300px] gap-1 text-[15px] tabular-nums">
        {totaux.remiseCentimes > 0 ? (
          <div className="flex justify-between">
            <dt>Remise</dt>
            <dd className="m-0">− {eur(totaux.remiseCentimes)}</dd>
          </div>
        ) : null}
        <div className="flex justify-between">
          <dt>Total HT</dt>
          <dd className="m-0">{eur(totaux.htCentimes)}</dd>
        </div>
        {Object.entries(totaux.tva).map(([t, m]) => (
          <div key={t} className="flex justify-between">
            <dt>TVA {t.replace('.', ',')} %</dt>
            <dd className="m-0">{eur(m)}</dd>
          </div>
        ))}
        <div className="flex justify-between rounded-[8px] bg-accent-100 px-2 py-1.5 text-lg font-bold">
          <dt>Total TTC</dt>
          <dd className="m-0" data-testid="total-ttc-devis">
            {eur(totaux.ttcCentimes)}
          </dd>
        </div>
        {totaux.acompteCentimes > 0 ? (
          <div className="flex justify-between text-sm text-neutre-800">
            <dt>Acompte à la signature</dt>
            <dd className="m-0">{eur(totaux.acompteCentimes)}</dd>
          </div>
        ) : null}
      </dl>
      <div className="grid gap-3 border-t border-trait pt-4 text-[13px] leading-[1.5] text-neutre-800">
        <p className="m-0">
          {franchiseTva ? TEXTE_FRANCHISE : 'TVA appliquée aux taux indiqués sur chaque ligne.'}{' '}
          <Link href={routes.proDevisParametres} className="text-accent-700 underline print:hidden">
            Modifier
          </Link>
        </p>
        {e.conditionsAcceptation?.trim() ? (
          <p className="m-0 whitespace-pre-line">{e.conditionsAcceptation}</p>
        ) : null}
        {e.champLibre?.texte.trim() ? (
          <p className="m-0 whitespace-pre-line">
            {e.champLibre.titre.trim() ? <strong>{e.champLibre.titre} : </strong> : null}
            {e.champLibre.texte}
          </p>
        ) : null}
        {e.champSignature ? (
          <div className="ml-auto grid h-28 w-full max-w-[300px] content-start gap-1 rounded-[8px] border border-dashed border-neutre-400 p-2.5">
            <span>{TEXTE_BON_POUR_ACCORD}</span>
          </div>
        ) : null}
        <p className="m-0 text-center text-xs text-neutre-700">
          {[
            entreprise.nom,
            entreprise.siret && `SIRET ${entreprise.siret}`,
            entreprise.naf && `NAF ${entreprise.naf}`,
            entreprise.tvaIntra && `TVA ${entreprise.tvaIntra}`,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </div>
    </>
  );
}
