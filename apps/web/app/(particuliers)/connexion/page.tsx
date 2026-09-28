import type { Metadata } from 'next';
import { DemandeLien } from '@/features/connexion/DemandeLien';
import { PageConnexionPro } from '@/features/connexion/PageConnexionPro';
import { PageParcours } from '@/features/parcours/PageParcours';
import { suiteSure } from '@/lib/suite';
import { flagActif } from '@/server/flags';

export const metadata: Metadata = {
  title: 'Connexion',
  robots: { index: false },
};

type Params = Promise<Record<string, string | string[] | undefined>>;

/**
 * Connexion unique (D40) : particuliers par lien magique ; `?espace=pro` → email et mot de passe,
 * second facteur (maquette Connexion).
 */
export default async function PageConnexion({ searchParams }: { searchParams: Params }) {
  const p = await searchParams;
  if (p.espace === 'pro')
    return (
      <PageConnexionPro
        suite={suiteSure(typeof p.suite === 'string' ? p.suite : null, '/pro/tableau-de-bord')}
        smsActif={await flagActif('deuxFacteursSms')}
      />
    );
  return (
    <PageParcours titre="Mon espace">
      <div className="mx-auto max-w-[520px] rounded-[18px] bg-blanc p-[clamp(22px,4vw,36px)] shadow-md">
        <DemandeLien />
      </div>
    </PageParcours>
  );
}
