import Link from 'next/link';
import type { EntrepriseFeuille } from '@/server/pageDevis';
import { routes } from '@/lib/routes';
import type { ClientSaisi } from '../etat';
import { ChampFeuille } from './ChampFeuille';

/**
 * Haut de la feuille A4 : l'entreprise (logo et coordonnées, modifiables dans Paramètres) à
 * gauche, le bloc client saisi directement sur la feuille à droite.
 */
export function EnTeteFeuille({
  entreprise: e,
  client,
  onClient,
}: {
  entreprise: EntrepriseFeuille;
  client: ClientSaisi;
  onClient: (patch: Partial<ClientSaisi>) => void;
}) {
  const champ = (cle: keyof ClientSaisi, label: string, autres: object = {}) => (
    <ChampFeuille
      aria-label={label}
      placeholder={label.replace(/ du client$/, '')}
      value={client[cle] ?? ''}
      onChange={(x) => onClient({ [cle]: x.target.value })}
      {...autres}
    />
  );
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div className="grid content-start gap-1 text-sm leading-[1.5] text-neutre-800">
        <Link
          href={routes.proDevisParametres}
          className="mb-2 flex h-16 w-fit max-w-[200px] items-center rounded-[8px] focus-visible:outline-2 focus-visible:outline-accent"
          title="Changer le logo (Paramètres)"
        >
          {e.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- logo Storage, hauteur fixe
            <img
              src={e.logoUrl}
              alt={`Logo de ${e.nom}`}
              className="max-h-16 w-auto object-contain"
            />
          ) : (
            <span className="grid h-16 w-32 place-items-center rounded-[8px] border border-dashed border-neutre-400 text-xs">
              Ajouter un logo
            </span>
          )}
        </Link>
        <strong className="text-base text-texte">{e.nom || 'Votre entreprise'}</strong>
        {e.adresse ? <span>{e.adresse}</span> : null}
        {e.tel ? <span>{e.tel}</span> : null}
        {e.email ? <span>{e.email}</span> : null}
        {!e.adresse || !e.siret ? (
          <Link
            href={routes.proDevisParametres}
            className="inline-flex min-h-11 w-fit items-center text-accent-700 underline"
          >
            Compléter mes informations
          </Link>
        ) : null}
      </div>
      <fieldset className="m-0 grid content-start gap-0.5 rounded-[10px] border-0 bg-neutre-100 p-3">
        <legend className="float-left mb-1 px-1.5 text-xs font-bold tracking-[0.06em] text-neutre-700 uppercase">
          Client
        </legend>
        {champ('nom', 'Nom du client', { className: 'font-semibold', autoComplete: 'off' })}
        {champ('adresse', 'Adresse du client')}
        {champ('complement', 'Complément d’adresse')}
        <div className="grid grid-cols-[110px_1fr] gap-1">
          {champ('codePostal', 'Code postal', { inputMode: 'numeric', autoComplete: 'off' })}
          {champ('ville', 'Ville')}
        </div>
        {champ('pays', 'Pays')}
        {champ('email', 'Email du client', { type: 'email', autoComplete: 'off' })}
        {champ('tel', 'Téléphone du client', { type: 'tel', autoComplete: 'off' })}
      </fieldset>
    </div>
  );
}
