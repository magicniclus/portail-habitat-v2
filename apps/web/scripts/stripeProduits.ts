/**
 * `pnpm stripe:produits` : crée (ou vérifie) les produits et prix Stripe du catalogue.
 * Mode test uniquement, sauf `--live` explicite après le « go » de mise en production.
 */
import { synchroniserCatalogueStripe, type ClientCatalogueStripe } from '@ph/firebase/facturation';
import Stripe from 'stripe';

const cle = process.env.STRIPE_SECRET_KEY;
if (!cle) {
  console.error('STRIPE_SECRET_KEY manquante (clé de test sk_test_…).');
  process.exit(1);
}
if (cle.startsWith('sk_live') && !process.argv.includes('--live')) {
  console.error(
    'Clé live refusée : ajoutez --live seulement après le « go » de mise en production.',
  );
  process.exit(1);
}
const lignes = await synchroniserCatalogueStripe(
  new Stripe(cle) as unknown as ClientCatalogueStripe,
);
for (const l of lignes)
  console.log(`${l.etat === 'cree' ? 'créé  ' : 'à jour'}  ${l.cle}  ${l.prixId}`);
