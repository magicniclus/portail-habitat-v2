import { ArrowLineUpIcon } from '@phosphor-icons/react/ssr';
import Link from 'next/link';
import type { EntrepriseFeuille } from '@/server/pageDevis';
import { routes } from '@/lib/routes';
import type { ClientSaisi, EtatDevis } from '../etat';
import { BlocCases, Case, DeuxCases } from './CasesFeuille';

/** Blocs facultatifs de l'en-tête, cochés dans Options › Client. */
export interface BlocsClient {
  livraison: boolean;
  siren: boolean;
  tvaIntra: boolean;
}

/**
 * Haut de la feuille (captures du propriétaire) : logo et coordonnées de l'entreprise (Paramètres),
 * adresse de livraison facultative dessous ; à droite le bloc client en cases, puis SIREN et
 * TVA intracommunautaire si cochés.
 */
export function EnTeteFeuille({
  entreprise: ent,
  e,
  maj,
  blocs,
}: {
  entreprise: EntrepriseFeuille;
  e: EtatDevis;
  maj: (patch: Partial<EtatDevis>) => void;
  blocs: BlocsClient;
}) {
  const client = (cle: keyof ClientSaisi, label: string, autres: object = {}) => (
    <Case
      aria-label={label}
      placeholder={label.replace(/ du client$/, '')}
      value={e.client[cle] ?? ''}
      onChange={(x) => maj({ client: { ...e.client, [cle]: x.target.value } })}
      autoComplete="off"
      {...autres}
    />
  );
  return (
    <div className="grid gap-x-10 gap-y-6 sm:grid-cols-2">
      <div className="grid content-start gap-4">
        <div className="flex items-center gap-2">
          {ent.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- logo Storage, cadre fixe
            <img
              src={ent.logoUrl}
              alt={`Logo de ${ent.nom}`}
              className="h-14 w-32 object-contain object-left"
            />
          ) : null}
          <Link
            href={routes.proDevisParametres}
            title={ent.logoUrl ? 'Changer le logo' : 'Ajouter un logo'}
            className="flex min-h-11 items-center gap-1.5 rounded-pill border border-trait bg-blanc px-3 text-sm font-semibold text-neutre-800 no-underline hover:border-accent"
          >
            <ArrowLineUpIcon size={16} aria-hidden="true" />
            {ent.logoUrl ? 'Changer le logo' : 'Ajouter un logo'}
          </Link>
        </div>
        <Link
          href={routes.proDevisParametres}
          title="Modifier vos coordonnées (Paramètres)"
          className="grid gap-0.5 rounded-[6px] border border-dashed border-neutre-300 px-3 py-2.5 text-[15px] leading-[1.45] text-texte no-underline hover:border-accent"
        >
          <span>{ent.nom || 'Votre entreprise'}</span>
          {ent.adresse ? (
            <span>{ent.adresse}</span>
          ) : (
            <span className="text-accent-700">Compléter mes informations</span>
          )}
          {ent.tel ? <span className="text-neutre-800">{ent.tel}</span> : null}
          {ent.email ? <span className="text-neutre-800">{ent.email}</span> : null}
        </Link>
        {blocs.livraison ? (
          <div className="grid gap-1.5">
            <p className="m-0 px-1 text-[15px] font-semibold">Adresse de livraison / du chantier</p>
            <BlocCases>
              <Case
                aria-label="Adresse du chantier"
                placeholder="Adresse postale, code postal, ville"
                value={e.adresseChantier ?? ''}
                onChange={(x) => maj({ adresseChantier: x.target.value })}
              />
            </BlocCases>
          </div>
        ) : null}
      </div>
      <div className="grid content-start gap-3 sm:pt-16">
        <BlocCases>
          {client('nom', 'Nom du client', { principal: true })}
          {client('adresse', 'Adresse du client', { placeholder: 'Adresse postale' })}
          {client('complement', 'Complément d’adresse')}
          <DeuxCases>
            {client('codePostal', 'Code postal', { inputMode: 'numeric' })}
            {client('ville', 'Ville')}
          </DeuxCases>
          {client('pays', 'Pays')}
          {client('email', 'Email du client', { type: 'email' })}
          {client('tel', 'Téléphone du client', { type: 'tel' })}
        </BlocCases>
        {blocs.siren || blocs.tvaIntra ? (
          <div className="grid gap-1.5 text-[15px]">
            {blocs.siren ? (
              <label className="grid grid-cols-[170px_minmax(0,1fr)] items-center gap-2">
                SIREN :
                <BlocCases>
                  <Case
                    aria-label="SIREN du client"
                    placeholder="SIREN ou SIRET"
                    inputMode="numeric"
                    value={e.sirenClient}
                    onChange={(x) => maj({ sirenClient: x.target.value })}
                    principal
                  />
                </BlocCases>
              </label>
            ) : null}
            {blocs.tvaIntra ? (
              <label className="grid grid-cols-[170px_minmax(0,1fr)] items-center gap-2">
                TVA intracommunautaire :
                <BlocCases>
                  <Case
                    aria-label="TVA intracommunautaire du client"
                    placeholder="Numéro"
                    value={e.tvaIntraClient ?? ''}
                    onChange={(x) => maj({ tvaIntraClient: x.target.value })}
                  />
                </BlocCases>
              </label>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
