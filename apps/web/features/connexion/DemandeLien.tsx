'use client';

import { entreeLienConnexion } from '@ph/core/schemas';
import { Banner, Button, Field, Input } from '@ph/ui';
import { useState, type FormEvent } from 'react';
import { posterJson } from '@/lib/posterJson';
import { memoriserEmail } from './memoire';

/** Connexion des particuliers par lien magique (COMPTES §5) : aucune indication sur l'existence du compte. */
export function DemandeLien() {
  const [envoye, setEnvoye] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const envoyer = async (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    const f = new FormData(ev.currentTarget);
    const brut = {
      email: String(f.get('email') ?? '').trim(),
      site: String(f.get('site') ?? '') || undefined,
    };
    const v = entreeLienConnexion.safeParse(brut);
    if (!v.success) return setErreur('Indiquez une adresse email valide.');
    setErreur(null);
    setEnCours(true);
    const r = await posterJson<null>('/api/connexion/lien', brut);
    setEnCours(false);
    if (!r.ok) return setErreur(r.message);
    memoriserEmail(v.data.email);
    setEnvoye(v.data.email);
  };

  if (envoye)
    return (
      <div role="status" className="grid gap-3">
        <h1 className="m-0 text-[clamp(26px,3vw,34px)] leading-[1.12]">
          Vérifiez votre boîte mail
        </h1>
        <p className="m-0 text-base leading-[26px] text-neutre-800">
          Si <strong>{envoye}</strong> correspond à un compte, ou pour en créer un, un lien de
          connexion vient de partir. Il est valable 1 heure et ne sert qu&apos;une fois.
        </p>
        <p className="m-0 text-sm text-neutre-700">
          Rien reçu ? Regardez dans les indésirables, puis{' '}
          <button
            type="button"
            onClick={() => setEnvoye(null)}
            className="inline-flex min-h-11 cursor-pointer items-center border-0 bg-transparent p-0 font-semibold text-accent-700 underline"
          >
            recommencez
          </button>
          .
        </p>
      </div>
    );

  return (
    <form onSubmit={envoyer} noValidate className="grid gap-4">
      <div>
        <h1 className="m-0 mb-2 text-[clamp(26px,3vw,34px)] leading-[1.12]">
          Accéder à mon espace
        </h1>
        <p className="m-0 text-base leading-[26px] text-neutre-800">
          Suivez vos demandes, vos devis et vos échanges avec les artisans. Pas de mot de passe :
          nous vous envoyons un lien de connexion.
        </p>
      </div>
      {erreur ? <Banner tone="danger">{erreur}</Banner> : null}
      <Field label="Votre adresse email" requis>
        <Input champ="email" name="email" placeholder="camille@email.fr" />
      </Field>
      <input type="text" name="site" tabIndex={-1} autoComplete="off" hidden />
      <Button type="submit" taille="lg" pleineLargeur disabled={enCours}>
        {enCours ? 'Envoi…' : 'Recevoir mon lien de connexion'}
      </Button>
    </form>
  );
}
