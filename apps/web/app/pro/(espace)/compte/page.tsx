import { decrireAppareil } from '@ph/core/espace-pro';
import { lireComptePro, synchroniserComptePro } from '@ph/firebase/pro';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { Appareils } from '@/features/comptePro/Appareils';
import { DonneesCompte } from '@/features/comptePro/DonneesCompte';
import { NotificationsCompte } from '@/features/comptePro/NotificationsCompte';
import { ProfilCompte } from '@/features/comptePro/ProfilCompte';
import { SECTIONS_COMPTE, SectionCompte } from '@/features/comptePro/SectionCompte';
import { SecuriteCompte } from '@/features/comptePro/SecuriteCompte';
import { routes } from '@/lib/routes';
import { servicesCompte } from '@/server/compte';
import { configFirebaseClient } from '@/server/configFirebase';
import { flagActif } from '@/server/flags';
import { sessionPro } from '@/server/sessionPro';

export const metadata: Metadata = { title: 'Mon compte', robots: { index: false } };

/**
 * Maquette Mon Compte (COMPTES §9) : réglages de la personne, pas de l'entreprise. Firebase Auth
 * fait foi : `users/{uid}` est recopié à l'ouverture (email confirmé, second facteur…).
 */
export default async function PageCompte() {
  const s = await sessionPro(routes.proCompte);
  const services = servicesCompte();
  await synchroniserComptePro(services, s.uid).catch(() => undefined);
  const [compte, smsActif, pushActif, h] = await Promise.all([
    lireComptePro(services, s.uid, s.artisanId),
    flagActif('deuxFacteursSms'),
    flagActif('notificationsPush'),
    headers(),
  ]);
  const push = pushActif && Boolean(configFirebaseClient().vapid);
  return (
    <main className="grid max-w-[820px] gap-6 px-[clamp(16px,3vw,32px)] pt-[clamp(20px,3vw,32px)] pb-12">
      <div>
        <h1 className="m-0 mb-1.5 text-[clamp(26px,3vw,34px)] leading-[1.1]">Mon compte</h1>
        <p className="m-0 text-base text-neutre-800">
          Vos informations personnelles, la sécurité de votre connexion et vos notifications. Ces
          réglages vous concernent vous, pas l&apos;entreprise.
        </p>
      </div>
      <nav aria-label="Sections de Mon compte" className="flex flex-wrap gap-x-1">
        {SECTIONS_COMPTE.map(([id, libelle]) => (
          <a
            key={id}
            href={`#${id}`}
            className="inline-flex min-h-11 items-center px-2.5 font-semibold"
          >
            {libelle}
          </a>
        ))}
      </nav>
      <SectionCompte id="profil" titre="Profil">
        <ProfilCompte profil={compte.profil} smsActif={smsActif} />
      </SectionCompte>
      <SectionCompte id="securite" titre="Connexion et sécurité">
        <SecuriteCompte compte={compte} smsActif={smsActif} />
      </SectionCompte>
      <SectionCompte id="appareils" titre="Appareils connectés">
        <Appareils appareil={decrireAppareil(h.get('user-agent') ?? '')} />
      </SectionCompte>
      <SectionCompte id="notifications" titre="Notifications">
        <NotificationsCompte compte={compte} push={push} />
      </SectionCompte>
      <SectionCompte id="donnees" titre="Mes données">
        <DonneesCompte
          bloquee={compte.suppressionBloquee}
          entreprise={compte.entreprise?.nom ?? null}
        />
      </SectionCompte>
    </main>
  );
}
