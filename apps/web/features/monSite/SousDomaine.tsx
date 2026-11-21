'use client';

import { erreurSousDomaine } from '@ph/core/sites';
import { Banner, Button, Field, Input } from '@ph/ui';
import { useState } from 'react';
import { useAppelSite } from './appelSite';

/** Adresse gratuite `{slug}.portailtravaux.fr` : modifiable, unicité vérifiée par le serveur (DOM-01). */
export function SousDomaine({ actuel, domaine }: { actuel: string; domaine: string }) {
  const [slug, setSlug] = useState(actuel);
  const { appeler, erreur, enCours } = useAppelSite();
  const invalide = slug !== actuel ? erreurSousDomaine(slug) : null;
  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!invalide && slug !== actuel) void appeler('sous-domaine', { sousDomaine: slug });
      }}
    >
      <Field
        label="Adresse gratuite"
        aide={`https://${slug}.${domaine}`}
        erreur={invalide ?? undefined}
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
          variant="secondaire"
          disabled={enCours || slug === actuel || Boolean(invalide)}
        >
          Changer d’adresse
        </Button>
      </div>
    </form>
  );
}
