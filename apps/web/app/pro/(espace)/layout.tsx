import { menuPro } from '@ph/core/espace-pro';
import { peut } from '@ph/core/equipe';
import { initiales } from '@ph/core/format';
import type { ReactNode } from 'react';
import { CadrePro } from '@/features/espacePro/CadrePro';
import { EncartPremium } from '@/features/espacePro/EncartPremium';
import { EtatFiche } from '@/features/espacePro/EtatFiche';
import { lireSessionPro } from '@/server/sessionPro';
import { lirePrixAffiches } from '@/server/vitrine';

/**
 * Cadre des pages connectées de l'espace pro. Sans session, la page elle-même renvoie vers la
 * connexion (elle seule connaît son adresse, reprise en `suite`).
 */
export default async function LayoutEspacePro({ children }: { children: ReactNode }) {
  const s = await lireSessionPro();
  if (!s) return children;
  const active = s.espace.active;
  const membre = active?.membre ?? null;
  const offrePremium =
    active && active.artisan.plan !== 'premium' && peut(membre, 'abonnement.gerer');
  return (
    <CadrePro
      menu={menuPro(membre)}
      entreprises={s.espace.entreprises}
      activeId={active?.artisanId ?? null}
      etatFiche={active ? <EtatFiche artisan={active.artisan} /> : null}
      initiales={initiales(s.nomAffiche) || '?'}
      encart={offrePremium ? <EncartPremium prix={await lirePrixAffiches()} /> : null}
    >
      {children}
    </CadrePro>
  );
}
