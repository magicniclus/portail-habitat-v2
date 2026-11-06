'use client';

import { RESEAUX, type Reseau, type SujetStudio } from '@ph/core/studio';
import type { CompteReseau, PublicationStudio } from '@ph/firebase/studio';
import { Banner, Button, Checkbox, Field, Input, Textarea } from '@ph/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { ListePublications } from './ListePublications';
import { programmerPublication } from './publication';

/** Valeur d'un champ date-heure local : dans une heure, au quart d'heure. */
function dansUneHeure(maintenant = Date.now()): string {
  const d = new Date(Math.ceil((maintenant + 3_600_000) / 900_000) * 900_000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Étape 6 : publier tout de suite ou programmer sur les réseaux connectés. */
export function EtapePublication({
  projetId,
  sujet,
  titre,
  comptes,
  publications,
  variantes,
}: {
  projetId: string;
  sujet: SujetStudio | null;
  titre: string;
  comptes: CompteReseau[];
  publications: PublicationStudio[];
  /** Variantes d'accroche rendues : identifiant → accroche. */
  variantes: { id: string; accroche: string }[];
}) {
  const connectes = comptes.map((c) => c.reseau);
  const [reseaux, setReseaux] = useState<Reseau[]>(connectes);
  const [titreVideo, setTitre] = useState(titre);
  const [texte, setTexte] = useState(sujet?.legende ?? '');
  const [hashtags, setHashtags] = useState((sujet?.hashtags ?? []).join(' '));
  const [quand, setQuand] = useState(() => dansUneHeure());
  const [variante, setVariante] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ton: 'succes' | 'danger'; texte: string } | null>(null);
  const [enCours, demarrer] = useTransition();
  const envoyer = (tout: boolean) =>
    demarrer(async () => {
      setMessage(null);
      const r = await programmerPublication({
        projetId,
        reseaux,
        quand: tout ? Date.now() : new Date(quand).getTime(),
        titre: titreVideo,
        texte,
        hashtags: hashtags.split(/[\s,]+/).filter(Boolean),
        variante,
      });
      setMessage(
        r.ok
          ? {
              ton: 'succes',
              texte: tout
                ? 'C’est parti : la vidéo est envoyée dans les 10 minutes.'
                : 'Programmée. Vous la retrouvez dans le calendrier.',
            }
          : { ton: 'danger', texte: r.message },
      );
    });
  return (
    <section
      aria-labelledby="publication-studio"
      className="grid gap-3 rounded-card border border-trait bg-blanc p-4"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="publication-studio" className="m-0 text-lg">
          6. Publier
        </h2>
        <span className="flex gap-3 text-sm">
          <Link href={'/admin/studio/calendrier' as Route}>Calendrier</Link>
          <Link href={'/admin/studio/reseaux' as Route}>Réseaux</Link>
        </span>
      </div>
      {connectes.length === 0 ? (
        <Banner tone="info">
          Aucun réseau connecté.{' '}
          <Link href={'/admin/studio/reseaux' as Route}>
            Connecter YouTube, Instagram ou TikTok
          </Link>
          .
        </Banner>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="grid content-start gap-3">
            <fieldset className="m-0 flex flex-wrap gap-4 border-0 p-0">
              <legend className="mb-1 text-sm font-semibold">Réseaux</legend>
              {connectes.map((r) => (
                <Checkbox
                  key={r}
                  checked={reseaux.includes(r)}
                  onChange={(e) =>
                    setReseaux((x) => (e.target.checked ? [...x, r] : x.filter((y) => y !== r)))
                  }
                >
                  {RESEAUX[r].libelle}
                </Checkbox>
              ))}
            </fieldset>
            {variantes.length ? (
              <fieldset className="m-0 grid gap-1 border-0 p-0">
                <legend className="mb-1 text-sm font-semibold">Accroche</legend>
                {[{ id: null, accroche: 'Version principale' }, ...variantes].map((v) => (
                  <label key={v.id ?? 'principale'} className="flex min-h-11 items-center gap-2">
                    <input
                      type="radio"
                      name="variante"
                      checked={variante === v.id}
                      onChange={() => setVariante(v.id)}
                    />
                    {v.accroche}
                  </label>
                ))}
              </fieldset>
            ) : null}
            <Field label="Titre (YouTube)">
              <Input
                value={titreVideo}
                maxLength={100}
                onChange={(e) => setTitre(e.target.value)}
              />
            </Field>
            <Field label="Date et heure" aide="Heure de votre ordinateur.">
              <Input
                type="datetime-local"
                value={quand}
                onChange={(e) => setQuand(e.target.value)}
              />
            </Field>
          </div>
          <div className="grid content-start gap-3">
            <Field label="Légende">
              <Textarea
                rows={5}
                maxLength={2_000}
                value={texte}
                onChange={(e) => setTexte(e.target.value)}
              />
            </Field>
            <Field label="Hashtags" aide="Adaptés à chaque réseau : 3 au plus sur YouTube.">
              <Input value={hashtags} onChange={(e) => setHashtags(e.target.value)} />
            </Field>
          </div>
        </div>
      )}
      {message ? <Banner tone={message.ton}>{message.texte}</Banner> : null}
      {connectes.length ? (
        <div className="flex flex-wrap gap-2">
          <Button disabled={enCours || reseaux.length === 0} onClick={() => envoyer(false)}>
            Programmer
          </Button>
          <Button
            variant="secondaire"
            disabled={enCours || reseaux.length === 0}
            onClick={() => envoyer(true)}
          >
            Publier maintenant
          </Button>
        </div>
      ) : null}
      {publications.length ? <ListePublications publications={publications} /> : null}
    </section>
  );
}
