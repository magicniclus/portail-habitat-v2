'use client';

import { SUJETS_CONTACT, sujetContact } from '@ph/core/support';
import { Banner, bouton, Button, Field, Input, Select, Textarea } from '@ph/ui';
import Link from 'next/link';
import { useActionState, useState, useSyncExternalStore } from 'react';
import { routes } from '@/lib/routes';
import { envoyerContact, type EtatContact } from './actions';

const sAbonner = () => () => {};
const sujetUrl = () => new URLSearchParams(window.location.search).get('sujet');
const auServeur = () => null;

/** Formulaire de la maquette Contact ; `?sujet=` présélectionne le sujet (liens des autres pages). */
export function FormulaireContact() {
  const [etat, envoyer, enCours] = useActionState<EtatContact, FormData>(envoyerContact, null);
  const depuisUrl = useSyncExternalStore(sAbonner, sujetUrl, auServeur);
  const [choix, setChoix] = useState<string | null>(null);
  const sujet = sujetContact(choix ?? depuisUrl);
  const [nouveau, setNouveau] = useState(0);

  if (etat?.ok && nouveau === 0) {
    return (
      <div role="status" className="grid max-w-[560px] gap-3 rounded-card bg-accent-100 p-6">
        <h2 className="m-0 text-[22px]">Message envoyé</h2>
        <p className="m-0 text-[15.5px] leading-[25px] text-neutre-800">
          Merci {etat.data.prenom}. Nous vous répondons à {etat.data.email} sous 24 h ouvrées.
          Référence : <strong>{etat.data.reference}</strong>.
        </p>
        <div className="mt-1 flex flex-wrap gap-2.5">
          <Link href={routes.accueil} className={bouton()}>
            Retour à l&apos;accueil
          </Link>
          <Button variant="fantome" onClick={() => setNouveau(1)}>
            Écrire un autre message
          </Button>
        </div>
      </div>
    );
  }
  const erreurs = etat && !etat.ok ? (etat.champs ?? {}) : {};
  const erreur = (n: string) => erreurs[n]?.[0];

  return (
    <form
      action={(f) => {
        setNouveau(0);
        envoyer(f);
      }}
      className="grid max-w-[560px] gap-[18px]"
      noValidate={false}
    >
      {etat && !etat.ok && !etat.champs ? <Banner tone="danger">{etat.message}</Banner> : null}
      <Field label="Votre demande concerne" aide={sujet.aide}>
        <Select
          key={depuisUrl ?? ''}
          name="sujet"
          defaultValue={sujet.id}
          onChange={(e) => setChoix(e.target.value)}
        >
          {SUJETS_CONTACT.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid gap-[18px] sm:grid-cols-2">
        <Field label="Prénom et nom" requis erreur={erreur('nom')}>
          <Input
            name="nom"
            autoComplete="name"
            autoCapitalize="words"
            required
            enterKeyHint="next"
          />
        </Field>
        <Field label="Email" requis erreur={erreur('email')}>
          <Input champ="email" name="email" required enterKeyHint="next" />
        </Field>
      </div>
      {'ref' in sujet ? (
        <Field
          label={
            <>
              {sujet.ref} <span className="font-normal text-neutre-700">(facultatif)</span>
            </>
          }
          erreur={erreur('referenceDossier')}
        >
          <Input name="referenceDossier" enterKeyHint="next" />
        </Field>
      ) : null}
      <Field label="Votre message" requis erreur={erreur('message')}>
        <Textarea
          name="message"
          rows={6}
          required
          minLength={10}
          maxLength={5000}
          enterKeyHint="send"
        />
      </Field>
      {/* Piège à robots : invisible et ignoré par les lecteurs d'écran. */}
      <div aria-hidden="true" className="absolute -left-[9999px]">
        <label>
          Site web
          <input name="site" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <p className="m-0 text-[13.5px] leading-[21px] text-neutre-700">
        Vos informations servent uniquement à traiter votre demande.{' '}
        <Link href={routes.legal('particuliers', 'confidentialite')}>
          Politique de confidentialité
        </Link>
      </p>
      <div>
        <Button type="submit" taille="lg" disabled={enCours}>
          {enCours ? 'Envoi…' : 'Envoyer mon message'}
        </Button>
      </div>
    </form>
  );
}
