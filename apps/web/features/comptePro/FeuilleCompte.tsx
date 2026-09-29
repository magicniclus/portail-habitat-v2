'use client';

import { Banner, Button, Feuille, Field, Input } from '@ph/ui';
import { useRouter } from 'next/navigation';
import { useId, useState, type FormEvent, type ReactNode } from 'react';

/**
 * Réglage de Mon compte dans une feuille (fenêtre sur ordinateur) : `envoyer` renvoie un message
 * d'erreur, `false` pour passer à l'étape suivante sans fermer, ou `null` : la feuille se ferme et
 * la page est relue.
 */
export function FeuilleCompte({
  titre,
  declencheur,
  description,
  libelleEnvoi = 'Enregistrer',
  envoyer,
  children,
}: {
  titre: string;
  declencheur: ReactNode;
  description?: ReactNode;
  libelleEnvoi?: string;
  envoyer: () => Promise<string | null | false>;
  children: ReactNode;
}) {
  const router = useRouter();
  const id = useId();
  const [ouvert, setOuvert] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const soumettre = async (ev: FormEvent) => {
    ev.preventDefault();
    setEnCours(true);
    setErreur(null);
    const e = await envoyer();
    setEnCours(false);
    if (e === false) return;
    if (e) return setErreur(e);
    setOuvert(false);
    router.refresh();
  };

  return (
    <Feuille
      open={ouvert}
      onOpenChange={(o) => {
        setOuvert(o);
        setErreur(null);
      }}
      titre={titre}
      description={description}
      declencheur={declencheur}
      actions={
        <Button type="submit" form={id} disabled={enCours}>
          {enCours ? 'Un instant…' : libelleEnvoi}
        </Button>
      }
    >
      <form id={id} onSubmit={soumettre} className="grid gap-4">
        {erreur ? <Banner tone="danger">{erreur}</Banner> : null}
        {children}
      </form>
    </Feuille>
  );
}

/** Mot de passe actuel et, si la double authentification est active, code de l'application. */
export function ChampsReauth({
  motDePasse,
  code,
  deuxFacteurs,
  onMotDePasse,
  onCode,
}: {
  motDePasse: string;
  code: string;
  deuxFacteurs: boolean;
  onMotDePasse: (v: string) => void;
  onCode: (v: string) => void;
}) {
  return (
    <>
      <ChampSecret libelle="Mot de passe actuel" valeur={motDePasse} onChange={onMotDePasse} />
      {deuxFacteurs ? <ChampCode valeur={code} onChange={onCode} /> : null}
    </>
  );
}

export function ChampSecret({
  libelle,
  valeur,
  onChange,
  nouveau,
}: {
  libelle: string;
  valeur: string;
  onChange: (v: string) => void;
  nouveau?: boolean;
}) {
  return (
    <Field label={libelle} requis aide={nouveau ? '8 caractères au moins.' : undefined}>
      <Input
        type="password"
        value={valeur}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={nouveau ? 'new-password' : 'current-password'}
        minLength={nouveau ? 8 : undefined}
        required
      />
    </Field>
  );
}

export function ChampCode({
  valeur,
  onChange,
  libelle = 'Code à 6 chiffres de votre application',
}: {
  valeur: string;
  onChange: (v: string) => void;
  libelle?: string;
}) {
  return (
    <Field label={libelle} requis>
      <Input
        value={valeur}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="\d{6}"
        required
      />
    </Field>
  );
}
