'use client';

import type { ClientCarnet } from '@ph/firebase/devis';
import { Checkbox, Feuille, Input } from '@ph/ui';
import { AddressBookIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { filtrerClients } from '../clients/filtrerClients';
import type { EtatDevis } from '../etat';

/** Client choisi dans la base → bloc client, type, SIREN et TVA intracom repris sur la feuille. */
const depuisFiche = (c: ClientCarnet): Partial<EtatDevis> => ({
  clientId: c.id,
  enregistrerClient: false,
  client: {
    nom: c.nom,
    email: c.email ?? '',
    tel: c.tel ?? '',
    adresse: c.adresse,
    ...(c.complement ? { complement: c.complement } : {}),
    ...(c.codePostal ? { codePostal: c.codePostal } : {}),
    ...(c.ville ? { ville: c.ville } : {}),
    ...(c.pays ? { pays: c.pays } : {}),
  },
  typeClient: c.typeClient,
  sirenClient: c.sirenClient ?? '',
  ...(c.tvaIntraClient ? { tvaIntraClient: c.tvaIntraClient } : {}),
});

const bouton =
  'flex min-h-11 cursor-pointer items-center gap-1.5 rounded-pill border border-trait bg-blanc px-3 font-semibold text-neutre-800 hover:bg-neutre-100 focus-visible:outline-2 focus-visible:outline-accent';

/**
 * Au-dessus du bloc client : « Choisir dans ma base » (recherche), et pour un nouveau client
 * la case « Enregistrer ce client dans ma base » (fiche créée à l'enregistrement du document).
 */
export function ChoixClient({
  clients,
  e,
  maj,
}: {
  clients: ClientCarnet[];
  e: EtatDevis;
  maj: (patch: Partial<EtatDevis>) => void;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [recherche, setRecherche] = useState('');
  const lie = e.clientId ? clients.find((c) => c.id === e.clientId) : undefined;
  return (
    <div className="grid gap-1 text-sm print:hidden">
      <div className="flex flex-wrap items-center gap-x-3">
        <Feuille
          open={ouvert}
          onOpenChange={setOuvert}
          titre="Choisir un client"
          declencheur={
            <button type="button" className={bouton}>
              <AddressBookIcon size={18} aria-hidden="true" />
              Choisir dans ma base
            </button>
          }
        >
          <div className="grid gap-3">
            <Input
              type="search"
              aria-label="Rechercher dans ma base"
              placeholder="Nom, ville, email…"
              value={recherche}
              onChange={(x) => setRecherche(x.target.value)}
            />
            {clients.length ? (
              <ul className="m-0 grid max-h-[50dvh] list-none gap-1 overflow-y-auto p-0">
                {filtrerClients(clients, recherche).map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => {
                        maj(depuisFiche(c));
                        setOuvert(false);
                      }}
                      className="grid min-h-11 w-full cursor-pointer rounded-[8px] border-0 bg-transparent px-3 py-2 text-left hover:bg-neutre-100"
                    >
                      <strong className="font-semibold">{c.nom}</strong>
                      <span className="text-sm text-neutre-700">
                        {[c.adresse, [c.codePostal, c.ville].filter(Boolean).join(' ')]
                          .filter(Boolean)
                          .join(', ')}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="m-0 text-neutre-700">
                Votre base est vide : cochez « Enregistrer ce client dans ma base » sur la feuille.
              </p>
            )}
          </div>
        </Feuille>
        {lie ? (
          <span className="text-neutre-700">
            Client de votre base ·{' '}
            <button
              type="button"
              onClick={() => maj({ clientId: undefined })}
              className="min-h-11 cursor-pointer border-0 bg-transparent p-0 font-semibold text-neutre-800 underline"
            >
              Délier
            </button>
          </span>
        ) : null}
      </div>
      {!e.clientId && e.client.nom.trim() ? (
        <Checkbox
          checked={Boolean(e.enregistrerClient)}
          onChange={(x) => maj({ enregistrerClient: x.target.checked })}
        >
          Enregistrer ce client dans ma base
        </Checkbox>
      ) : null}
    </div>
  );
}
