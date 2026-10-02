/**
 * Sous-ensemble des objets et de l'API Stripe utilisés (sans dépendre du SDK) : le webhook et le
 * Checkout reçoivent un client injecté (vrai SDK en production, faux client dans les tests).
 */

export interface PrixStripe {
  id: string;
  lookup_key: string | null;
}

interface ElementAbonnementStripe {
  price: PrixStripe;
  quantity?: number;
  current_period_start?: number;
  current_period_end?: number;
}

export interface AbonnementStripe {
  id: string;
  customer: string;
  status: string;
  metadata: Record<string, string>;
  cancel_at_period_end: boolean;
  canceled_at: number | null;
  current_period_start?: number;
  current_period_end?: number;
  items: { data: ElementAbonnementStripe[] };
  discount?: { promotion_code?: string | null } | null;
}

export interface FactureStripe {
  id?: string;
  number: string | null;
  customer: string;
  status: string | null;
  subscription?: string | null;
  parent?: {
    subscription_details?: { subscription?: string; metadata?: Record<string, string> } | null;
  } | null;
  subtotal: number;
  total: number;
  total_excluding_tax?: number | null;
  currency: string;
  invoice_pdf?: string | null;
  hosted_invoice_url?: string | null;
  period_start: number;
  period_end: number;
  lines?: { data: { period?: { start: number; end: number } }[] };
  status_transitions?: { paid_at?: number | null };
  payment_intent?: string | null;
}

export interface SessionCheckoutStripe {
  id: string;
  mode: 'subscription' | 'payment' | 'setup';
  customer: string | null;
  subscription: string | null;
  client_reference_id: string | null;
  metadata: Record<string, string>;
  payment_status?: string;
  payment_intent?: string | null;
}

export interface EvenementStripe {
  id: string;
  type: string;
  created: number;
  data: { object: unknown; previous_attributes?: Record<string, unknown> };
}

/** API appelée par le Checkout et le portail client. */
export interface ClientStripe {
  customers: {
    create(p: {
      email?: string;
      name?: string;
      metadata: Record<string, string>;
    }): Promise<{ id: string }>;
  };
  prices: {
    list(p: { lookup_keys: string[]; active: boolean }): Promise<{ data: PrixStripe[] }>;
  };
  checkout: {
    sessions: {
      create(p: Record<string, unknown>): Promise<{ id: string; url: string | null }>;
    };
  };
  billingPortal: {
    sessions: { create(p: { customer: string; return_url: string }): Promise<{ url: string }> };
  };
}
