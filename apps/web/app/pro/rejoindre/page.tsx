import { appAdmin } from '@ph/firebase/admin';
import { chemins } from '@ph/firebase/chemins';
import { bouton } from '@ph/ui';
import { getFirestore } from 'firebase-admin/firestore';
import type { Metadata } from 'next';
import Link from 'next/link';
import { DemanderAcces } from '@/features/equipe/DemanderAcces';
import { ConfigFirebase } from '@/features/firebase/ConfigFirebase';
import { routes } from '@/lib/routes';
import { lireSessionPro } from '@/server/sessionPro';

export const metadata: Metadata = { title: 'Rejoindre une entreprise', robots: { index: false } };
export const dynamic = 'force-dynamic';

/**
 * Maquette Invitation, état « demander à rejoindre » (ONB-03, COMPTES §4.4) ; `?revendiquer=` : fiche
 * créée sans propriétaire (COMPTES §3.4), vérifiée par un modérateur.
 */
export default async function PageRejoindre({
  searchParams,
}: {
  searchParams: Promise<{ entreprise?: string; revendiquer?: string }>;
}) {
  const p = await searchParams;
  const id = p.entreprise ?? p.revendiquer ?? '';
  const artisan = /^[\w-]{1,128}$/.test(id)
    ? await getFirestore(appAdmin()).doc(chemins.artisan(id)).get()
    : null;
  const nom = artisan?.get('nomCommercial') as string | undefined;
  const s = await lireSessionPro();
  return (
    <main className="mx-auto grid w-full max-w-[560px] gap-5 px-4 py-10">
      <ConfigFirebase />
      {!nom ? (
        <>
          <h1 className="m-0 text-[clamp(26px,3vw,34px)] leading-[1.1]">Entreprise introuvable</h1>
          <Link href={routes.pro} className={bouton({ variant: 'secondaire' })}>
            Retour à Portail Habitat Pro
          </Link>
        </>
      ) : p.revendiquer ? (
        <>
          <h1 className="m-0 text-[clamp(26px,3vw,34px)] leading-[1.1]">Revendiquer {nom}</h1>
          <p className="m-0 text-base text-neutre-800">
            Cette fiche a été créée sans propriétaire. Pour la revendiquer, écrivez-nous avec un
            extrait Kbis : un modérateur vérifie la demande sous 48 h ouvrées.
          </p>
          <Link href={routes.aideSujet('inscription-pro')} className={bouton()}>
            Contacter le support
          </Link>
        </>
      ) : (
        <>
          <h1 className="m-0 text-[clamp(26px,3vw,34px)] leading-[1.1]">Rejoindre {nom}</h1>
          <p className="m-0 text-base text-neutre-800">
            Cette entreprise a déjà un compte. Demandez au propriétaire de vous ajouter à son
            équipe.
          </p>
          <DemanderAcces artisanId={id} connecte={Boolean(s)} />
        </>
      )}
    </main>
  );
}
