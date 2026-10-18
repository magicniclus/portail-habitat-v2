'use client';

import { messageErreurConnexion } from '@ph/core/connexion';
import { Banner, Button, Field, Input } from '@ph/ui';
import type { MultiFactorResolver } from 'firebase/auth';
import { useState, type FormEvent } from 'react';
import { envoyerSms, validerSms, validerTotp, type EspaceConnexion } from './sessionPro';

/**
 * Second facteur (COMPTES §5) : code de l'application d'authentification, ou SMS si le flag
 * `deuxFacteursSms` est activé (sinon le SMS n'est jamais proposé).
 */
export function SecondFacteur({
  resolveur,
  type,
  smsActif,
  onConnecte,
  espace = 'pro',
}: {
  resolveur: MultiFactorResolver;
  type: 'totp' | 'phone';
  smsActif: boolean;
  onConnecte: () => void;
  espace?: EspaceConnexion;
}) {
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [verification, setVerification] = useState<string | null>(null);
  const sms = type === 'phone';

  const valider = async (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    const code = String(new FormData(ev.currentTarget).get('code') ?? '').replace(/\s/g, '');
    if (!/^\d{6}$/.test(code)) return setErreur('Le code comporte 6 chiffres.');
    setEnCours(true);
    try {
      if (sms && verification) await validerSms(resolveur, verification, code, espace);
      else await validerTotp(resolveur, code, espace);
      onConnecte();
    } catch (e) {
      setErreur(messageErreurConnexion((e as { code?: string }).code ?? ''));
    } finally {
      setEnCours(false);
    }
  };

  if (sms && !smsActif)
    return (
      <Banner tone="attention" titre="Code par SMS indisponible">
        Votre compte utilise un code par SMS, qui n&apos;est pas encore activé. Contactez le support
        pour passer à une application d&apos;authentification.
      </Banner>
    );

  return (
    <form onSubmit={valider} noValidate className="grid gap-4">
      <div>
        <h2 className="m-0 mb-1.5 text-xl">Vérification en deux étapes</h2>
        <p className="m-0 text-[15px] leading-6 text-neutre-800">
          {sms
            ? 'Recevez un code par SMS sur le numéro enregistré, puis saisissez-le.'
            : 'Saisissez le code à 6 chiffres affiché par votre application d’authentification.'}
        </p>
      </div>
      {erreur ? <Banner tone="danger">{erreur}</Banner> : null}
      {sms && !verification ? (
        <>
          <div id="recaptcha-2fa" />
          <Button
            type="button"
            onClick={async () => {
              try {
                setVerification(await envoyerSms(resolveur, 'recaptcha-2fa'));
              } catch (e) {
                setErreur(messageErreurConnexion((e as { code?: string }).code ?? ''));
              }
            }}
          >
            Recevoir le code par SMS
          </Button>
        </>
      ) : (
        <>
          <Field label="Code de vérification" requis>
            <Input name="code" champ="codeSms" />
          </Field>
          <Button type="submit" taille="lg" pleineLargeur disabled={enCours}>
            {enCours ? 'Vérification…' : 'Valider'}
          </Button>
        </>
      )}
    </form>
  );
}
