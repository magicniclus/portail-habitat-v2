'use client';

import { messageErreurConnexion } from '@ph/core/connexion';
import { statutCompte } from '@ph/core/onboarding';
import { entreeFinaliserInscription } from '@ph/core/schemas';
import type { EntrepriseProposee } from '@ph/firebase/comptes';
import { GoogleLogoIcon } from '@phosphor-icons/react';
import { Banner, Button, Field, Input } from '@ph/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { activerEspace, type EntrepriseInscription } from '@/features/connexion/sessionPro';
import { routes } from '@/lib/routes';
import { DemandesRecentes } from './ActiviteSecteur';
import { BarreEtape } from './BarreEtape';
import { ChoixEntreprise } from './ChoixEntreprise';
import { MotDePasseCompte } from './MotDePasseCompte';
import { SAISIE_VIDE, SaisieEntreprise, type EntrepriseSaisie } from './SaisieEntreprise';

type Methode = 'google' | 'motDePasse';

/**
 * Étape 3 (maquette Onboarding Etape 3, décisions du 15/11/2026) : l'entreprise (trouvée, ou saisie
 * à la main), puis « Continuer avec Google » ou email + mot de passe. Les conditions générales ont
 * été acceptées à l'étape 1.
 */
export function EtapeCompte({
  email,
  nom,
  zone,
}: {
  email: string;
  /** Nom d'un ancien brouillon ; absent depuis le formulaire court (17/11/2026). */
  nom?: string;
  zone: { ville: string; rayonKm: number };
}) {
  const router = useRouter();
  const [entreprise, setEntreprise] = useState<EntrepriseProposee | null>(null);
  const [manuelle, setManuelle] = useState<EntrepriseSaisie | null>(null);
  const [nomSaisi, setNomSaisi] = useState(nom ?? '');
  const [motDePasse, setMotDePasse] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState<Methode | null>(null);

  const choisie: EntrepriseInscription | null = manuelle
    ? entreeFinaliserInscription.safeParse({ cleIdempotence: 'verification', manuelle }).success
      ? { manuelle }
      : null
    : entreprise
      ? { siren: entreprise.entreprise.siren }
      : null;
  const s = statutCompte({
    methode: 'motDePasse',
    entrepriseChoisie: choisie !== null,
    motDePasse,
    confirmation,
  });

  const activer = async (methode: Methode) => {
    if (!choisie)
      return setErreur(
        manuelle
          ? 'Complétez le SIRET (14 chiffres), le nom et l’adresse de votre entreprise.'
          : 'Indiquez d’abord votre entreprise.',
      );
    // Email et mot de passe : le nom se demande ici (avec Google, il vient du compte).
    if (methode === 'motDePasse' && nomSaisi.trim().length < 2)
      return setErreur('Indiquez votre nom et prénom.');
    setEnCours(methode);
    setErreur(null);
    try {
      await activerEspace(
        methode === 'google' ? { methode } : { methode, email, motDePasse, nom: nomSaisi.trim() },
        choisie,
      );
      router.replace('/pro/tableau-de-bord?bienvenue=1' as Parameters<typeof router.replace>[0]);
    } catch (e) {
      const code = (e as { code?: string }).code ?? '';
      setErreur(
        code === 'finaliser'
          ? (e as Error).message
          : code === 'auth/invalid-credential' || code === 'auth/wrong-password'
            ? 'Un compte existe déjà avec cet email : saisissez son mot de passe, ou connectez-vous.'
            : code === 'auth/popup-closed-by-user'
              ? 'Fenêtre Google fermée avant la fin : réessayez.'
              : messageErreurConnexion(code),
      );
      setEnCours(null);
    }
  };

  const envoyer = (ev: FormEvent) => {
    ev.preventDefault();
    if (s.complete) void activer('motDePasse');
  };

  return (
    <form id="form-compte" onSubmit={envoyer} className="grid gap-5">
      <div>
        <h1 className="m-0 mb-2 text-[clamp(26px,3vw,34px)] leading-[1.12]">
          Créez votre <span className="accent-editorial">compte</span>
        </h1>
        <p className="m-0 text-[15px] leading-[23px] text-neutre-800">
          Dernière étape avant de recevoir vos demandes.
        </p>
      </div>
      <div className="md:hidden">
        <DemandesRecentes zone={zone} compact />
      </div>
      {erreur ? (
        <Banner tone="danger">
          {erreur} <Link href={routes.connexionPro}>Se connecter</Link>
        </Banner>
      ) : null}
      {manuelle ? (
        <div className="grid gap-2">
          <SaisieEntreprise valeur={manuelle} onChange={setManuelle} />
          <button type="button" onClick={() => setManuelle(null)} className={lien}>
            Revenir à la recherche
          </button>
        </div>
      ) : (
        <ChoixEntreprise
          choisie={entreprise}
          onChoix={setEntreprise}
          introuvable={
            <button
              type="button"
              onClick={() => {
                setEntreprise(null);
                setManuelle(SAISIE_VIDE);
              }}
              className={lien}
            >
              Je ne trouve pas mon entreprise
            </button>
          }
        />
      )}
      <section aria-labelledby="titre-acces" className="grid gap-3">
        <h2 id="titre-acces" className="m-0 text-lg">
          Votre accès
        </h2>
        <Button
          type="button"
          variant="secondaire"
          className="min-h-12 w-full"
          chargement={enCours === 'google'}
          disabled={enCours !== null}
          onClick={() => void activer('google')}
        >
          <GoogleLogoIcon size={20} weight="bold" aria-hidden="true" />
          Continuer avec Google
        </Button>
        <p className="m-0 flex items-center gap-3 text-[13px] text-neutre-700 before:h-px before:flex-1 before:bg-trait after:h-px after:flex-1 after:bg-trait">
          ou avec votre email
        </p>
        <p className="m-0 text-sm text-neutre-800">
          Identifiant : <strong>{email}</strong>
        </p>
        <Field label="Nom et prénom" requis>
          <Input
            name="nom"
            autoComplete="name"
            autoCapitalize="words"
            placeholder="Julien Bertrand"
            value={nomSaisi}
            onChange={(ev) => setNomSaisi(ev.target.value)}
          />
        </Field>
        <MotDePasseCompte
          motDePasse={motDePasse}
          confirmation={confirmation}
          onMotDePasse={setMotDePasse}
          onConfirmation={setConfirmation}
        />
      </section>
      <BarreEtape
        etape="Étape 3 sur 3 · Votre compte"
        statut={s.statut}
        complete={s.complete}
        libelle="Activer mon espace"
        formulaire="form-compte"
        enCours={enCours === 'motDePasse'}
      />
    </form>
  );
}

const lien =
  'min-h-11 cursor-pointer justify-self-start border-0 bg-transparent p-0 text-left text-[15px] font-semibold text-accent-700 underline underline-offset-2';
