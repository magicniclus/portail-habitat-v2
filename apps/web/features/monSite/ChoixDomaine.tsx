'use client';

import { Banner, Button, Field, Input, cn } from '@ph/ui';
import { useState } from 'react';
import { FenetreOffre } from '@/features/offres/FenetreOffre';
import { AchatDomaine } from './AchatDomaine';
import { useAppelSite } from './appelSite';

const MODES = [
  ['achat', 'Acheter un domaine'],
  ['connexion', 'J’ai déjà un domaine'],
] as const;

/** Sans domaine : en acheter un en un clic (par défaut) ou connecter le sien (Site Pro). */
export function ChoixDomaine({ sitePro, voulu }: { sitePro: boolean; voulu?: string }) {
  const [mode, setMode] = useState<'achat' | 'connexion'>('achat');
  return (
    <div className="grid gap-4">
      <div role="radiogroup" aria-label="Domaine" className="flex flex-wrap gap-2">
        {MODES.map(([m, l]) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={mode === m}
            onClick={() => setMode(m)}
            className={cn(
              'min-h-11 rounded-pill border px-4 text-[15px] font-semibold',
              mode === m
                ? 'border-accent bg-accent-50 text-accent-700'
                : 'border-trait bg-blanc text-neutre-800 hover:bg-neutre-100',
            )}
          >
            {l}
          </button>
        ))}
      </div>
      {mode === 'achat' ? (
        <AchatDomaine sitePro={sitePro} {...(voulu ? { voulu } : {})} />
      ) : sitePro ? (
        <ConnexionDomaine />
      ) : (
        <div>
          <FenetreOffre formule="site_pro" raison="Le domaine personnel est inclus dans Site Pro.">
            Connecter mon domaine
          </FenetreOffre>
        </div>
      )}
    </div>
  );
}

/** Domaine existant (DOMAINES §4) : le tableau des enregistrements s'affiche ensuite. */
function ConnexionDomaine() {
  const [saisie, setSaisie] = useState('');
  const { appeler, erreur, enCours } = useAppelSite();
  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        void appeler('domaine', { domaine: saisie });
      }}
    >
      <Field label="Votre domaine" aide="Par exemple : bertrand-renovation.fr">
        <Input
          value={saisie}
          onChange={(e) => setSaisie(e.target.value)}
          inputMode="url"
          autoCapitalize="none"
          autoComplete="off"
          spellCheck={false}
        />
      </Field>
      {erreur ? <Banner tone="danger">{erreur}</Banner> : null}
      <div>
        <Button type="submit" disabled={enCours || saisie.trim().length < 3}>
          Connecter mon domaine
        </Button>
      </div>
    </form>
  );
}
