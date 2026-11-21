import type { DomaineEdition } from '@ph/firebase/sites';
import { Banner, Stepper } from '@ph/ui';

const ETAPES = ['Commande', 'Configuration', 'Certificat HTTPS', 'En ligne'];

/** Étape affichée d'un domaine acheté : commande, zone DNS écrite, HTTPS, en ligne. */
function etapeCourante(d: DomaineEdition): number {
  if (d.statut === 'actif') return 3;
  if (d.statut === 'commande') return 0;
  return d.enregistrements.every((e) => e.etat === 'ok') ? 2 : 1;
}

/**
 * Suivi d'un domaine acheté (DOMAINES §3) : tout est automatique, l'artisan n'a rien à saisir.
 * Échec de commande ou de vérification : message et contact du support.
 */
export function SuiviAchat({ domaine: d }: { domaine: DomaineEdition }) {
  if (d.statut === 'echec')
    return (
      <Banner tone="danger">
        La mise en ligne de {d.nom} n’a pas abouti. Écrivez au support depuis Mon compte › Aide :
        nous relançons la commande avec vous.
      </Banner>
    );
  if (d.statut === 'resilie')
    return (
      <p className="m-0 text-[15px] text-neutre-800">
        Site Pro est arrêté : {d.nom} reste à votre nom jusqu’à son échéance. Le code de transfert
        vous a été envoyé par email pour le déplacer chez le registraire de votre choix.
      </p>
    );
  const courante = etapeCourante(d);
  return (
    <div className="grid gap-3">
      <Stepper etapes={ETAPES} courante={courante} />
      {courante < 3 ? (
        <p className="m-0 text-[15px] text-neutre-800">
          Tout se fait automatiquement, comptez 15 minutes environ (parfois quelques heures pour un
          .fr). Vous recevrez un email dès que le site est en ligne.
        </p>
      ) : null}
    </div>
  );
}
