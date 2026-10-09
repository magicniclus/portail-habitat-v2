import { CATALOGUE_STRIPE } from '@ph/core/facturation';
import { describe, expect, it } from 'vitest';
import {
  synchroniserCatalogueStripe,
  type ClientCatalogueStripe,
} from '../src/serveur/facturation';

/** Faux Stripe en mémoire : produits par identifiant, prix par clé de recherche. */
function fauxStripe() {
  const produits = new Set<string>();
  const prix = new Map<
    string,
    { id: string; unit_amount: number; recurring: { interval: string } | null }
  >();
  let n = 0;
  const client: ClientCatalogueStripe = {
    products: {
      retrieve: async (id) => {
        if (!produits.has(id)) throw new Error('No such product');
        return { id };
      },
      create: async (p) => (produits.add(p.id), { id: p.id }),
    },
    prices: {
      list: async (p) => ({
        data: p.lookup_keys.flatMap((k) => (prix.has(k) ? [prix.get(k)!] : [])),
      }),
      create: async (p) => {
        const id = `price_${++n}`;
        const recurrent = p.recurring as { interval: string } | undefined;
        prix.set(p.lookup_key as string, {
          id,
          unit_amount: p.unit_amount as number,
          recurring: recurrent ?? null,
        });
        return { id };
      },
    },
  };
  return { client, produits, prix };
}

describe('synchroniserCatalogueStripe', () => {
  it('crée tout au premier passage, rien au second (idempotent)', async () => {
    const f = fauxStripe();
    const premier = await synchroniserCatalogueStripe(f.client);
    expect(premier.every((l) => l.etat === 'cree')).toBe(true);
    expect(premier).toHaveLength(CATALOGUE_STRIPE.length);
    expect([...f.produits].sort()).toEqual(['ph_pack', 'ph_premium', 'ph_siege', 'ph_visibilite']);
    const second = await synchroniserCatalogueStripe(f.client);
    expect(second.every((l) => l.etat === 'a_jour')).toBe(true);
  });

  it('montant changé : nouveau prix repris sous la même clé', async () => {
    const f = fauxStripe();
    await synchroniserCatalogueStripe(f.client);
    f.prix.set('ph_siege', { ...f.prix.get('ph_siege')!, unit_amount: 800 });
    const r = await synchroniserCatalogueStripe(f.client);
    expect(r.filter((l) => l.etat === 'cree').map((l) => l.cle)).toEqual(['ph_siege']);
    expect(f.prix.get('ph_siege')!.unit_amount).toBe(900);
  });
});
