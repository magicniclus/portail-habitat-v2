'use client';

import { artisanAAccepte, contientCoordonnees } from '@ph/core/espace';
import { formatDate } from '@ph/core/format';
import type { ArtisanDemande, MessageEspace } from '@ph/firebase/espace';
import { Banner, Button, Field, Textarea } from '@ph/ui';
import { useState, type FormEvent } from 'react';
import { envoyerMessage } from './api';

/**
 * Fil de messages avec un artisan (ESP-03). Avant son acceptation, un numéro ou un email tapé est
 * signalé ici et masqué par le serveur à l'enregistrement.
 */
export function FilMessages({
  demandeId,
  artisan,
  messages,
  onEnvoye,
}: {
  demandeId: string;
  artisan: ArtisanDemande;
  messages: MessageEspace[];
  onEnvoye: () => Promise<void>;
}) {
  const [brouillon, setBrouillon] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const masquage = !artisanAAccepte(artisan.statut) && contientCoordonnees(brouillon);

  const envoyer = async (ev: FormEvent) => {
    ev.preventDefault();
    const texte = brouillon.trim();
    if (!texte) return;
    setEnCours(true);
    const r = await envoyerMessage({ demandeId, artisanId: artisan.artisanId, texte });
    if (r.ok) {
      setBrouillon('');
      setErreur(null);
      await onEnvoye();
    } else setErreur(r.message);
    setEnCours(false);
  };

  return (
    <section aria-labelledby="titre-fil" className="grid gap-3">
      <h3 id="titre-fil" className="m-0 text-lg">
        Messages avec {artisan.nom}
      </h3>
      <ol
        aria-label={`Messages avec ${artisan.nom}`}
        className="m-0 flex max-h-[340px] list-none flex-col gap-2.5 overflow-auto rounded-[14px] bg-neutre-100 p-4"
      >
        {messages.length === 0 ? (
          <li className="text-center text-[15px] text-neutre-700">
            Aucun message pour l&apos;instant. L&apos;artisan vous écrira dès qu&apos;il aura étudié
            votre projet.
          </li>
        ) : null}
        {messages.map((m) => (
          <li
            key={m.id}
            className={`flex flex-col gap-0.5 ${m.deMoi ? 'items-end' : 'items-start'}`}
          >
            <span
              className={`max-w-[78%] rounded-[14px] px-3.5 py-2.5 text-[15px] leading-normal whitespace-pre-wrap ${m.deMoi ? 'bg-accent text-blanc' : 'bg-blanc text-texte'}`}
            >
              {m.texte}
            </span>
            <span className="text-[12.5px] text-neutre-700">
              {m.deMoi ? 'Vous' : artisan.nom} · {formatDate(m.le, 'dateHeure')}
            </span>
          </li>
        ))}
      </ol>
      <form onSubmit={envoyer} className="flex flex-wrap items-end gap-2.5">
        <Field label="Votre message" className="min-w-[220px] flex-1">
          <Textarea
            rows={2}
            maxLength={4000}
            value={brouillon}
            onChange={(e) => setBrouillon(e.target.value)}
            placeholder="Écrire à l’artisan…"
          />
        </Field>
        <Button type="submit" disabled={enCours || !brouillon.trim()}>
          Envoyer
        </Button>
      </form>
      {masquage ? (
        <p className="m-0 text-[13.5px] font-semibold text-attention">
          Les numéros de téléphone et emails sont masqués tant que l&apos;artisan n&apos;a pas
          accepté votre demande.
        </p>
      ) : null}
      {erreur ? <Banner tone="danger">{erreur}</Banner> : null}
    </section>
  );
}
