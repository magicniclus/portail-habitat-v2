import { Banner, Button, Card, CardBody, CardHeader, CardTitle, Checkbox } from '@ph/ui';
import { appAdmin } from '@ph/firebase/admin';
import { chemins } from '@ph/firebase/chemins';
import { getFirestore } from 'firebase-admin/firestore';
import type { Metadata } from 'next';
import { enregistrerPreferences } from '@/features/preferences/actions';
import { lireJeton } from '@/server/notifications';

export const metadata: Metadata = { title: 'Mes préférences d’emails', robots: { index: false } };
export const dynamic = 'force-dynamic';

type Notifs = Record<string, Record<string, boolean> | undefined>;

const LIBELLES_DESABONNEMENT: Record<string, string> = {
  activite: 'les notifications d’activité',
  relance: 'les relances',
  offres_pro: 'les offres professionnelles',
  marketing: 'les actualités',
};

/**
 * Préférences d'emails accessibles sans connexion depuis le lien de l'email (EMAILS §2).
 * Les emails de sécurité et transactionnels ne se désactivent pas.
 */
export default async function Preferences({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const p = await searchParams;
  const jeton = lireJeton(p.t);
  const uid = jeton?.sujet.startsWith('u:') ? jeton.sujet.slice(2) : null;
  const notifs = uid
    ? (((await getFirestore(appAdmin()).doc(chemins.user(uid)).get()).get('preferences.notifs') as
        Notifs | undefined) ?? {})
    : null;
  const val = (cat: string, canal: string, defaut: boolean) => notifs?.[cat]?.[canal] ?? defaut;

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-5 px-4 py-10">
      <h1 className="text-[28px] leading-tight font-bold">Mes préférences d’emails</h1>
      {p.desabonne !== undefined && jeton ? (
        <Banner tone="succes" titre="Désabonnement enregistré">
          Vous ne recevrez plus {LIBELLES_DESABONNEMENT[p.desabonne] ?? 'ces emails'}.
        </Banner>
      ) : null}
      {p.ok ? <Banner tone="succes" titre="Préférences enregistrées" /> : null}
      {!jeton ? (
        <Banner tone="attention" titre="Ce lien a expiré">
          Ouvrez le lien d’un email plus récent, ou connectez-vous pour gérer vos préférences.
        </Banner>
      ) : !notifs ? (
        <Banner tone="info" titre="Adresse désinscrite">
          Cette adresse ne recevra plus nos offres. Aucun compte n’y est associé.
        </Banner>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Emails que vous recevez</CardTitle>
          </CardHeader>
          <CardBody>
            <form action={enregistrerPreferences} className="flex flex-col gap-1">
              <input type="hidden" name="jeton" value={p.t} />
              <Checkbox name="activiteEmail" defaultChecked={val('activite', 'email', true)}>
                Activité : nouveaux messages, réponses, rapports
              </Checkbox>
              <Checkbox name="activiteInapp" defaultChecked={val('activite', 'inapp', true)}>
                Activité dans l’application (cloche)
              </Checkbox>
              <Checkbox name="relanceEmail" defaultChecked={val('relance', 'email', true)}>
                Relances : démarche non terminée, avis à donner
              </Checkbox>
              <Checkbox name="offresProEmail" defaultChecked={val('offres_pro', 'email', true)}>
                Offres professionnelles (artisans)
              </Checkbox>
              <Checkbox name="marketingEmail" defaultChecked={val('marketing', 'email', false)}>
                Actualités de Portail Habitat
              </Checkbox>
              <p className="py-2 text-[14.5px] text-neutre-800">
                Les emails de sécurité (connexion, mot de passe) et ceux qui suivent une de vos
                actions (demande confirmée, facture) sont toujours envoyés.
              </p>
              <Button type="submit" taille="lg">
                Enregistrer
              </Button>
            </form>
          </CardBody>
        </Card>
      )}
    </main>
  );
}
