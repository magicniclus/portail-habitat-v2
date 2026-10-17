'use client';

import { RYTHMES_PILOTE, type RythmePilote } from '@ph/core/blog';
import { formatDate } from '@ph/core/format';
import { Banner, Button, Field, Interrupteur, Select } from '@ph/ui';
import { useState } from 'react';
import { FenetreOffre } from '@/features/offres/FenetreOffre';
import { posterJson } from '@/lib/posterJson';

interface Pilote {
  actif: boolean;
  rythme: RythmePilote;
  sujets: { titre: string; motCle: string }[];
  prochaineLe: number | null;
}

/**
 * Pilote automatique (BLOG §2 bis, D70) : l'IA prépare les articles au rythme choisi et envoie
 * un email 48 h avant chaque publication ; sans votre clic, rien n'est publié. 2 par semaine :
 * Tout inclus seulement (BLOG-13, fenêtre d'offre sinon).
 */
export function PiloteBlog({ initial, toutInclus }: { initial: Pilote; toutInclus: boolean }) {
  const [p, setP] = useState(initial);
  const [rythme, setRythme] = useState<RythmePilote>(initial.rythme);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const appeler = async (corps: object) => {
    setEnCours(true);
    setErreur(null);
    const r = await posterJson<Pilote>('/api/pro/blog/pilote', corps);
    setEnCours(false);
    if (!r.ok) return setErreur(r.message);
    setP(r.data);
  };
  const regler = (actif: boolean, r = rythme) => appeler({ action: 'regler', actif, rythme: r });
  const offreTout = rythme === '2_semaine' && !toutInclus;
  return (
    <section aria-labelledby="pilote" className="grid gap-3 rounded-[12px] border border-trait p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 id="pilote" className="m-0 text-lg">
          Pilote automatique
        </h3>
        <Interrupteur
          checked={p.actif}
          disabled={enCours || offreTout}
          onCheckedChange={(v) => void regler(v)}
          aria-label="Activer le pilote automatique"
        />
      </div>
      <p className="m-0 text-[15px] text-neutre-800">
        L’IA prépare vos articles au rythme choisi. Vous recevez chacun par email 48 h avant sa
        publication : un clic pour valider. Sans votre clic, rien n’est publié.
      </p>
      <Field label="Rythme">
        <Select
          value={rythme}
          disabled={enCours}
          onChange={(e) => {
            const r = e.target.value as RythmePilote;
            setRythme(r);
            if (p.actif && (r !== '2_semaine' || toutInclus)) void regler(true, r);
          }}
        >
          {(Object.keys(RYTHMES_PILOTE) as RythmePilote[]).map((r) => (
            <option key={r} value={r}>
              {RYTHMES_PILOTE[r].libelle}
              {r === '2_semaine' && !toutInclus ? ' (Tout inclus)' : ''}
            </option>
          ))}
        </Select>
      </Field>
      {offreTout ? (
        <FenetreOffre
          formule="tout_inclus"
          raison="Avec Tout inclus, le pilote publie jusqu’à 2 articles par semaine (15 par mois)."
        >
          2 articles par semaine avec Tout inclus
        </FenetreOffre>
      ) : null}
      {p.actif && p.prochaineLe ? (
        <p className="m-0 text-sm">
          Prochain article prévu le <strong>{formatDate(p.prochaineLe, 'long')}</strong>.
        </p>
      ) : null}
      {p.actif && p.sujets.length ? (
        <div className="grid gap-2">
          <strong className="text-[15px]">Prochains sujets</strong>
          <ul className="m-0 grid list-none gap-2 p-0">
            {p.sujets.map((x, i) => (
              <li
                key={x.motCle}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-neutre-100 p-2"
              >
                <span>
                  {x.titre}
                  <span className="block text-sm text-neutre-700">Mot-clé : {x.motCle}</span>
                </span>
                <Button
                  taille="sm"
                  variant="fantome"
                  disabled={enCours}
                  onClick={() => void appeler({ action: 'autre', index: i })}
                >
                  Autre sujet
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {erreur ? <Banner tone="danger">{erreur}</Banner> : null}
    </section>
  );
}
