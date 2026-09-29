'use client';

import { Banner, Button, Field, Input, bouton } from '@ph/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { rejoindreEquipe } from '@/features/connexion/sessionPro';
import { routes } from '@/lib/routes';

/**
 * INV-01 : rejoindre l'équipe. Connecté avec la bonne adresse : un bouton ; sans compte : nom et
 * mot de passe (le lien prouve l'adresse) ; ou connexion avec un compte existant.
 */
export function AccepterInvitation({ jeton, connecte }: { jeton: string; connecte: boolean }) {
  const router = useRouter();
  const [nom, setNom] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const rejoindre = async (ev?: FormEvent) => {
    ev?.preventDefault();
    setEnCours(true);
    setErreur(null);
    try {
      await rejoindreEquipe({ jeton, ...(connecte ? {} : { acces: { nom, motDePasse } }) });
      router.replace(routes.proTableauDeBord);
    } catch (e) {
      setErreur((e as Error).message || "L'invitation n'a pas pu être acceptée.");
      setEnCours(false);
    }
  };

  if (connecte)
    return (
      <div className="grid gap-3">
        {erreur ? <Banner tone="danger">{erreur}</Banner> : null}
        <Button onClick={() => void rejoindre()} disabled={enCours}>
          {enCours ? 'Patientez…' : "Rejoindre l'équipe"}
        </Button>
      </div>
    );

  const suite = routes.connexionProSuite(`/pro/invitation?t=${jeton}`) as Route;
  return (
    <form onSubmit={rejoindre} className="grid gap-4">
      {erreur ? <Banner tone="danger">{erreur}</Banner> : null}
      <Field label="Votre nom et prénom" requis>
        <Input champ="nom" value={nom} onChange={(e) => setNom(e.target.value)} />
      </Field>
      <Field label="Choisissez un mot de passe" requis aide="10 caractères au moins.">
        <Input
          champ="motDePasseNouveau"
          value={motDePasse}
          onChange={(e) => setMotDePasse(e.target.value)}
        />
      </Field>
      <Button type="submit" disabled={enCours || nom.trim().length < 2 || motDePasse.length < 10}>
        {enCours ? 'Patientez…' : "Créer mon accès et rejoindre l'équipe"}
      </Button>
      <p className="m-0 text-sm text-neutre-800">
        Vous avez déjà un compte avec cette adresse ?{' '}
        <Link href={suite} className={bouton({ variant: 'fantome', taille: 'sm' })}>
          Me connecter
        </Link>
      </p>
    </form>
  );
}
