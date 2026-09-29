import { LIBELLES_ROLE, POUVOIRS_ROLE, type RoleMembre } from '@ph/core/equipe';
import { appAdmin } from '@ph/firebase/admin';
import { apercuInvitation } from '@ph/firebase/comptes';
import { Banner, bouton } from '@ph/ui';
import { getFirestore } from 'firebase-admin/firestore';
import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { AccepterInvitation } from '@/features/equipe/AccepterInvitation';
import { ConfigFirebase } from '@/features/firebase/ConfigFirebase';
import { routes } from '@/lib/routes';
import { lireSessionPro } from '@/server/sessionPro';
import { maintenant } from '@/server/temps';

export const metadata: Metadata = { title: 'Invitation', robots: { index: false } };
export const dynamic = 'force-dynamic';

function Cadre({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <main className="mx-auto grid w-full max-w-[560px] gap-5 px-4 py-10">
      <h1 className="m-0 text-[clamp(26px,3vw,34px)] leading-[1.1]">{titre}</h1>
      {children}
    </main>
  );
}

/** Maquette Invitation (INV-01 à 03) : lien reçu par email. */
export default async function PageInvitation({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const jeton = (await searchParams).t ?? '';
  const a = /^[A-Za-z0-9_-]{43}$/.test(jeton)
    ? await apercuInvitation(getFirestore(appAdmin()), jeton, maintenant())
    : ({ etat: 'introuvable' } as const);

  if (a.etat !== 'valide')
    return (
      <Cadre titre="Ce lien d'invitation n'est plus valable">
        <p className="m-0 text-base text-neutre-800">
          Une invitation est valable 7 jours et ne sert qu&apos;une fois. Elle a peut-être été
          annulée.
        </p>
        {a.etat === 'expiree' ? (
          <Link href={routes.proRejoindre(a.artisanId)} className={bouton()}>
            Demander une nouvelle invitation
          </Link>
        ) : (
          <Link href={routes.pro} className={bouton({ variant: 'secondaire' })}>
            Découvrir Portail Habitat Pro
          </Link>
        )}
      </Cadre>
    );

  const s = await lireSessionPro();
  const autreAdresse = s && s.email.toLowerCase() !== a.email;
  const role = a.role as RoleMembre;
  return (
    <Cadre titre={`Rejoindre ${a.nomCommercial}`}>
      <ConfigFirebase />
      <section className="grid gap-2 rounded-2xl border border-trait p-5">
        <p className="m-0 text-base">
          <strong>{a.invitant}</strong> vous invite à rejoindre <strong>{a.nomCommercial}</strong>
          {a.ville ? ` (${a.ville})` : ''} sur Portail Habitat Pro.
        </p>
        <p className="m-0 text-base">
          Rôle : <strong>{LIBELLES_ROLE[role]}</strong> — {POUVOIRS_ROLE[role]}.
        </p>
      </section>
      {autreAdresse ? (
        <Banner tone="attention" titre="Cette invitation est destinée à une autre adresse">
          Elle est destinée à {a.emailMasque}. Vous êtes connecté avec une autre adresse :
          déconnectez-vous puis ouvrez de nouveau le lien.
        </Banner>
      ) : (
        <AccepterInvitation jeton={jeton} connecte={Boolean(s)} />
      )}
    </Cadre>
  );
}
