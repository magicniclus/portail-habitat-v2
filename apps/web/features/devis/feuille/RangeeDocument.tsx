import { formatDate } from '@ph/core/format';
import type { ReactNode } from 'react';
import type { EtatDevis } from '../etat';
import { BlocCases, Case } from './CasesFeuille';

const JOUR_MS = 86_400_000;
const jourIso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Case étiquetée « Libellé : [champ] » (période de validité, début des travaux…). */
function CaseEtiquetee({ libelle, children }: { libelle: string; children: ReactNode }) {
  return (
    <label className="flex min-h-11 items-center gap-1.5 rounded-[6px] border border-dashed border-neutre-300 bg-blanc pl-3 text-[15px] text-neutre-800">
      <span className="whitespace-nowrap">{libelle} :</span>
      {children}
    </label>
  );
}
const champBase =
  'min-h-11 min-w-0 border-0 bg-transparent px-1.5 text-base text-texte placeholder:text-neutre-500 placeholder:italic focus:bg-accent-100 focus:outline-2 focus:-outline-offset-2 focus:outline-accent';
const champCase = `${champBase} w-0 flex-1`;
const champCourt = `${champBase} ml-auto w-16 flex-none text-right`;

/**
 * Sous l'en-tête (captures du propriétaire) : intitulé, date d'émission, période de validité en
 * jours (devis) ou date de prestation (facture), objet ; puis les cases du chantier (devis).
 */
export function RangeeDocument({
  e,
  maj,
  aujourdHui,
  facture,
  intitule,
}: {
  e: EtatDevis;
  maj: (patch: Partial<EtatDevis>) => void;
  aujourdHui: number;
  facture: boolean;
  /** Options › « Intitulé du document » cochée : l'intitulé se saisit à la place de « Devis ». */
  intitule: boolean;
}) {
  const jours = e.validiteLe
    ? Math.max(0, Math.round((Date.parse(`${e.validiteLe}T12:00:00Z`) - aujourdHui) / JOUR_MS))
    : '';
  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-[minmax(0,1fr)] items-end gap-3 sm:grid-cols-[minmax(0,1fr)_190px_minmax(0,1.3fr)]">
        <div className="grid gap-1">
          {intitule && !facture ? (
            <BlocCases>
              <Case
                aria-label="Intitulé du document"
                placeholder="Devis"
                value={e.intitule ?? ''}
                onChange={(x) => maj({ intitule: x.target.value })}
                principal
              />
            </BlocCases>
          ) : (
            <p className="m-0 flex min-h-11 items-center px-1 text-lg font-semibold">
              {facture ? 'Facture' : 'Devis'}
              {e.numero ? (
                <span className="ml-2 font-normal text-neutre-700">{e.numero}</span>
              ) : null}
            </p>
          )}
        </div>
        <div className="grid gap-1">
          <span className="px-1 text-xs text-neutre-700">Date d’émission</span>
          <span className="flex min-h-11 items-center rounded-[8px] border border-trait bg-blanc px-3 text-base">
            {formatDate(aujourdHui)}
          </span>
        </div>
        {facture ? (
          <CaseEtiquetee libelle="Date de la prestation">
            <input
              aria-label="Date de la prestation"
              type="date"
              value={e.datePrestationLe ?? ''}
              onChange={(x) => maj({ datePrestationLe: x.target.value })}
              className={champCase}
            />
          </CaseEtiquetee>
        ) : (
          <CaseEtiquetee libelle="Période de validité">
            <input
              aria-label="Période de validité (jours)"
              inputMode="numeric"
              value={jours}
              onChange={(x) => {
                const n = Number(x.target.value.replace(/\D/g, ''));
                maj({ validiteLe: n ? jourIso(aujourdHui + n * JOUR_MS) : '' });
              }}
              className={champCourt}
            />
            <span className="pr-3">jours</span>
          </CaseEtiquetee>
        )}
      </div>
      <BlocCases>
        <Case
          aria-label={facture ? 'Objet de la facture' : 'Objet du devis'}
          placeholder={
            facture ? 'Objet de la facture' : 'Objet du devis (ex. Rénovation de la salle de bain)'
          }
          value={e.objet}
          onChange={(x) => maj({ objet: x.target.value })}
          principal
        />
      </BlocCases>
      {facture ? null : (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-2 sm:grid-cols-2">
          <CaseEtiquetee libelle="Début des travaux">
            <input
              aria-label="Début des travaux"
              type="date"
              value={e.debutTravauxLe}
              onChange={(x) => maj({ debutTravauxLe: x.target.value })}
              className={champCase}
            />
          </CaseEtiquetee>
          <CaseEtiquetee libelle="Durée estimée">
            <input
              aria-label="Durée estimée"
              placeholder="5 jours ouvrés"
              value={e.dureeEstimee}
              onChange={(x) => maj({ dureeEstimee: x.target.value })}
              className={champCase}
            />
          </CaseEtiquetee>
          <CaseEtiquetee libelle="Frais de déplacement">
            <input
              aria-label="Frais de déplacement"
              value={e.fraisDeplacement}
              onChange={(x) => maj({ fraisDeplacement: x.target.value })}
              className={champCase}
            />
          </CaseEtiquetee>
          <CaseEtiquetee libelle="Acompte à la signature">
            <input
              aria-label="Acompte (%)"
              inputMode="decimal"
              value={e.acomptePct}
              onChange={(x) => maj({ acomptePct: x.target.value })}
              className={champCourt}
            />
            <span className="pr-3">%</span>
          </CaseEtiquetee>
        </div>
      )}
    </div>
  );
}
