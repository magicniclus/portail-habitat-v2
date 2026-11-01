'use client';

import { formatTel } from '@ph/core/format';
import { entreeContactFiche } from '@ph/core/schemas';
import { Banner, Button, Checkbox, Field, Input, Textarea } from '@ph/ui';
import { CheckCircleIcon, PhoneIcon } from '@phosphor-icons/react';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { posterJson } from '@/lib/posterJson';
import { routes } from '@/lib/routes';

const VIDE = { prenom: '', nom: '', email: '', telephone: '', codePostal: '', description: '' };
type Champs = typeof VIDE;

/**
 * Colonne de droite de la fiche publique (même place que « Aperçu côté particulier » dans Ma
 * fiche) : coordonnées laissées directement à l'artisan (demande attribuée, gratuite pour lui),
 * numéro affiché à la demande s'il est public, simulateur en option.
 */
export function ContactFiche({
  artisanId,
  nom,
  telephone,
}: {
  artisanId: string;
  nom: string;
  /** Numéro public (formule avec numéro visible) ; `null` : masqué. */
  telephone: string | null;
}) {
  const [v, setV] = useState<Champs>(VIDE);
  const [accord, setAccord] = useState(false);
  const [erreurs, setErreurs] = useState<Partial<Record<keyof Champs | 'accord', string>>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [envoyee, setEnvoyee] = useState<string | null>(null);
  const [numero, setNumero] = useState(false);
  const [cle] = useState(() => crypto.randomUUID());
  const champ = (k: keyof Champs) => ({
    value: v[k],
    onChange: (e: { target: { value: string } }) => setV((x) => ({ ...x, [k]: e.target.value })),
  });

  const envoyer = async (ev: FormEvent) => {
    ev.preventDefault();
    const corps = { artisanId, ...v, miseEnRelation: accord, cleIdempotence: cle };
    const p = entreeContactFiche.safeParse(corps);
    if (!p.success) {
      const e: typeof erreurs = {};
      for (const i of p.error.issues) {
        const k = (i.path[0] === 'miseEnRelation' ? 'accord' : i.path[0]) as keyof typeof e;
        e[k] ??= i.message;
      }
      return setErreurs(e);
    }
    setErreurs({});
    setMessage(null);
    setEnCours(true);
    const r = await posterJson<{ reference: string }>('/api/fiche/contact', corps);
    setEnCours(false);
    if (!r.ok) return setMessage(r.message);
    setEnvoyee(r.data.reference);
  };

  if (envoyee)
    return (
      <aside
        aria-label="Demander un devis"
        className="grid content-start gap-3 rounded-[16px] border border-trait bg-blanc p-5 lg:sticky lg:top-5"
      >
        <CheckCircleIcon size={36} weight="fill" aria-hidden="true" className="text-accent" />
        <h2 className="m-0 text-xl">Demande envoyée</h2>
        <p className="m-0 text-[15px] leading-6 text-neutre-800">
          {nom} a reçu vos coordonnées et vous recontacte rapidement. Référence :{' '}
          <strong>{envoyee}</strong>.
        </p>
      </aside>
    );

  return (
    <aside
      aria-label="Demander un devis"
      className="grid content-start gap-3 rounded-[16px] border border-trait bg-blanc p-5 lg:sticky lg:top-5"
    >
      <h2 className="m-0 text-xl">Demander un devis</h2>
      <p className="m-0 text-sm text-neutre-800">
        Laissez vos coordonnées : {nom} vous recontacte directement.
      </p>
      <form onSubmit={envoyer} noValidate className="grid gap-3">
        {message ? <Banner tone="danger">{message}</Banner> : null}
        <div className="grid gap-3 min-[400px]:grid-cols-2 [&_input]:min-w-0">
          <Field label="Prénom" requis erreur={erreurs.prenom}>
            <Input autoComplete="given-name" {...champ('prenom')} />
          </Field>
          <Field label="Nom" requis erreur={erreurs.nom}>
            <Input autoComplete="family-name" {...champ('nom')} />
          </Field>
        </div>
        <Field label="Email" requis erreur={erreurs.email}>
          <Input type="email" autoComplete="email" {...champ('email')} />
        </Field>
        <Field label="Téléphone" requis erreur={erreurs.telephone}>
          <Input type="tel" autoComplete="tel" {...champ('telephone')} />
        </Field>
        <Field label="Code postal du chantier" requis erreur={erreurs.codePostal}>
          <Input
            inputMode="numeric"
            autoComplete="postal-code"
            maxLength={5}
            {...champ('codePostal')}
          />
        </Field>
        <Field label="Description du projet" aide="Facultatif" erreur={erreurs.description}>
          <Textarea rows={3} maxLength={2000} {...champ('description')} />
        </Field>
        <Checkbox
          checked={accord}
          onChange={(e) => setAccord(e.currentTarget.checked)}
          className="text-[13px]"
        >
          J&apos;accepte que mes coordonnées soient transmises à {nom} pour être recontacté au sujet
          de mon projet.
        </Checkbox>
        {erreurs.accord ? (
          <p role="alert" className="m-0 text-[13px] text-danger">
            {erreurs.accord}
          </p>
        ) : null}
        <Button type="submit" taille="lg" chargement={enCours} data-ph-fiche="devis">
          Envoyer ma demande
        </Button>
      </form>
      {telephone ? (
        numero ? (
          <a
            href={`tel:${telephone}`}
            className="flex min-h-11 items-center justify-center gap-2 rounded-control border border-trait font-semibold text-texte no-underline"
          >
            <PhoneIcon size={18} aria-hidden="true" />
            {formatTel(telephone)}
          </a>
        ) : (
          <Button variant="secondaire" data-ph-fiche="tel" onClick={() => setNumero(true)}>
            <PhoneIcon size={18} aria-hidden="true" />
            Voir le numéro de téléphone
          </Button>
        )
      ) : null}
      <p className="m-0 text-[13px] text-neutre-700">
        Vous préférez une estimation d&apos;abord ?{' '}
        <Link href={routes.simulateurArtisan(artisanId)} prefetch={false} className="font-semibold">
          Simuler mon devis
        </Link>
      </p>
    </aside>
  );
}
