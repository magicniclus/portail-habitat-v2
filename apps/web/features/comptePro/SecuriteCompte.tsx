'use client';

import { resumeDeuxFacteurs } from '@ph/core/espace-pro';
import type { ComptePro } from '@ph/firebase/pro';
import { Badge, Banner, Button, ConfirmDialog } from '@ph/ui';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { LigneReglage } from '@/features/espace/LigneReglage';
import { ActivationTotp } from './ActivationTotp';
import { changerMotDePasse, delierGoogle, lierGoogle, messageAuth } from './authCompte';
import { ChampSecret, ChampsReauth, FeuilleCompte } from './FeuilleCompte';
import { FacteursEnregistres } from './FacteursEnregistres';

function MotDePasse({ deuxFacteurs }: { deuxFacteurs: boolean }) {
  const [actuel, setActuel] = useState('');
  const [code, setCode] = useState('');
  const [nouveau, setNouveau] = useState('');
  return (
    <FeuilleCompte
      titre="Nouveau mot de passe"
      description="Une alerte est envoyée par email après le changement."
      declencheur={
        <Button variant="secondaire" taille="sm" aria-label="Modifier le mot de passe">
          Modifier
        </Button>
      }
      envoyer={() =>
        changerMotDePasse(actuel, nouveau, code || undefined).then(
          () => null,
          (e: unknown) => messageAuth(e),
        )
      }
    >
      <ChampsReauth
        motDePasse={actuel}
        code={code}
        deuxFacteurs={deuxFacteurs}
        onMotDePasse={setActuel}
        onCode={setCode}
      />
      <ChampSecret libelle="Nouveau mot de passe" valeur={nouveau} onChange={setNouveau} nouveau />
    </FeuilleCompte>
  );
}

function Google({ connexion }: { connexion: ComptePro['connexion'] }) {
  const router = useRouter();
  const [erreur, setErreur] = useState<string | null>(null);
  const agir = (f: () => Promise<void>) =>
    f().then(
      () => router.refresh(),
      (e: unknown) => setErreur(messageAuth(e)),
    );
  return (
    <LigneReglage
      libelle="Google"
      valeur={
        <>
          {connexion.google !== null ? `Lié à ${connexion.google}` : 'Non lié'}
          {erreur ? <span className="block text-danger">{erreur}</span> : null}
        </>
      }
      action={
        connexion.google === null ? (
          <Button variant="secondaire" taille="sm" onClick={() => agir(lierGoogle)}>
            Lier
          </Button>
        ) : connexion.motDePasse ? (
          <ConfirmDialog
            declencheur={
              <Button variant="secondaire" taille="sm">
                Délier
              </Button>
            }
            titre="Délier votre compte Google ?"
            libelleConfirmer="Délier"
            onConfirmer={() => agir(delierGoogle)}
          >
            Vous vous connecterez avec votre email et votre mot de passe.
          </ConfirmDialog>
        ) : null
      }
    />
  );
}

/** Connexion et sécurité (maquette Mon Compte, ancre `#securite` depuis CON-02). */
export function SecuriteCompte({ compte, smsActif }: { compte: ComptePro; smsActif: boolean }) {
  const actif = compte.facteurs.length > 0;
  const totp = compte.facteurs.some((f) => f.type === 'totp');
  return (
    <>
      {compte.connexion.motDePasse ? (
        <LigneReglage
          libelle="Mot de passe"
          valeur="Utilisé avec votre email pour vous connecter"
          action={<MotDePasse deuxFacteurs={totp} />}
        />
      ) : null}
      <Google connexion={compte.connexion} />
      <LigneReglage
        libelle="Double authentification"
        valeur={resumeDeuxFacteurs(compte.facteurs)}
        action={
          actif ? <Badge tone="succes">Activée</Badge> : <ActivationTotp deuxFacteurs={false} />
        }
      />
      {actif ? (
        <FacteursEnregistres compte={compte} smsActif={smsActif} />
      ) : (
        <Banner tone="info">
          Obligatoire pour les propriétaires et gérants d&apos;une entreprise Premium : sans elle,
          l&apos;accès à la facturation est bloqué.
        </Banner>
      )}
    </>
  );
}
