'use client';

import {
  LIBELLES_MODE_SAISIE,
  MODES_SAISIE,
  type ResultatMentions,
  type Totaux,
} from '@ph/core/devis';
import { Badge, Checkbox } from '@ph/ui';
import { FileTextIcon, InfoIcon, ListBulletsIcon, UserCircleIcon } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import { versRapide, type EtatDevis } from '../etat';
import { PanneauMentions } from '../PanneauMentions';
import type { Blocs } from './blocs';

function Section({
  icone,
  titre,
  children,
}: {
  icone: ReactNode;
  titre: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="m-0 grid gap-0 border-0 p-0">
      <legend className="mb-1 flex items-center gap-2 text-[15px] font-bold">
        <span aria-hidden="true" className="text-neutre-700">
          {icone}
        </span>
        {titre}
      </legend>
      {children}
    </fieldset>
  );
}

const radio = 'flex min-h-11 cursor-pointer items-center gap-2.5 text-base';

/**
 * Panneau Options (captures du propriétaire) : uniquement des choix ; chaque case fait apparaître
 * ou disparaître un bloc sur la feuille, où tout se saisit. Mentions obligatoires en bas.
 */
export function PanneauOptions({
  e,
  maj,
  blocs,
  basculer,
  facture = false,
  totaux,
  mentions,
}: {
  e: EtatDevis;
  maj: (patch: Partial<EtatDevis>) => void;
  blocs: Blocs;
  basculer: (cle: keyof Blocs, oui: boolean) => void;
  facture?: boolean;
  totaux: Totaux;
  mentions: ResultatMentions;
}) {
  const mode = e.modeSaisie ?? 'complet';
  const caseBloc = (cle: keyof Blocs, libelle: string) => (
    <Checkbox checked={blocs[cle]} onChange={(x) => basculer(cle, x.target.checked)}>
      {libelle}
    </Checkbox>
  );
  return (
    <div className="grid gap-5">
      <Section icone={<FileTextIcon size={18} />} titre="Type de facturation">
        {MODES_SAISIE.map((m) => (
          <label key={m} className={radio}>
            <input
              type="radio"
              name="modeSaisie"
              checked={mode === m}
              onChange={() =>
                maj(
                  m === 'rapide'
                    ? { modeSaisie: m, lignes: versRapide(e.lignes) }
                    : { modeSaisie: m },
                )
              }
              className="size-5 accent-accent-action"
            />
            {LIBELLES_MODE_SAISIE[m].titre}
          </label>
        ))}
        <label
          className={`${radio} cursor-not-allowed text-neutre-600`}
          title="Factur-X, obligatoire entre professionnels en 2027 : bientôt disponible."
        >
          <input type="radio" name="modeSaisie" disabled className="size-5" />
          Format électronique
          <InfoIcon size={16} aria-hidden="true" />
          <Badge tone="neutre">Bientôt</Badge>
        </label>
      </Section>
      <Section icone={<UserCircleIcon size={18} />} titre="Client">
        {caseBloc('livraison', 'Adresse de livraison / du chantier')}
        <Checkbox
          checked={e.typeClient === 'pro'}
          onChange={(x) => maj({ typeClient: x.target.checked ? 'pro' : 'particulier' })}
        >
          SIREN ou SIRET (client professionnel)
        </Checkbox>
        {caseBloc('tvaIntra', 'N° de TVA intracommunautaire')}
        {!facture && e.typeClient === 'particulier' ? (
          <Checkbox
            checked={e.horsEtablissement}
            onChange={(x) => maj({ horsEtablissement: x.target.checked })}
          >
            Signé au domicile du client (rétractation 14 jours)
          </Checkbox>
        ) : null}
      </Section>
      <Section icone={<ListBulletsIcon size={18} />} titre="Info complémentaires">
        {facture ? null : caseBloc('debut', 'Début et durée des travaux')}
        {facture ? null : caseBloc('frais', 'Frais de déplacement')}
        {facture ? null : caseBloc('conditions', 'Conditions d’acceptation')}
        {facture ? null : (
          <Checkbox
            checked={Boolean(e.champSignature)}
            onChange={(x) => maj({ champSignature: x.target.checked })}
          >
            Champ signature
          </Checkbox>
        )}
        {facture ? null : caseBloc('intitule', 'Intitulé du document')}
        {caseBloc('champLibre', 'Champ libre')}
        {caseBloc('remise', 'Remise globale')}
        {facture ? null : (
          <>
            <Checkbox
              checked={e.devisGratuit}
              onChange={(x) => maj({ devisGratuit: x.target.checked })}
            >
              Devis gratuit
            </Checkbox>
            <Checkbox
              checked={e.signatureElectronique}
              onChange={(x) => maj({ signatureElectronique: x.target.checked })}
            >
              Acceptation en ligne par le client
            </Checkbox>
            <Checkbox checked={e.tampon} onChange={(x) => maj({ tampon: x.target.checked })}>
              Cachet de l’entreprise
            </Checkbox>
            {caseBloc('cout', 'Coûts d’achat (marge, jamais imprimée)')}
          </>
        )}
      </Section>
      <PanneauMentions totaux={totaux} mentions={mentions} />
    </div>
  );
}
