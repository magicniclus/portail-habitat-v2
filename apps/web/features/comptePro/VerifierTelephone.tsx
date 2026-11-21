'use client';

import { formatTel } from '@ph/core/format';
import { Button } from '@ph/ui';
import { useState, type ReactNode } from 'react';
import { envoyerCodeSms, messageAuth, validerCodeSms } from './authCompte';
import { ChampCode, FeuilleCompte } from './FeuilleCompte';

/**
 * Code par SMS (flag `deuxFacteursSms` seulement) : vérifie le mobile du profil, ou l'ajoute comme
 * second facteur de secours (`enSecours`).
 */
export function VerifierTelephone({
  telephone,
  enSecours = false,
  declencheur,
}: {
  telephone: string;
  enSecours?: boolean;
  declencheur?: ReactNode;
}) {
  const [verification, setVerification] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const conteneur = enSecours ? 'recaptcha-secours' : 'recaptcha-telephone';

  const envoyer = async () => {
    try {
      if (!verification) {
        setVerification(await envoyerCodeSms(telephone, conteneur, enSecours));
        return false;
      }
      await validerCodeSms(verification, code, enSecours);
      return null;
    } catch (e) {
      return messageAuth(e);
    }
  };

  return (
    <FeuilleCompte
      titre={enSecours ? 'SMS de secours' : 'Vérifier votre mobile'}
      description={`Un code à 6 chiffres est envoyé au ${formatTel(telephone)}.`}
      declencheur={
        declencheur ?? (
          <Button variant="secondaire" taille="sm">
            Vérifier par SMS
          </Button>
        )
      }
      libelleEnvoi={verification ? 'Valider le code' : 'Recevoir le code'}
      envoyer={envoyer}
    >
      <div id={conteneur} />
      {verification ? (
        <ChampCode valeur={code} onChange={setCode} libelle="Code reçu par SMS" />
      ) : null}
    </FeuilleCompte>
  );
}
