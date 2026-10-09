'use client';

import { entreeProspect, TEXTE_CONSENTEMENT_PROSPECT } from '@ph/core/schemas';
import { Banner, Button, Field, Input } from '@ph/ui';
import { useState, type FormEvent } from 'react';
import { posterJson } from '@/lib/posterJson';

/**
 * « Pas encore prêt ? » : l'estimation de la zone reçue par email (prospect, CONVERSION §3 S1).
 * L'usage de l'adresse est indiqué à côté du bouton (CONVERSION §7).
 */
export function RecevoirEstimation({ metier, codePostal }: { metier: string; codePostal: string }) {
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoye, setEnvoye] = useState(false);
  const [enCours, setEnCours] = useState(false);

  const envoyer = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const brut = {
      email: String(f.get('email') ?? '').trim(),
      metier,
      codePostal,
      ...(new URLSearchParams(window.location.search).get('utm_source') === 'facebook'
        ? { source: 'facebook' as const }
        : {}),
      site: String(f.get('site') ?? '') || undefined,
    };
    const v = entreeProspect.safeParse(brut);
    if (!v.success) return setErreur('Indiquez une adresse email valide.');
    setErreur(null);
    setEnCours(true);
    const r = await posterJson<null>('/api/pro/prospect', brut);
    setEnCours(false);
    if (!r.ok) return setErreur(r.message);
    setEnvoye(true);
  };

  if (envoye)
    return (
      <Banner tone="succes">
        C’est envoyé : l’estimation détaillée de votre zone arrive dans votre boîte mail.
      </Banner>
    );
  return (
    <form
      onSubmit={envoyer}
      noValidate
      aria-label="Recevoir l’estimation par email"
      className="grid gap-2 rounded-control border border-trait p-3"
    >
      <p className="m-0 text-sm font-semibold">
        Pas encore prêt ? Recevez cette estimation par email.
      </p>
      <Field label="Email" erreur={erreur ?? undefined}>
        <Input champ="email" name="email" placeholder="contact@entreprise.fr" />
      </Field>
      <input type="text" name="site" tabIndex={-1} autoComplete="off" hidden />
      <Button type="submit" variant="secondaire" disabled={enCours}>
        {enCours ? 'Envoi…' : 'M’envoyer l’estimation'}
      </Button>
      <p className="m-0 text-[13px] leading-5 text-neutre-700">{TEXTE_CONSENTEMENT_PROSPECT}</p>
    </form>
  );
}
