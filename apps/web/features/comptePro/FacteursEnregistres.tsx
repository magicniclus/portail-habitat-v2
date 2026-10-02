'use client';

import type { ComptePro, FacteurPro } from '@ph/firebase/pro';
import { Button } from '@ph/ui';
import { useState } from 'react';
import { LigneReglage } from '@/features/espace/LigneReglage';
import { ActivationTotp } from './ActivationTotp';
import { messageAuth, retirerFacteur } from './authCompte';
import { ChampsReauth, FeuilleCompte } from './FeuilleCompte';
import { VerifierTelephone } from './VerifierTelephone';

function Retirer({
  facteur,
  dernier,
  totp,
}: {
  facteur: FacteurPro;
  dernier: boolean;
  totp: boolean;
}) {
  const [motDePasse, setMotDePasse] = useState('');
  const [code, setCode] = useState('');
  const nom = facteur.type === 'totp' ? 'l’application d’authentification' : 'le SMS de secours';
  return (
    <FeuilleCompte
      titre={`Retirer ${nom} ?`}
      description={
        dernier
          ? 'Votre compte ne sera plus protégé par un second facteur. Si votre entreprise est Premium, l’accès à la facturation sera bloqué.'
          : 'Confirmez avec votre mot de passe.'
      }
      declencheur={
        <Button variant="secondaire" taille="sm" aria-label={`Retirer ${nom}`}>
          Retirer
        </Button>
      }
      libelleEnvoi="Retirer"
      envoyer={() =>
        retirerFacteur(facteur.uid, motDePasse, code || undefined).then(
          () => null,
          (e: unknown) => messageAuth(e),
        )
      }
    >
      <ChampsReauth
        motDePasse={motDePasse}
        code={code}
        deuxFacteurs={totp}
        onMotDePasse={setMotDePasse}
        onCode={setCode}
      />
    </FeuilleCompte>
  );
}

/** Méthodes enregistrées sous la ligne « Double authentification », avec l'ajout d'un secours. */
export function FacteursEnregistres({
  compte,
  smsActif,
}: {
  compte: ComptePro;
  smsActif: boolean;
}) {
  const totp = compte.facteurs.some((f) => f.type === 'totp');
  const sms = compte.facteurs.some((f) => f.type === 'sms');
  return (
    <ul aria-label="Méthodes de double authentification" className="m-0 list-none p-0 ps-4">
      {compte.facteurs.map((f) => (
        <li key={f.uid}>
          <LigneReglage
            libelle={f.type === 'totp' ? 'Application d’authentification' : 'SMS de secours'}
            valeur={
              f.type === 'totp'
                ? 'Code à 6 chiffres, renouvelé toutes les 30 secondes'
                : (f.telephoneMasque ?? '')
            }
            action={<Retirer facteur={f} dernier={compte.facteurs.length === 1} totp={totp} />}
          />
        </li>
      ))}
      {!totp ? (
        <li>
          <LigneReglage
            libelle="Application d’authentification"
            valeur="Gratuite, fonctionne sans réseau"
            action={<ActivationTotp deuxFacteurs={false} />}
          />
        </li>
      ) : null}
      {smsActif && !sms && compte.profil.telephone ? (
        <li>
          <LigneReglage
            libelle="SMS de secours"
            valeur="Si vous n’avez plus votre application"
            action={
              <VerifierTelephone
                telephone={compte.profil.telephone}
                enSecours
                declencheur={
                  <Button variant="secondaire" taille="sm">
                    Ajouter
                  </Button>
                }
              />
            }
          />
        </li>
      ) : null}
    </ul>
  );
}
