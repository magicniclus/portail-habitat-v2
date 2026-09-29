'use client';

import { formatDate } from '@ph/core/format';
import type { AvisPro } from '@ph/firebase/pro';
import { Banner, Button, Field, Textarea } from '@ph/ui';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { posterJson } from '@/lib/posterJson';

/** Un avis publié ; « Répondre » ouvre la réponse publique (une seule, affichée sur la fiche). */
export function CarteAvisPro({ a, peutRepondre }: { a: AvisPro; peutRepondre: boolean }) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [texte, setTexte] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const envoyer = async () => {
    setEnCours(true);
    setErreur(null);
    const r = await posterJson<null>('/api/pro/avis/repondre', { avisId: a.id, texte });
    setEnCours(false);
    if (!r.ok) return setErreur(r.message);
    setOuvert(false);
    router.refresh();
  };

  return (
    <li className="grid gap-2.5 rounded-[12px] border border-trait p-4">
      <p className="m-0 flex flex-wrap items-center justify-between gap-2">
        <span className="font-semibold">
          {a.nomAffiche}{' '}
          <span aria-hidden="true" className="tracking-[2px] text-etoile">
            {'★'.repeat(a.note)}
          </span>
          <span className="sr-only">, note {a.note} sur 5</span>
        </span>
        <span className="text-[13px] text-neutre-700">
          {a.typeTravaux} · {formatDate(a.publieLe)}
        </span>
      </p>
      {a.texte ? <p className="m-0 text-[15px] leading-[23px]">{a.texte}</p> : null}
      {a.reponse ? (
        <div className="rounded-[10px] bg-accent-100 p-3 text-sm">
          <p className="m-0 mb-1 font-semibold">Votre réponse · {formatDate(a.reponse.le)}</p>
          <p className="m-0">{a.reponse.texte}</p>
        </div>
      ) : peutRepondre && !ouvert ? (
        <div>
          <Button variant="secondaire" onClick={() => setOuvert(true)}>
            Répondre
          </Button>
        </div>
      ) : null}
      {ouvert ? (
        <div className="grid gap-2">
          <Field label="Votre réponse publique" aide="Visible sur votre fiche, sous l'avis.">
            <Textarea
              value={texte}
              onChange={(e) => setTexte(e.target.value)}
              maxLength={1200}
              rows={4}
            />
          </Field>
          {erreur ? <Banner tone="danger">{erreur}</Banner> : null}
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void envoyer()} disabled={enCours || texte.trim().length < 2}>
              Publier la réponse
            </Button>
            <Button variant="fantome" onClick={() => setOuvert(false)}>
              Annuler
            </Button>
          </div>
        </div>
      ) : null}
    </li>
  );
}
