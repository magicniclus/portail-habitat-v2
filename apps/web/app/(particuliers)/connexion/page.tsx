import type { Metadata } from 'next';
import { DemandeLien } from '@/features/connexion/DemandeLien';
import { PageParcours } from '@/features/parcours/PageParcours';

export const metadata: Metadata = {
  title: 'Connexion à mon espace',
  robots: { index: false },
};

/** Connexion des particuliers (lien magique). L'espace pro a son propre écran (lot 10). */
export default function PageConnexion() {
  return (
    <PageParcours titre="Mon espace">
      <div className="mx-auto max-w-[520px] rounded-[18px] bg-blanc p-[clamp(22px,4vw,36px)] shadow-md">
        <DemandeLien />
      </div>
    </PageParcours>
  );
}
