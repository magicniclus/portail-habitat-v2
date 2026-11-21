import { formatFourchette, formatTel } from '@ph/core/format';
import type { FichePro } from '@ph/firebase/pro';
import { MapPinIcon, PhoneIcon } from '@phosphor-icons/react/ssr';
import { CarteFiche } from './CarteFiche';
import { EditionCoordonnees, EditionDevis } from './EditionsFiche';

/** « Informations » et « Devis moyen » côte à côte (maquette Ma fiche). */
export function InfosFiche({ f, edite }: { f: FichePro; edite: boolean }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <CarteFiche titre="Informations" action={edite ? <EditionCoordonnees {...f} /> : null}>
        <ul className="m-0 grid list-none gap-2.5 p-0 text-[15px]">
          {f.adresse ? (
            <li className="flex gap-2.5">
              <MapPinIcon size={19} aria-hidden="true" className="mt-0.5 flex-none text-accent" />
              {f.adresse}
            </li>
          ) : null}
          <li className="flex gap-2.5">
            <PhoneIcon size={19} aria-hidden="true" className="mt-0.5 flex-none text-accent" />
            {f.telephonePublic ? formatTel(f.telephonePublic) : 'Téléphone non renseigné'}
          </li>
          {f.emailContact ? <li className="break-all">{f.emailContact}</li> : null}
          {f.siteWeb ? <li className="break-all">{f.siteWeb}</li> : null}
        </ul>
      </CarteFiche>
      <CarteFiche
        titre="Devis moyen"
        action={edite ? <EditionDevis {...(f.devis ? { devis: f.devis } : {})} /> : null}
      >
        <p className="m-0 text-[22px] font-bold">
          {f.devis ? formatFourchette(f.devis.minCentimes, f.devis.maxCentimes) : 'Non renseigné'}
        </p>
        <p className="m-0 text-sm text-neutre-800">
          Fourchette affichée aux particuliers pour qualifier leurs demandes.
        </p>
      </CarteFiche>
    </div>
  );
}
