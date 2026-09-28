'use client';

import type { EntrepriseProposee } from '@ph/firebase/comptes';
import { Banner, Button, Field, Input, bouton } from '@ph/ui';
import Link from 'next/link';
import { useState } from 'react';
import { posterJson } from '@/lib/posterJson';
import { routes } from '@/lib/routes';

/**
 * Entreprise par nom ou SIREN (COMPTES §3.1) : raison sociale et adresse préremplies (ONB-01),
 * entreprise fermée refusée (ONB-02), déjà inscrite → « Demander à rejoindre » (ONB-03).
 */
export function ChoixEntreprise({
  choisie,
  onChoix,
}: {
  choisie: EntrepriseProposee | null;
  onChoix: (e: EntrepriseProposee | null) => void;
}) {
  const [q, setQ] = useState('');
  const [resultats, setResultats] = useState<EntrepriseProposee[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const rechercher = async () => {
    if (q.trim().length < 2) return setErreur('Saisissez le nom ou le SIREN de votre entreprise.');
    setEnCours(true);
    setErreur(null);
    const r = await posterJson<EntrepriseProposee[]>('/api/pro/entreprise', { q: q.trim() });
    setEnCours(false);
    if (!r.ok) return setErreur(r.message);
    setResultats(r.data);
    onChoix(null);
  };

  return (
    <section aria-labelledby="titre-entreprise" className="grid gap-3">
      <h2 id="titre-entreprise" className="m-0 text-lg">
        Votre entreprise
      </h2>
      <div className="flex flex-wrap items-end gap-2">
        <Field label="Nom ou numéro SIREN" className="min-w-[220px] flex-1">
          <Input
            champ="siren"
            inputMode="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void rechercher();
              }
            }}
            placeholder="552 100 554 ou Bertrand Rénovation"
          />
        </Field>
        <Button type="button" variant="secondaire" onClick={rechercher} disabled={enCours}>
          {enCours ? 'Recherche…' : 'Rechercher'}
        </Button>
      </div>
      {erreur ? <Banner tone="danger">{erreur}</Banner> : null}
      {resultats?.length === 0 ? (
        <Banner tone="attention">
          Nous ne trouvons pas cette entreprise. Vérifiez le SIREN (9 chiffres).
        </Banner>
      ) : null}
      {resultats?.length ? (
        <ul aria-label="Entreprises trouvées" className="m-0 grid list-none gap-2.5 p-0">
          {resultats.map((r) => {
            const e = r.entreprise;
            const libre = !r.analyse.refusee && r.analyse.inscription === 'libre';
            return (
              <li key={e.siren} className="grid gap-2 rounded-[12px] border border-trait p-3.5">
                <label className={`flex items-start gap-3 ${libre ? 'cursor-pointer' : ''}`}>
                  <input
                    type="radio"
                    name="entreprise"
                    value={e.siren}
                    disabled={!libre}
                    checked={choisie?.entreprise.siren === e.siren}
                    onChange={() => onChoix(r)}
                    className="mt-1 size-5 accent-accent"
                  />
                  <span className="grid gap-0.5">
                    <strong>{e.raisonSociale}</strong>
                    <span className="text-sm text-neutre-800">
                      SIREN {e.siren.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3')} ·{' '}
                      {e.adresse.ligne1}, {e.adresse.codePostal} {e.adresse.ville}
                    </span>
                  </span>
                </label>
                {r.analyse.refusee ? (
                  <p className="m-0 text-sm font-semibold text-danger">
                    Cette entreprise est fermée : l&apos;inscription est impossible.
                  </p>
                ) : r.analyse.inscription === 'revendiquee' ? (
                  <div className="grid gap-2 rounded-[10px] bg-accent-100 p-3">
                    <p className="m-0 text-sm font-semibold">Cette entreprise a déjà un compte.</p>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={routes.proRejoindre(r.artisanId!)}
                        className={bouton({ variant: 'secondaire' })}
                      >
                        Demander à rejoindre
                      </Link>
                      <Link
                        href={routes.aideSujet('usurpation')}
                        className={bouton({ variant: 'fantome' })}
                      >
                        Signaler une usurpation
                      </Link>
                    </div>
                  </div>
                ) : r.analyse.inscription === 'non_revendiquee' ? (
                  <p className="m-0 text-sm">
                    Une fiche existe déjà pour cette entreprise :{' '}
                    <Link href={routes.proRevendiquer(r.artisanId!)}>revendiquez-la</Link>.
                  </p>
                ) : r.analyse.recente ? (
                  <p className="m-0 text-sm text-neutre-800">
                    Entreprise de moins de 3 mois : l&apos;attestation décennale sera demandée avant
                    la mise en ligne.
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
