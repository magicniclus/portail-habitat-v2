import { CATALOGUE_STRIPE, cleStripe } from '@ph/core/facturation';

/**
 * Création idempotente des produits et prix Stripe (lot 11) : produits à identifiant fixe
 * (`ph_premium`…), prix retrouvés par clé de recherche (`ph_premium_annuel`…). Un prix au bon
 * montant n'est jamais recréé ; un montant changé crée un nouveau prix qui reprend la clé.
 */

interface PrixListe {
  id: string;
  unit_amount: number | null;
  recurring: { interval: string } | null;
}

export interface ClientCatalogueStripe {
  products: {
    retrieve(id: string): Promise<{ id: string }>;
    create(p: {
      id: string;
      name: string;
      metadata: Record<string, string>;
    }): Promise<{ id: string }>;
  };
  prices: {
    list(p: { lookup_keys: string[]; active: boolean }): Promise<{ data: PrixListe[] }>;
    create(p: Record<string, unknown>): Promise<{ id: string }>;
  };
}

export type LigneCatalogue = { cle: string; etat: 'a_jour' | 'cree'; prixId: string };

export async function synchroniserCatalogueStripe(
  stripe: ClientCatalogueStripe,
): Promise<LigneCatalogue[]> {
  const lignes: LigneCatalogue[] = [];
  const produits = new Set<string>();
  for (const p of CATALOGUE_STRIPE) {
    const cle = cleStripe(p.cle);
    const [existant] = (await stripe.prices.list({ lookup_keys: [cle], active: true })).data;
    if (
      existant &&
      existant.unit_amount === p.montantHt &&
      (existant.recurring?.interval ?? null) === p.intervalle
    ) {
      lignes.push({ cle, etat: 'a_jour', prixId: existant.id });
      continue;
    }
    const produitId = `ph_${p.produit}`;
    if (!produits.has(produitId)) {
      await stripe.products.retrieve(produitId).catch(() =>
        stripe.products.create({
          id: produitId,
          name: p.nomProduit,
          metadata: { produit: p.produit },
        }),
      );
      produits.add(produitId);
    }
    const { id } = await stripe.prices.create({
      product: produitId,
      currency: 'eur',
      unit_amount: p.montantHt,
      tax_behavior: 'exclusive',
      lookup_key: cle,
      transfer_lookup_key: true,
      nickname: p.cle,
      ...(p.intervalle ? { recurring: { interval: p.intervalle } } : {}),
    });
    lignes.push({ cle, etat: 'cree', prixId: id });
  }
  return lignes;
}
