'use client';

import { erreurSousDomaine } from '@ph/core/sites';
import { Banner, Button, Field, Input } from '@ph/ui';
import { useState } from 'react';
import { useAppelSite } from './appelSite';

/** Premier passage : choix du sous-domaine gratuit, puis site de départ créé depuis la fiche. */
export function CreationSite({ proposition, domaine }: { proposition: string; domaine: string }) {
  const [slug, setSlug] = useState(proposition);
  const { appeler, erreur, enCours } = useAppelSite();
  const invalide = slug ? erreurSousDomaine(slug) : null;
  return (
    <section
      aria-labelledby="creer-site"
      className="grid max-w-[640px] gap-4 rounded-2xl border border-trait bg-blanc p-6"
    >
      <h2 id="creer-site" className="m-0 text-2xl">
        Créez votre site en une minute
      </h2>
      <p className="m-0 text-base text-neutre-800">
        Nous partons de votre fiche : nom, métier, téléphone, réalisations publiées et avis. Vous
        pourrez tout modifier ensuite dans l’éditeur. Gratuit, sans limite de pages.
      </p>
      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!invalide) void appeler('', { sousDomaine: slug });
        }}
      >
        <Field
          label="Adresse de votre site"
          aide={`https://${slug || 'votre-entreprise'}.${domaine}`}
          erreur={slug && invalide ? invalide : undefined}
          requis
        >
          <Input
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={40}
          />
        </Field>
        {erreur ? <Banner tone="danger">{erreur}</Banner> : null}
        <div>
          <Button
            chargement={enCours}
            type="submit"
            disabled={enCours || !slug || Boolean(invalide)}
          >
            {enCours ? 'Création…' : 'Créer mon site'}
          </Button>
        </div>
      </form>
    </section>
  );
}
