'use client';

import { forceMotDePasse, statutCompte } from '@ph/core/onboarding';
import { messageErreurConnexion } from '@ph/core/connexion';
import type { EntrepriseProposee } from '@ph/firebase/comptes';
import { Eye, EyeSlash } from '@phosphor-icons/react';
import { Banner, Checkbox, Field, Input } from '@ph/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { activerEspace } from '@/features/connexion/sessionPro';
import { routes } from '@/lib/routes';
import { BarreEtape } from './BarreEtape';
import { ChoixEntreprise } from './ChoixEntreprise';

const NIVEAUX = ['à définir', 'faible', 'correcte', 'bonne', 'excellente'];

/** Étape 3 (maquette Onboarding Etape 3) : entreprise, mot de passe, conditions, activation. */
export function EtapeCompte({ email, nom }: { email: string; nom: string }) {
  const router = useRouter();
  const [entreprise, setEntreprise] = useState<EntrepriseProposee | null>(null);
  const [motDePasse, setMotDePasse] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [cgv, setCgv] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [visible, setVisible] = useState(false);
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
        <h1 className="m-0 mb-2 text-[clamp(26px,3vw,34px)] leading-[1.12]">
          Créez votre <span className="accent-editorial">mot de passe</span>
        </h1>
        <p className="m-0 text-[15px] leading-[23px] text-neutre-800">
          Dernière étape avant de recevoir vos demandes. Identifiant : <strong>{email}</strong>
        </p>
      </div>
      {erreur ? (
        <Banner tone="danger">
          {erreur} <Link href={routes.connexionPro}>Se connecter</Link>
        </Banner>
      ) : null}
      <ChoixEntreprise choisie={entreprise} onChoix={setEntreprise} />
      <Field label="Mot de passe" requis>
        <span className="relative flex">
          <Input
            champ="motDePasseNouveau"
            type={visible ? 'text' : 'password'}
            placeholder="10 caractères minimum"
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
            className="pr-12"
          />
          <button
            type="button"
            onClick={() => setVisible(!visible)}
            aria-pressed={visible}
            className="absolute inset-y-0 right-0 grid min-h-11 w-11 cursor-pointer place-items-center border-0 bg-transparent text-neutre-700"
          >
            {visible ? (
              <EyeSlash size={20} aria-hidden="true" />
            ) : (
              <Eye size={20} aria-hidden="true" />
            )}
            <span className="sr-only">
              {visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            </span>
          </button>
        </span>
      </Field>
      <div aria-live="polite" className="-mt-2 grid gap-2">
        <span aria-hidden="true" className="h-1.5 overflow-hidden rounded-pill bg-neutre-300">
          <span
            className="block h-full bg-accent motion-safe:transition-[width]"
            style={{ width: `${force * 25}%` }}
          />
        </span>
        <span className="text-[13px] text-neutre-800">
          Sécurité : <strong>{NIVEAUX[force]}</strong> · 10 caractères, une majuscule ou un chiffre
        </span>
      </div>
      <Field label="Confirmer le mot de passe" requis>
        <Input
          champ="motDePasseNouveau"
          type={visible ? 'text' : 'password'}
          placeholder="Retapez votre mot de passe"
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
        />
      </Field>
      <Checkbox
        checked={cgv}
        onChange={(e) => setCgv(e.currentTarget.checked)}
        className="text-sm leading-[21px] text-neutre-800"
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
