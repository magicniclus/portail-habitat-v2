'use client';

import { forceMotDePasse, statutCompte } from '@ph/core/onboarding';
import { messageErreurConnexion } from '@ph/core/connexion';
import type { EntrepriseProposee } from '@ph/firebase/comptes';
import { Banner, Checkbox, Field, Input } from '@ph/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { activerEspace } from '@/features/connexion/sessionPro';
import { routes } from '@/lib/routes';
import { BarreEtape } from './BarreEtape';
import { ChoixEntreprise } from './ChoixEntreprise';

const NIVEAUX = ['Trop court', 'Faible', 'Correct', 'Bon', 'Excellent'];

/** Étape 3 (maquette Onboarding Etape 3) : entreprise, mot de passe, conditions, activation. */
export function EtapeCompte({ email, nom }: { email: string; nom: string }) {
  const router = useRouter();
  const [entreprise, setEntreprise] = useState<EntrepriseProposee | null>(null);
  const [motDePasse, setMotDePasse] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [cgv, setCgv] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const s = statutCompte({ entrepriseChoisie: entreprise !== null, motDePasse, confirmation, cgv });
  const force = forceMotDePasse(motDePasse);

  const activer = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!s.complete || !entreprise) return;
    setEnCours(true);
    setErreur(null);
    try {
      await activerEspace({ email, motDePasse, nom, siren: entreprise.entreprise.siren });
      router.replace('/pro/tableau-de-bord?bienvenue=1' as Parameters<typeof router.replace>[0]);
    } catch (e) {
      const code = (e as { code?: string }).code ?? '';
      setErreur(
        code === 'finaliser'
          ? (e as Error).message
          : code === 'auth/invalid-credential' || code === 'auth/wrong-password'
            ? 'Un compte existe déjà avec cet email : saisissez son mot de passe, ou connectez-vous.'
            : messageErreurConnexion(code),
      );
      setEnCours(false);
    }
  };

  return (
    <form id="form-compte" onSubmit={activer} className="grid gap-5">
      <div>
        <h1 className="m-0 mb-2 text-[clamp(28px,3.4vw,38px)] leading-[1.08]">
          Créez votre <span className="accent-editorial">mot de passe</span>
        </h1>
        <p className="m-0 text-base text-neutre-800">
          Dernière étape avant de recevoir vos demandes. Identifiant : <strong>{email}</strong>
        </p>
      </div>
      {erreur ? (
        <Banner tone="danger">
          {erreur} <Link href={routes.connexionPro}>Se connecter</Link>
        </Banner>
      ) : null}
      <ChoixEntreprise choisie={entreprise} onChoix={setEntreprise} />
      <Field
        label="Mot de passe"
        requis
        aide="10 caractères au moins ; mélangez lettres, chiffres et symboles."
      >
        <Input
          champ="motDePasseNouveau"
          value={motDePasse}
          onChange={(e) => setMotDePasse(e.target.value)}
        />
      </Field>
      <div aria-live="polite" className="-mt-3 grid gap-1">
        <span aria-hidden="true" className="flex gap-1">
          {[1, 2, 3, 4].map((n) => (
            <span
              key={n}
              className={`h-1.5 flex-1 rounded-pill ${force >= n ? 'bg-accent' : 'bg-neutre-200'}`}
            />
          ))}
        </span>
        {motDePasse ? (
          <span className="text-[13px] text-neutre-800">Sécurité : {NIVEAUX[force]}</span>
        ) : null}
      </div>
      <Field label="Confirmer le mot de passe" requis>
        <Input
          champ="motDePasseNouveau"
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
        />
      </Field>
      <Checkbox
        checked={cgv}
        onChange={(e) => setCgv(e.currentTarget.checked)}
        className="text-sm leading-[22px]"
      >
        J&apos;accepte les{' '}
        <Link href={routes.legal('pro', 'cgv')}>conditions générales de vente</Link> et je souhaite
        être visible auprès des particuliers de ma zone.
      </Checkbox>
      <BarreEtape
        etape="Étape 3 sur 3 · Votre compte"
        statut={s.statut}
        complete={s.complete}
        libelle="Activer mon espace"
        formulaire="form-compte"
        enCours={enCours}
      />
    </form>
  );
}
