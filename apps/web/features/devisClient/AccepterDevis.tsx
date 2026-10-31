'use client';

import { Banner, Button, Checkbox, Field, Input } from '@ph/ui';
import { useActionState } from 'react';
import { accepterDevis } from './actions';

/**
 * « Accepter ce devis » (signature électronique simple) : nom et « Bon pour accord » ; la date et
 * l'empreinte du PDF envoyé sont enregistrées avec le devis.
 */
export function AccepterDevis({ lien, numero }: { lien: string; numero: string }) {
  const [etat, envoyer, enCours] = useActionState(accepterDevis, null);
  if (etat?.ok)
    return (
      <Banner tone="succes" titre="Devis accepté">
        Merci : l’artisan est prévenu et va revenir vers vous pour la suite.
      </Banner>
    );
  return (
    <form action={envoyer} className="grid gap-4 rounded-[14px] border border-trait p-4">
      <h2 className="m-0 text-lg">Accepter le devis {numero}</h2>
      <input type="hidden" name="lien" value={lien} />
      <Field label="Vos nom et prénom">
        <Input name="nom" autoComplete="name" required maxLength={120} />
      </Field>
      <Checkbox name="accord" required>
        Bon pour accord : j’accepte ce devis et ses conditions, tel que je l’ai téléchargé.
      </Checkbox>
      {etat?.erreur ? <Banner tone="danger">{etat.erreur}</Banner> : null}
      <div>
        <Button chargement={enCours} type="submit" disabled={enCours}>
          {enCours ? 'Enregistrement…' : 'Accepter le devis'}
        </Button>
      </div>
      <p className="m-0 text-sm text-neutre-700">
        Votre nom, la date et l’adresse IP de votre connexion sont enregistrés comme preuve de votre
        accord, avec l’empreinte du document.
      </p>
    </form>
  );
}
