'use client';

import { Banner, Button, Checkbox, Field, Input, Select } from '@ph/ui';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { routes } from '@/lib/routes';
import type { GroupeMetiers } from './metiers';
import { useMetierCible } from './useMetierCible';

/**
 * Carte « Créer mon compte gratuit » (maquette Acquisition Artisans v2). Au lot 6, la mise en page
 * et la validation ; la création du compte, les autres métiers et les chantiers acceptés arrivent au lot 10.
 */
export function FormulaireInscription({
  groupes,
  demandesMois,
}: {
  groupes: GroupeMetiers[];
  /** Demandes déposées ce mois-ci (stats/public), déjà formaté ; masqué sans donnée. */
  demandesMois: string | null;
}) {
  const cible = useMetierCible(groupes);
  const [erreurMetier, setErreurMetier] = useState(false);
  const [envoye, setEnvoye] = useState(false);

  const envoyer = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const metier = new FormData(e.currentTarget).get('metier');
    if (!metier) {
      setErreurMetier(true);
      e.currentTarget.querySelector<HTMLSelectElement>('select[name="metier"]')?.focus();
      return;
    }
    setEnvoye(true);
  };

  return (
    <div
      id="inscription"
      className="scroll-mt-[70px] rounded-[16px] border border-trait bg-blanc p-[clamp(20px,2.4vw,28px)] shadow-lg"
    >
      {envoye ? (
        <Banner tone="info" titre="L'inscription en ligne ouvre très prochainement">
          Vos informations n&apos;ont pas été enregistrées. Écrivez-nous depuis{' '}
          <Link href={routes.aideSujet('inscription-pro')}>Aide et contact</Link> : nous créons
          votre fiche avec vous.
        </Banner>
      ) : (
        <form onSubmit={envoyer} noValidate={false} className="grid gap-3.5">
          <div>
            <h2 className="m-0 mb-1.5 text-[23px]">Créer mon compte gratuit</h2>
            <p className="m-0 text-sm leading-[21px] text-neutre-700">
              4 champs, 1 minute. Sans carte bancaire.
            </p>
            {demandesMois ? (
              <p className="m-0 mt-3 flex items-center gap-2 rounded-control bg-accent-100 px-3 py-2 text-sm text-accent-800">
                <span aria-hidden="true" className="size-2 flex-none rounded-full bg-accent" />
                <span>
                  <strong>{demandesMois} demandes</strong> déposées en France ce mois-ci
                </span>
              </p>
            ) : null}
          </div>
          <Field label="Nom et prénom" requis>
            <Input
              name="nom"
              autoComplete="name"
              autoCapitalize="words"
              placeholder="Julien Bertrand"
              required
              enterKeyHint="next"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3.5">
            <Field label="Téléphone" requis>
              <Input
                champ="tel"
                name="tel"
                placeholder="06 12 34 56 78"
                required
                enterKeyHint="next"
              />
            </Field>
            <Field label="Code postal" requis>
              <Input
                champ="codePostal"
                name="cp"
                placeholder="33000"
                required
                enterKeyHint="next"
              />
            </Field>
          </div>
          <Field
            label="Métier principal"
            requis
            erreur={erreurMetier ? 'Choisissez votre métier dans la liste.' : undefined}
          >
            <Select
              key={cible?.id}
              name="metier"
              defaultValue={cible?.id ?? ''}
              onChange={() => setErreurMetier(false)}
            >
              <option value="">Choisissez votre métier</option>
              {groupes.map((g) => (
                <optgroup key={g.nom} label={g.nom}>
                  {g.metiers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nom}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>
          </Field>
          <Checkbox name="cgv" required>
            J&apos;accepte les{' '}
            <Link href={routes.legal('pro', 'cgv')}>conditions générales de vente</Link>, la{' '}
            <Link href={routes.legal('pro', 'charte')}>charte de bonne conduite</Link> et la{' '}
            <Link href={routes.legal('pro', 'confidentialite')}>politique de confidentialité</Link>.
          </Checkbox>
          <Button type="submit" pleineLargeur className="min-h-12">
            Voir les demandes de ma zone
          </Button>
          <p className="m-0 flex items-start gap-2 text-[13px] leading-5 text-neutre-700">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--accent-700)"
              strokeWidth="1.8"
              strokeLinecap="round"
              aria-hidden="true"
              className="mt-px flex-none"
            >
              <path d="M12 3.2 19.5 6v6c0 4.6-3.1 7.6-7.5 8.9C7.6 19.6 4.5 16.6 4.5 12V6L12 3.2ZM9 12l2 2 4-4" />
            </svg>
            <span>
              Réservé aux entreprises immatriculées et assurées : SIREN et attestation décennale
              vérifiés pour chaque fiche.
            </span>
          </p>
          <ul className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-[13px] text-neutre-800">
            {["0 € à l'inscription", 'Sans engagement', '0 % de commission'].map((t) => (
              <li key={t} className="flex items-center gap-1.5">
                <span aria-hidden="true" className="font-bold text-accent">
                  ✓
                </span>
                {t}
              </li>
            ))}
          </ul>
        </form>
      )}
    </div>
  );
}
