import { menuPro, ongletsCompte } from '@ph/core/espace-pro';
import { initiales } from '@ph/core/format';
import type { ReactNode } from 'react';
import { BandeauImpersonation } from '@/features/admin/BandeauImpersonation';
import { BandeauAnnonces } from '@/features/annonces/BandeauAnnonces';
import { CadrePro } from '@/features/espacePro/CadrePro';
import { EtatFiche } from '@/features/espacePro/EtatFiche';
import { lireSessionPro } from '@/server/sessionPro';

/**
 * Cadre des pages connectées de l'espace pro. Sans session, la page elle-même renvoie vers la
 * connexion (elle seule connaît son adresse, reprise en `suite`).
 */
export default async function LayoutEspacePro({ children }: { children: ReactNode }) {
  const s = await lireSessionPro();
  if (!s) return children;
  const active = s.espace.active;
  const membre = active?.membre ?? null;
  return (
    <CadrePro
      menu={menuPro(membre)}
      ongletsCompte={ongletsCompte(membre)}
      entreprises={s.espace.entreprises}
      activeId={active?.artisanId ?? null}
      etatFiche={active ? <EtatFiche artisan={active.artisan} /> : null}
      initiales={initiales(s.nomAffiche) || '?'}
    >
      {s.impersonation ? <BandeauImpersonation /> : null}
      <BandeauAnnonces public_="pros" />
      {children}
    </CadrePro>
  );
}
