import { TEXTE_BON_POUR_ACCORD, TEXTE_FRANCHISE, type Totaux } from '@ph/core/devis';
import { formatEuros } from '@ph/core/format';
import Link from 'next/link';
import { routes } from '@/lib/routes';
import type { EntrepriseFeuille } from '@/server/pageDevis';
import type { EtatDevis } from '../etat';
import { BlocCases, Case } from './CasesFeuille';

const eur = (c: number) => formatEuros(c, { decimales: 'toujours' });
const MAX_CONDITIONS = 1000;
const zone =
  'min-h-11 w-full resize-none rounded-[6px] border border-dashed border-neutre-300 bg-blanc px-3 py-2.5 text-base leading-[1.5] text-texte placeholder:text-neutre-500 placeholder:italic [field-sizing:content] focus:border-solid focus:border-accent focus:bg-accent-100 focus:outline-none';

/** Blocs facultatifs du bas, cochés dans Options › Info complémentaires. */
export interface BlocsPied {
  conditions: boolean;
  signature: boolean;
  champLibre: boolean;
}

/**
 * Bas de la feuille (captures) : totaux, mention de TVA lue dans Paramètres (lien « Modifier »),
 * conditions d'acceptation avec compteur, champ libre, cadre de signature, identité.
 */
export function PiedFeuille({
  typeDocument = 'devis',
  e,
  maj,
  totaux,
  franchiseTva,
  entreprise,
  blocs,
}: {
  typeDocument?: 'devis' | 'facture';
  e: EtatDevis;
  maj: (patch: Partial<EtatDevis>) => void;
  totaux: Totaux;
  franchiseTva: boolean;
  entreprise: EntrepriseFeuille;
  blocs: BlocsPied;
}) {
  const devis = typeDocument === 'devis';
  const libre = e.champLibre ?? { titre: '', texte: '' };
  return (
    <>
      <dl className="m-0 ml-auto grid w-full max-w-[340px] gap-1.5 text-[15px] tabular-nums">
        {totaux.remiseCentimes > 0 ? (
          <div className="flex justify-between px-3">
            <dt>Remise</dt>
            <dd className="m-0">− {eur(totaux.remiseCentimes)}</dd>
          </div>
        ) : null}
        <div className="flex justify-between px-3 text-neutre-800">
          <dt>Total HT</dt>
          <dd className="m-0">{eur(totaux.htCentimes)}</dd>
        </div>
        {Object.entries(totaux.tva).map(([t, m]) => (
          <div key={t} className="flex justify-between px-3 text-neutre-800">
            <dt>TVA {t.replace('.', ',')} %</dt>
            <dd className="m-0">{eur(m)}</dd>
          </div>
        ))}
        <div className="flex items-center justify-between px-3 pt-1 text-xl font-bold text-accent-700">
          <dt>Total TTC</dt>
          <dd className="m-0 rounded-pill bg-accent-100 px-4 py-1.5" data-testid="total-ttc-devis">
            {eur(totaux.ttcCentimes)}
          </dd>
        </div>
        {devis && totaux.acompteCentimes > 0 ? (
          <div className="flex justify-between px-3 text-sm text-neutre-800">
            <dt>Acompte à la signature</dt>
            <dd className="m-0">{eur(totaux.acompteCentimes)}</dd>
          </div>
        ) : null}
      </dl>
      <div className="grid gap-3 border-t border-trait pt-5 text-[15px]">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[6px] border border-dashed border-neutre-300 px-3 py-2.5 text-neutre-800">
          <span className="flex-1">
            {franchiseTva ? TEXTE_FRANCHISE : 'TVA appliquée aux taux indiqués sur chaque ligne.'}
          </span>
          <Link
            href={routes.proDevisParametres}
            className="inline-flex min-h-11 items-center text-sm font-semibold"
          >
            Modifier
          </Link>
        </div>
        {devis && blocs.conditions ? (
          <div className="grid gap-1">
            <textarea
              aria-label="Conditions d’acceptation"
              rows={2}
              maxLength={MAX_CONDITIONS}
              value={e.conditionsAcceptation ?? ''}
              onChange={(x) => maj({ conditionsAcceptation: x.target.value })}
              className={zone}
            />
            <span className="justify-self-end text-xs text-neutre-700">
              {MAX_CONDITIONS - (e.conditionsAcceptation?.length ?? 0)} caractères restants
            </span>
          </div>
        ) : null}
        {blocs.champLibre ? (
          <BlocCases>
            <Case
              aria-label="Champ libre : titre"
              placeholder="Titre (ex. Garanties)"
              value={libre.titre}
              onChange={(x) => maj({ champLibre: { ...libre, titre: x.target.value } })}
              principal
            />
            <textarea
              aria-label="Champ libre : texte"
              rows={2}
              placeholder="Texte libre imprimé sur le document"
              value={libre.texte}
              onChange={(x) => maj({ champLibre: { ...libre, texte: x.target.value } })}
              className={`${zone} rounded-none border-0`}
            />
          </BlocCases>
        ) : null}
        {devis && blocs.signature ? (
          <div className="ml-auto grid h-32 w-full max-w-[320px] content-start rounded-[8px] border border-dashed border-neutre-400 p-3 text-[13px] text-neutre-800">
            {TEXTE_BON_POUR_ACCORD}
          </div>
        ) : null}
        <p className="m-0 text-center text-xs leading-[1.6] text-neutre-700">
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
