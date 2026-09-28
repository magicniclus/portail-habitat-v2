'use client';

import { entreeConnexionLien } from '@ph/core/schemas';
import { Banner, Button, Field, Input } from '@ph/ui';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { posterJson } from '@/lib/posterJson';
import { routes } from '@/lib/routes';
import { suiteSure } from '@/lib/suite';
import { emailMemorise, oublierEmail } from './memoire';

/**
 * Retour du lien magique : l'adresse (mémorisée sur cet appareil, sinon ressaisie) et le code
 * partent au serveur, qui ouvre la session. Un lien intercepté ne suffit donc pas.
 */
export function RetourLien() {
  const params = useSearchParams();
  const router = useRouter();
  const oobCode = params.get('oobCode') ?? '';
  const suite = suiteSure(params.get('suite'));
  const [erreur, setErreur] = useState<string | null>(oobCode ? null : 'Ce lien est incomplet.');
  const [enCours, setEnCours] = useState(false);
  const tente = useRef(false);

  const verifier = async (email: string) => {
    const v = entreeConnexionLien.safeParse({ email, oobCode });
    if (!v.success) return setErreur('Indiquez l’adresse à laquelle vous avez reçu le lien.');
    setEnCours(true);
    const r = await posterJson<null>('/api/connexion/verifier', v.data);
    setEnCours(false);
    if (!r.ok) return setErreur(r.message);
    oublierEmail();
    router.replace(suite as Parameters<typeof router.replace>[0]);
  };

  useEffect(() => {
    const email = emailMemorise();
    if (tente.current || !email || !oobCode) return;
    tente.current = true;
    void verifier(email);
    // verifier ne dépend que des paramètres de l'URL, lus une fois
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const envoyer = (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    void verifier(String(new FormData(ev.currentTarget).get('email') ?? '').trim());
  };

  return (
    <form onSubmit={envoyer} noValidate className="grid gap-4">
      <div>
        <h1 className="m-0 mb-2 text-[clamp(26px,3vw,34px)] leading-[1.12]">
          Connexion à votre espace
        </h1>
        <p className="m-0 text-base leading-[26px] text-neutre-800">
          Pour votre sécurité, confirmez l&apos;adresse email à laquelle vous avez reçu ce lien.
        </p>
      </div>
      {erreur ? (
        <Banner tone="danger">
          {erreur} <Link href={routes.connexion}>Recevoir un nouveau lien</Link>
        </Banner>
      ) : null}
      <Field label="Votre adresse email" requis>
        <Input champ="email" name="email" placeholder="camille@email.fr" defaultValue="" />
      </Field>
      <Button type="submit" taille="lg" pleineLargeur disabled={enCours || !oobCode}>
        {enCours ? 'Connexion…' : 'Me connecter'}
      </Button>
    </form>
  );
}
