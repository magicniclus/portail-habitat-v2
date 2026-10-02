'use client';

import { Banner, Button, Field, Input, Textarea } from '@ph/ui';
import { useState, type FormEvent } from 'react';
import { creerOuConnecter } from '@/features/connexion/sessionPro';
import { posterJson } from '@/lib/posterJson';

/**
 * Demande pour rejoindre une entreprise (COMPTES §4.4) : le propriétaire et les gérants répondent ;
 * le demandeur ne voit jamais leur adresse. Sans session : compte créé (ou connexion) d'abord.
 */
export function DemanderAcces({ artisanId, connecte }: { artisanId: string; connecte: boolean }) {
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [message, setMessage] = useState('');
  const [etat, setEtat] = useState<'saisie' | 'envoi' | 'envoyee'>('saisie');
  const [erreur, setErreur] = useState<string | null>(null);

  const envoyer = async (ev: FormEvent) => {
    ev.preventDefault();
    setEtat('envoi');
    setErreur(null);
    try {
      if (!connecte) await creerOuConnecter({ email: email.trim(), motDePasse, nom: nom.trim() });
      const r = await posterJson<unknown>('/api/pro/rejoindre', {
        artisanId,
        ...(message.trim() ? { message: message.trim() } : {}),
      });
      if (!r.ok) throw new Error(r.message);
      setEtat('envoyee');
    } catch (e) {
      setErreur((e as Error).message || "La demande n'a pas pu être envoyée.");
      setEtat('saisie');
    }
  };

  if (etat === 'envoyee')
    return (
      <Banner tone="succes" titre="Demande envoyée">
        Le propriétaire de l&apos;entreprise vous répondra par email. Sans réponse sous 14 jours, la
        demande expire.
      </Banner>
    );

  return (
    <form onSubmit={envoyer} className="grid gap-4">
      {erreur ? <Banner tone="danger">{erreur}</Banner> : null}
      {connecte ? null : (
        <>
          <Field label="Votre nom et prénom" requis>
            <Input champ="nom" value={nom} onChange={(e) => setNom(e.target.value)} />
          </Field>
          <Field label="Email" requis>
            <Input champ="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field
            label="Mot de passe"
            requis
            aide="Créez-en un, ou saisissez celui de votre compte."
          >
            <Input
              champ="motDePasseNouveau"
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
            />
          </Field>
        </>
      )}
      <Field
        label="Message pour le propriétaire"
        aide="Facultatif : votre rôle dans l'entreprise, par exemple."
      >
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={1000}
          rows={3}
        />
      </Field>
      <Button
        type="submit"
        disabled={
          etat === 'envoi' ||
          (!connecte && (!email.includes('@') || motDePasse.length < 10 || nom.trim().length < 2))
        }
      >
        {etat === 'envoi' ? 'Envoi…' : 'Demander à rejoindre'}
      </Button>
    </form>
  );
}
