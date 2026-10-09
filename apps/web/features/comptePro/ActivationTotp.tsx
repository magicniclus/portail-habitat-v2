'use client';

import type { TotpSecret } from 'firebase/auth';
import { Button } from '@ph/ui';
import { useState } from 'react';
import { finaliserTotp, messageAuth, preparerTotp } from './authCompte';
import { ChampCode, ChampsReauth, FeuilleCompte } from './FeuilleCompte';
import { QrCode } from './QrCode';

/** Clé secrète lisible : groupes de 4 caractères. */
const grouper = (cle: string) => cle.match(/.{1,4}/g)?.join(' ') ?? cle;

/**
 * Activation de l'application d'authentification (TOTP, gratuit) en deux temps : mot de passe,
 * puis QR code (ou clé, ou lien direct sur téléphone) et premier code.
 */
export function ActivationTotp({ deuxFacteurs }: { deuxFacteurs: boolean }) {
  const [motDePasse, setMotDePasse] = useState('');
  const [code, setCode] = useState('');
  const [codeActuel, setCodeActuel] = useState('');
  const [etape, setEtape] = useState<{ secret: TotpSecret; lien: string } | null>(null);

  const envoyer = async () => {
    try {
      if (!etape) {
        setEtape(await preparerTotp(motDePasse, codeActuel || undefined));
        return false;
      }
      await finaliserTotp(etape.secret, code);
      return null;
    } catch (e) {
      return messageAuth(e);
    }
  };

  return (
    <FeuilleCompte
      titre="Application d’authentification"
      description={
        etape
          ? 'Scannez ce QR code avec Google Authenticator, Microsoft Authenticator ou une application similaire, puis saisissez le code affiché.'
          : 'Un code en plus du mot de passe à chaque nouvelle connexion. Confirmez d’abord votre mot de passe.'
      }
      declencheur={<Button taille="sm">Activer</Button>}
      libelleEnvoi={etape ? 'Activer' : 'Continuer'}
      envoyer={envoyer}
    >
      {etape ? (
        <>
          <div className="flex justify-center">
            <QrCode valeur={etape.lien} libelle="QR code à scanner avec votre application" />
          </div>
          <p className="m-0 text-sm text-neutre-700">
            Sur ce téléphone ?{' '}
            <a href={etape.lien} className="font-semibold">
              Ouvrir dans l’application
            </a>
            . Ou saisissez la clé :{' '}
            <code className="font-mono text-[15px] break-all text-texte">
              {grouper(etape.secret.secretKey)}
            </code>
          </p>
          <ChampCode valeur={code} onChange={setCode} />
        </>
      ) : (
        <ChampsReauth
          motDePasse={motDePasse}
          code={codeActuel}
          deuxFacteurs={deuxFacteurs}
          onMotDePasse={setMotDePasse}
          onCode={setCodeActuel}
        />
      )}
    </FeuilleCompte>
  );
}
