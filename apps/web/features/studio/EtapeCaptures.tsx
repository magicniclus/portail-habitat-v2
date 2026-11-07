'use client';

import {
  ARTISAN_EXEMPLE,
  etatCaptures,
  type PreparationCaptures,
  type SceneCapture,
} from '@ph/core/studio';
import { Banner, Button } from '@ph/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { useEffect, useRef, useState, useTransition } from 'react';
import { filmerCaptures, ignorerCaptures, modifierPreparation, preparerCaptures } from './actions';
import { CapturesFilmees } from './CapturesFilmees';
import { FormulairePreparation } from './FormulairePreparation';

/**
 * Captures avant le montage (STUDIO.md §4) : Claude crée l'artisan d'exemple et choisit les
 * écrans à partir du script ; l'auteur corrige, lance le robot, regarde chaque vidéo filmée
 * (et peut la refaire). Le tournage, puis le montage, viennent ensuite.
 */
export function EtapeCaptures(p: {
  projetId: string;
  preparation: PreparationCaptures | null;
  captures: Record<string, string>;
  statut: string;
  erreur: string | null;
  aScript: boolean;
}) {
  const [brouillon, setBrouillon] = useState<PreparationCaptures>(
    p.preparation ?? { artisan: ARTISAN_EXEMPLE, scenes: [] },
  );
  const [message, setMessage] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();
  const filme = p.statut === 'captures';
  const etat = etatCaptures(p);
  const agir = (f: () => Promise<{ ok: boolean; message?: string }>) =>
    demarrer(async () => {
      setMessage(null);
      const r = await f();
      if (!r.ok) setMessage(r.message ?? 'Action impossible.');
    });

  // Arrivée avec un script et sans préparation : Claude prépare tout seul.
  const lance = useRef(false);
  const auto = p.aScript && !p.preparation && !filme;
  useEffect(() => {
    if (!auto || lance.current) return;
    lance.current = true;
    agir(() => preparerCaptures({ projetId: p.projetId }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- une seule fois à l'arrivée
  }, [auto]);
  // Nouvelle préparation reçue du serveur : le formulaire repart d'elle.
  const [vue, setVue] = useState(p.preparation);
  if (p.preparation !== vue) {
    setVue(p.preparation);
    if (p.preparation) setBrouillon(p.preparation);
  }

  const filmer = (refaire?: SceneCapture) =>
    agir(async () => {
      const r = await modifierPreparation({ projetId: p.projetId, preparation: brouillon });
      return r.ok ? filmerCaptures({ projetId: p.projetId, ...(refaire ? { refaire } : {}) }) : r;
    });

  return (
    <section
      aria-labelledby="etape-captures"
      className="grid gap-4 rounded-card border border-trait bg-blanc p-4"
    >
      <div>
        <h2 id="etape-captures" className="m-0 text-lg">
          Captures de Portail Travaux
        </h2>
        <p className="m-0 text-sm text-neutre-700">
          Avant le montage : l’artisan d’exemple et les écrans à montrer, filmés par le robot. Vous
          regardez chaque vidéo, vous la refaites si besoin.
        </p>
      </div>
      {auto || (enCours && !p.preparation) ? (
        <Banner tone="info" titre="Claude prépare les captures…">
          Il crée l’artisan d’exemple à partir du script et choisit les écrans à filmer (moins d’une
          minute).
        </Banner>
      ) : null}
      {filme ? (
        <Banner tone="info" titre="Le robot filme les écrans…">
          D’habitude 2 à 5 minutes. Vous pouvez quitter cette page : une pastille suit la vidéo.
        </Banner>
      ) : null}
      {p.statut === 'erreur' && p.erreur ? (
        <Banner tone="danger" titre="Les captures n’ont pas pu être filmées">
          {p.erreur}
        </Banner>
      ) : null}
      {message ? <Banner tone="danger">{message}</Banner> : null}

      <FormulairePreparation
        valeur={brouillon}
        onChange={setBrouillon}
        desactive={filme || enCours}
      />

      <div className="flex flex-wrap gap-2">
        <Button disabled={filme || enCours || !brouillon.scenes.length} onClick={() => filmer()}>
          {etat === 'filmee' ? 'Refilmer les écrans manquants' : 'Filmer ces écrans'}
        </Button>
        <Button
          variant="secondaire"
          disabled={filme || enCours}
          onClick={() =>
            agir(() => modifierPreparation({ projetId: p.projetId, preparation: brouillon }))
          }
        >
          Enregistrer sans filmer
        </Button>
        {p.aScript ? (
          <Button
            variant="fantome"
            disabled={filme || enCours}
            onClick={() => agir(() => preparerCaptures({ projetId: p.projetId }))}
          >
            Redemander à Claude
          </Button>
        ) : null}
      </div>

      <CapturesFilmees captures={p.captures} onRefaire={filmer} desactive={filme || enCours} />

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-trait pt-3">
        <Button
          variant="fantome"
          disabled={filme || enCours}
          onClick={() => agir(() => ignorerCaptures({ projetId: p.projetId }))}
        >
          Monter sans captures
        </Button>
        {etat === 'filmee' || etat === 'ignoree' ? (
          <Link href={`/admin/studio/${p.projetId}/tournage` as Route} className="font-semibold">
            Continuer vers le tournage →
          </Link>
        ) : null}
      </div>
    </section>
  );
}
