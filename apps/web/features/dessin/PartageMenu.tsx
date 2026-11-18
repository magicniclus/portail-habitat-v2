'use client';

import { formatDate } from '@ph/core/format';
import { Banner, Button, Input, Select } from '@ph/ui';
import { CopyIcon, LinkIcon, TrashIcon } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { routes } from '@/lib/routes';
import { listerPartages, partagerPlan, revoquerPartage, type EspaceDessin } from './api';
import { surtitre } from './blocs';

type Lien = { partageId: string; creeLe: number; expireLe: number | null };
const icone =
  'grid size-11 flex-none cursor-pointer place-items-center rounded-lg border-0 bg-transparent hover:bg-neutre-100';

/**
 * Partager le plan (DES-42) : lien en lecture seule (plan, 3D, visite, façades), toujours avec
 * une date de fin, révocable. Le lien n'est affiché qu'une fois, à sa création : seule son
 * empreinte est gardée. Il ne montre ni l'adresse ni la photo aérienne.
 */
export function PartageMenu({ espace, planId }: { espace: EspaceDessin; planId: string }) {
  const [liens, setLiens] = useState<Lien[]>([]);
  const [jours, setJours] = useState('30');
  const [nouveau, setNouveau] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const charger = () => setRevision((r) => r + 1);
  useEffect(() => {
    let actif = true;
    void listerPartages(espace, planId).then((r) => {
      if (actif && r.ok) setLiens(r.data.liens);
    });
    return () => {
      actif = false;
    };
  }, [espace, planId, revision]);
  const copier = async (adresse: string) => {
    await navigator.clipboard?.writeText(adresse).catch(() => undefined);
    setMessage('Lien copié.');
  };
  const [enCours, setEnCours] = useState(false);
  const creer = async () => {
    if (enCours) return;
    setEnCours(true);
    const r = await partagerPlan(espace, planId, Number(jours));
    setEnCours(false);
    if (!r.ok) return setMessage(r.message);
    const adresse = `${window.location.origin}${routes.planPartage(r.data.jeton)}`;
    setNouveau(adresse);
    charger();
    await copier(adresse);
  };
  return (
    <section className="grid gap-2.5 border-t border-trait pt-3.5" aria-labelledby="partager">
      <h3 id="partager" className={surtitre}>
        Partager le plan
      </h3>
      <p className="m-0 text-[13px] leading-5 text-neutre-800">
        Lien en lecture seule : plan, 3D, visite et façades, sans l’adresse ni la photo aérienne.
        Les noms de pièces et les textes du plan restent visibles.
        {espace === 'entreprise'
          ? ' Les membres de votre équipe autorisés voient déjà tous les plans de l’entreprise.'
          : ''}
      </p>
      <label className="grid gap-1 text-[13px] font-semibold">
        Validité du lien
        <Select value={jours} onChange={(ev) => setJours(ev.target.value)}>
          <option value="7">7 jours</option>
          <option value="30">30 jours</option>
          <option value="90">90 jours</option>
          <option value="365">1 an</option>
        </Select>
      </label>
      <Button onClick={() => void creer()} disabled={enCours}>
        <LinkIcon aria-hidden="true" /> Créer un lien de partage
      </Button>
      {nouveau ? (
        <div className="grid gap-1.5 rounded-[10px] bg-accent-100 p-3">
          <span className="text-[13px] font-semibold">
            Copiez ce lien maintenant : il ne sera plus affiché.
          </span>
          <div className="flex gap-1">
            <Input
              readOnly
              value={nouveau}
              aria-label="Lien de partage"
              data-testid="lien-nouveau"
            />
            <button
              type="button"
              className={icone}
              aria-label="Copier le lien"
              onClick={() => void copier(nouveau)}
            >
              <CopyIcon aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : null}
      {message ? <Banner tone="info">{message}</Banner> : null}
      {liens.length ? (
        <ul className="m-0 grid list-none gap-1 p-0" aria-label="Liens actifs">
          {liens.map((l) => (
            <li
              key={l.partageId}
              className="flex items-center gap-1 text-sm"
              data-testid="lien-partage"
            >
              <span className="min-w-0 flex-1 truncate">
                Créé le {formatDate(new Date(l.creeLe))}
                {l.expireLe ? `, jusqu’au ${formatDate(new Date(l.expireLe))}` : ''}
              </span>
              <button
                type="button"
                className={icone}
                aria-label="Révoquer le lien"
                onClick={() => void revoquerPartage(espace, l.partageId).then(charger)}
              >
                <TrashIcon aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
