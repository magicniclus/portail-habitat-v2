'use client';

import { bouton, Field, Input, Select } from '@ph/ui';
import dynamic from 'next/dynamic';
import { useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { DELAIS, PROJETS_POPULAIRES, type Retenue } from './choix';
import type { EtatSuggestions, PontSuggestions } from './SuggestionsProjet';

// Moteur, index (≈ 16 Ko) et liste chargés au premier focus : rien de plus dans le JavaScript initial (D46).
const SuggestionsProjet = dynamic(() => import('./SuggestionsProjet'), { ssr: false });

const ETAT_INITIAL: EtatSuggestions = {
  ouvert: false,
  actifId: '',
  meilleur: undefined,
  associees: [],
  urgence: false,
};

// Mobile : recherche en plein écran, champ en haut, suggestions dessous (MOBILE §7). Chaîne fixe :
// pas de fusion de classes à l'exécution (coût au chargement, D46).
const PLEIN_ECRAN =
  'max-sm:fixed max-sm:inset-0 max-sm:z-50 max-sm:overflow-y-auto max-sm:bg-fond max-sm:px-4 max-sm:pt-[max(16px,env(safe-area-inset-top))]';

/**
 * Formulaire du hero « Quel est votre projet ? » (RECHERCHE §3, RCH-01 à 08). Sans JavaScript, l'envoi
 * GET vers le simulateur reste possible (`cible`).
 */
export function FormulaireProjet({ cible }: { cible: string }) {
  const idListe = `${useId()}-suggestions`;
  const [projet, setProjet] = useState('');
  const [choix, setChoix] = useState<Retenue | null>(null);
  const [delai, setDelai] = useState('asap');
  const [focus, setFocus] = useState(false);
  const [charge, setCharge] = useState(false);
  const [etat, setEtat] = useState<EtatSuggestions>(ETAT_INITIAL);
  const pont = useRef<PontSuggestions | null>(null);
  const champ = useRef<HTMLInputElement>(null);

  const choisir = (r: Retenue) => {
    setProjet(r.libelle);
    setChoix(r);
  };

  // Moteur chargé : il route la validation (RECHERCHE §3). Sinon (chip choisi sans toucher au champ),
  // l'envoi GET natif part avec la prestation et l'intention en champs cachés.
  const envoyer = (e: FormEvent<HTMLFormElement>) => {
    if (!pont.current) return;
    e.preventDefault();
    const cp = String(new FormData(e.currentTarget).get('cp') ?? '');
    pont.current.valider({ projet, cp, delai, choix: choix ?? undefined });
  };

  const associees = etat.associees.length > 0;

  return (
    <>
      <form
        action={cible}
        method="get"
        onSubmit={envoyer}
        className="grid gap-3 rounded-[16px] bg-blanc p-4 shadow-md sm:p-5"
        aria-label="Décrire mon projet"
      >
        {choix ? (
          <>
            <input type="hidden" name="prestation" value={choix.prestation} />
            <input type="hidden" name="intention" value={choix.id} />
          </>
        ) : null}
        <div className={focus ? `relative ${PLEIN_ECRAN}` : 'relative'}>
          <div className="flex items-end gap-2">
            <Field label="Quel est votre projet ?" className="flex-1">
              <Input
                ref={champ}
                name={choix ? undefined : 'projet'}
                role="combobox"
                aria-autocomplete="list"
                aria-controls={idListe}
                aria-expanded={etat.ouvert}
                aria-activedescendant={etat.actifId || undefined}
                autoComplete="off"
                enterKeyHint="search"
                maxLength={120}
                placeholder="Ex. Rénovation salle de bain, douche italienne, pompe à chaleur…"
                value={projet}
                onChange={(e) => {
                  setProjet(e.target.value);
                  setChoix(null);
                }}
                onFocus={() => {
                  setCharge(true);
                  setFocus(true);
                }}
                onBlur={() => setFocus(false)}
                onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                  if (pont.current?.clavier(e.key)) e.preventDefault();
                }}
                className="min-h-12"
              />
            </Field>
            {focus ? (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => champ.current?.blur()}
                className={bouton({ variant: 'fantome', className: 'sm:hidden' })}
              >
                Annuler
              </button>
            ) : null}
          </div>
          {charge ? (
            <SuggestionsProjet
              q={projet}
              focus={focus}
              choisie={choix}
              idListe={idListe}
              enregistrer={(p) => {
                pont.current = p;
              }}
              onChoisir={choisir}
              onEtat={(e) => {
                setEtat(e);
                if (e.urgence) setDelai('asap');
              }}
            />
          ) : null}
        </div>
        {choix ? (
          <p className="m-0 -mt-0.5 text-sm font-bold text-accent-800">✓ {choix.libelle}</p>
        ) : null}
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-3">
          <Field label="Code postal">
            <Input
              champ="codePostal"
              name="cp"
              placeholder="33000"
              enterKeyHint="next"
              className="min-h-12"
            />
          </Field>
          <Field label="Démarrage souhaité">
            <Select
              name="delai"
              value={delai}
              onChange={(e) => setDelai(e.target.value)}
              className="min-h-12"
            >
              {DELAIS.map((d) => (
                <option key={d.valeur} value={d.valeur}>
                  {d.libelle}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        {/* Bouton natif : le composant Button embarque Radix Slot, inutile ici (budget D46). */}
        <button
          type="submit"
          className={bouton({ taille: 'lg', pleineLargeur: true, className: 'min-h-[52px]' })}
        >
          Lancer mon estimation gratuite
        </button>
      </form>

      <div className="mt-[18px] flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="text-sm text-neutre-800" id="projets-populaires">
          {associees ? 'Projets associés :' : 'Projets populaires :'}
        </span>
        <ul aria-labelledby="projets-populaires" className="m-0 flex list-none flex-wrap gap-2 p-0">
          {(associees
            ? etat.associees.map((a) => ({ ...a, chip: a.libelle }))
            : PROJETS_POPULAIRES
          ).map((p) => (
            <li key={p.id}>
              <button
                type="button"
                aria-pressed={choix?.id === p.id}
                onClick={() => choisir(p)}
                className="min-h-11 cursor-pointer rounded-pill border border-accent-200 bg-blanc px-[15px] text-sm font-semibold text-accent-700 hover:border-accent hover:bg-accent-200 aria-pressed:border-accent aria-pressed:bg-accent-200"
              >
                {p.chip}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
