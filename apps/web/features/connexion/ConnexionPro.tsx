'use client';

import { messageErreurConnexion } from '@ph/core/connexion';
import { Banner, Button, Checkbox, Field, Input } from '@ph/ui';
import { Eye, EyeSlash } from '@phosphor-icons/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useSyncExternalStore, type FormEvent } from 'react';
import { posterJson } from '@/lib/posterJson';
import { routes } from '@/lib/routes';
import { SecondFacteur } from './SecondFacteur';
import { connecterPro, type Etape } from './sessionPro';
import { blocageJusqua, echec, reussite } from './tentatives';

/** Secondes restantes d'un blocage, mises à jour chaque seconde (CON-03). */
function useAttente(jusqua: number) {
  const [maintenant, setMaintenant] = useState(() => Date.now());
  useEffect(() => {
    if (jusqua <= maintenant) return;
    const t = setInterval(() => setMaintenant(Date.now()), 1000);
    return () => clearInterval(t);
  }, [jusqua, maintenant]);
  return Math.max(0, Math.ceil((jusqua - maintenant) / 1000));
}

const sAbonner = () => () => {};

const duree = (s: number) => (s >= 60 ? `${Math.ceil(s / 60)} min` : `${s} s`);

/** Connexion pro (maquette Connexion) : email + mot de passe, puis second facteur s'il existe. */
export function ConnexionPro({ suite, smsActif }: { suite: string; smsActif: boolean }) {
  const router = useRouter();
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [visible, setVisible] = useState(false);
  // Blocage enregistré sur l'appareil (lu après l'hydratation), puis celui des nouveaux échecs.
  const blocageEnregistre = useSyncExternalStore(sAbonner, blocageJusqua, () => 0);
  const [nouveauBlocage, setJusqua] = useState(0);
  const jusqua = Math.max(blocageEnregistre, nouveauBlocage);
  const [facteur, setFacteur] = useState<Extract<Etape, { etape: 'secondFacteur' }> | null>(null);
  const [oubli, setOubli] = useState<string | null>(null);
  const attente = useAttente(jusqua);

  const entrer = () => {
    reussite();
    router.replace(suite as Parameters<typeof router.replace>[0]);
  };

  const connecter = async (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    if (attente > 0) return;
    const f = new FormData(ev.currentTarget);
    setEnCours(true);
    setErreur(null);
    try {
      const r = await connecterPro(
        String(f.get('email') ?? '').trim(),
        String(f.get('motDePasse') ?? ''),
        f.get('memoriser') === 'on',
      );
      if (r.etape === 'connecte') entrer();
      else setFacteur(r);
    } catch (e) {
      setJusqua(echec());
      setErreur(messageErreurConnexion((e as { code?: string }).code ?? ''));
    } finally {
      setEnCours(false);
    }
  };

  const motDePasseOublie = async (email: string) => {
    await posterJson('/api/connexion/reinitialisation', { email });
    setOubli(email);
  };

  if (facteur)
    return (
      <SecondFacteur
        resolveur={facteur.resolveur}
        type={facteur.type}
        smsActif={smsActif}
        onConnecte={entrer}
      />
    );

  return (
    <form onSubmit={connecter} noValidate className="grid gap-4">
      {oubli ? (
        <Banner tone="info">
          Si un compte existe pour {oubli}, un lien pour choisir un nouveau mot de passe vient de
          partir.
        </Banner>
      ) : null}
      <Field label="Email" requis>
        <Input
          champ="email"
          name="email"
          autoComplete="username"
          placeholder="contact@entreprise.fr"
        />
      </Field>
      <Field label="Mot de passe" requis>
        <span className="relative flex">
          <Input
            champ="motDePasseActuel"
            name="motDePasse"
            type={visible ? 'text' : 'password'}
            placeholder="Votre mot de passe"
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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Checkbox name="memoriser" defaultChecked className="text-[14.5px]">
          Rester connecté
        </Checkbox>
        <button
          type="button"
          onClick={(e) => {
            const email = String(new FormData(e.currentTarget.form!).get('email') ?? '').trim();
            if (!email)
              return setErreur('Indiquez votre email, puis cliquez sur « Mot de passe oublié ».');
            void motDePasseOublie(email);
          }}
          className="inline-flex min-h-11 cursor-pointer items-center border-0 bg-transparent p-0 text-[14.5px] font-semibold text-accent-700"
        >
          Mot de passe oublié ?
        </button>
      </div>
      {erreur ? <Banner tone="danger">{erreur}</Banner> : null}
      {attente > 0 ? (
        <p role="status" className="m-0 text-sm font-semibold text-attention">
          Trop de tentatives : réessayez dans {duree(attente)}.
        </p>
      ) : null}
      <Button type="submit" taille="lg" pleineLargeur disabled={enCours || attente > 0}>
        {enCours ? 'Connexion…' : 'Me connecter'}
      </Button>
      <p className="m-0 text-center text-[14.5px] text-neutre-800">
        Pas encore de compte ? <Link href={routes.proInscription}>Inscription gratuite</Link>
      </p>
    </form>
  );
}
