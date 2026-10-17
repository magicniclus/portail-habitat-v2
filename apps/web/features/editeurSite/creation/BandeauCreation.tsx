'use client';

import { Banner, Button } from '@ph/ui';
import { FenetreOffre } from '@/features/offres/FenetreOffre';

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
      <Banner tone="info" className="m-3">
        <span className="grid gap-2">
          <span>
            Aperçu de votre page d’accueil créée par l’IA. Il n’est pas publiable et votre site n’a
            pas changé. Activez Site Pro pour obtenir toutes les pages et publier : vos réponses
            sont gardées, rien ne vous sera redemandé.
          </span>
          <span className="flex flex-wrap gap-2">
            <FenetreOffre
              formule="site_pro"
              raison="La création complète du site par l’IA est incluse dans Site Pro."
            >
              Activer Site Pro
            </FenetreOffre>
            <Button variant="fantome" onClick={onFermerApercu}>
              Fermer l’aperçu
            </Button>
          </span>
        </span>
      </Banner>
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
