'use client';

import { formatDate } from '@ph/core/format';
import { Banner, Button, Select } from '@ph/ui';
import { CopyIcon, LinkIcon, TrashIcon } from '@phosphor-icons/react';
import { useCallback, useEffect, useState } from 'react';
import { routes } from '@/lib/routes';
import { listerPartages, partagerPlan, revoquerPartage, type EspaceDessin } from './api';

type Lien = { jeton: string; creeLe: number; expireLe: number | null };
const icone =
  'grid size-11 flex-none cursor-pointer place-items-center rounded-lg border-0 bg-transparent hover:bg-neutre-100';

/**
 * Partager le plan (DES-42) : lien en lecture seule (2D, 3D, visite, façades), avec ou sans
 * date de fin, révocable. Le lien ne montre ni l'adresse ni la photo aérienne.
 */
export function PartageMenu({ espace, planId }: { espace: EspaceDessin; planId: string }) {
  const [liens, setLiens] = useState<Lien[]>([]);
  const [jours, setJours] = useState('30');
  const [message, setMessage] = useState<string | null>(null);
  const charger = useCallback(async () => {
    const r = await listerPartages(espace, planId);
    if (r.ok) setLiens(r.data.liens);
  }, [espace, planId]);
  useEffect(() => {
    void charger();
  }, [charger]);
  const adresse = (jeton: string) => `${window.location.origin}${routes.planPartage(jeton)}`;
  const copier = async (jeton: string) => {
    await navigator.clipboard?.writeText(adresse(jeton)).catch(() => undefined);
    setMessage('Lien copié.');
  };
  const creer = async () => {
    const r = await partagerPlan(espace, planId, jours === '0' ? undefined : Number(jours));
    if (!r.ok) return setMessage(r.message);
    await charger();
    await copier(r.data.jeton);
  };
  return (
    <section className="grid gap-2.5 border-t border-trait pt-3.5" aria-labelledby="partager">
      <h3 id="partager" className="m-0 text-xs font-bold tracking-wide text-neutre-700 uppercase">
        Partager le plan
      </h3>
      <p className="m-0 text-[13px] leading-5 text-neutre-800">
        Lien en lecture seule : plan, 3D, visite et façades, sans l’adresse ni la photo aérienne.
        {espace === 'entreprise'
          ? ' Les membres de votre équipe autorisés voient déjà tous les plans de l’entreprise.'
          : ''}
      </p>
      <label className="grid gap-1 text-[13px] font-semibold">
        Validité du lien
        <Select value={jours} onChange={(ev) => setJours(ev.target.value)}>
          <option value="7">7 jours</option>
          <option value="30">30 jours</option>
          <option value="0">Sans date de fin</option>
        </Select>
      </label>
      <Button onClick={() => void creer()}>
        <LinkIcon aria-hidden="true" /> Créer un lien de partage
      </Button>
      {message ? <Banner tone="info">{message}</Banner> : null}
      {liens.length ? (
        <ul className="m-0 grid list-none gap-1 p-0" aria-label="Liens actifs">
          {liens.map((l) => (
            <li key={l.jeton} className="flex items-center gap-1 text-sm">
              <a
                href={routes.planPartage(l.jeton)}
                target="_blank"
                rel="noreferrer"
                className="min-w-0 flex-1 truncate text-accent-700"
                data-testid="lien-partage"
              >
                {l.expireLe ? `Jusqu’au ${formatDate(new Date(l.expireLe))}` : 'Sans date de fin'}
              </a>
              <button
                type="button"
                className={icone}
                aria-label="Copier le lien"
                onClick={() => void copier(l.jeton)}
              >
                <CopyIcon aria-hidden="true" />
              </button>
              <button
                type="button"
                className={icone}
                aria-label="Révoquer le lien"
                onClick={() => void revoquerPartage(espace, l.jeton).then(charger)}
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
