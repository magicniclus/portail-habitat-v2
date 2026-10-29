'use client';

import type { RestantsIa } from '../modesIa';
import { EncartPremium } from '@/features/offres/EncartPremium';

/**
 * Haut du panneau IA (maquette Editeur de Site) : demandes restantes du mois avec Site Pro, ou
 * l'offre Site Pro et les essais gratuits restants.
 */
export function QuotaIa({ r }: { r: RestantsIa }) {
  if (r.type === 'essai')
    return (
      <EncartPremium
        compact
        formule="site_pro"
        titre="L’IA complète est incluse dans Site Pro"
        cta="Passer à Site Pro"
        raison="L’IA complète du site est incluse dans Site Pro."
      >
        Créer tout le site, ajouter ou refaire des sections, améliorer vos textes.{' '}
        {r.textes > 0
          ? `Essai gratuit : ${r.textes} réécriture${r.textes > 1 ? 's' : ''} de texte restante${r.textes > 1 ? 's' : ''}.`
          : 'Essai gratuit utilisé.'}
      </EncartPremium>
    );
  const total = r.max.textes + r.max.composants;
  const reste = r.textes + r.composants;
  return (
    <div className="grid gap-1.5 rounded-[10px] border border-trait p-3 [grid-template-columns:minmax(0,1fr)]">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <strong>IA Site Pro</strong>
        <span className="text-[13px] text-neutre-700">
          {reste} / {total} restantes
        </span>
      </div>
      <div
        role="meter"
        aria-label="Demandes à l’IA restantes ce mois-ci"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={reste}
        className="h-1.5 overflow-hidden rounded-full bg-neutre-200"
      >
        <span
          className="block h-full bg-accent"
          style={{ width: `${total ? Math.round((reste / total) * 100) : 0}%` }}
        />
      </div>
      <span className="text-xs text-neutre-600">
        Ce mois-ci : {r.textes} retouches de texte, {r.composants} sections ou pages · remis à zéro
        le 1er
      </span>
    </div>
  );
}
