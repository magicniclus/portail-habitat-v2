'use client';

import { Banner, Button } from '@ph/ui';
import { EncartPremium } from '@/features/offres/EncartPremium';

/**
 * Point de bascule (IA_SITE §4) : aperçu gratuit de l'accueil affiché (non publiable), ou
 * création à reprendre après paiement de Site Pro (SITE-IA-02).
 */
export function BandeauCreation({
  apercu,
  aReprendre,
  onFermerApercu,
  onReprendre,
}: {
  apercu: boolean;
  aReprendre: boolean;
  onFermerApercu: () => void;
  onReprendre: () => void;
}) {
  if (apercu)
    return (
      <EncartPremium
        formule="site_pro"
        titre="Votre page d’accueil est prête : créez tout le site"
        cta="Activer Site Pro"
        raison="La création complète du site par l’IA est incluse dans Site Pro."
        onPlusTard={onFermerApercu}
        libellePlusTard="Fermer l’aperçu"
        className="m-3"
      >
        Aperçu de votre page d’accueil créée par l’IA : il n’est pas publiable et votre site n’a pas
        changé. Avec Site Pro, l’IA crée toutes les pages et vous publiez : vos réponses sont
        gardées, rien ne vous sera redemandé.
      </EncartPremium>
    );
  if (aReprendre)
    return (
      <Banner tone="info" className="m-3">
        <span className="grid gap-2">
          <span>Site Pro est actif : l’IA peut terminer la création de votre site.</span>
          <span>
            <Button onClick={onReprendre}>Reprendre la création</Button>
          </span>
        </span>
      </Banner>
    );
  return null;
}
