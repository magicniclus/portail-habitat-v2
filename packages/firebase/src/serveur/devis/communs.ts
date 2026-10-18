import { ErreurMetier } from '@ph/core/erreurs';
import { peut, type ActionEquipe, type Membre } from '@ph/core/equipe';
import type { ParametresFacturation } from '@ph/core/devis';
import { Timestamp, type Firestore, type Transaction } from 'firebase-admin/firestore';
import { chemins } from '../../chemins';

export interface ServicesDevis {
  db: Firestore;
  horloge: () => number;
}

export interface ContexteDevis {
  artisanId: string;
  uid: string;
}

/**
 * Membre relu au moment de l'action (dans la transaction si `t` est fourni) : une révocation compte
 * tout de suite. Hors transaction pour celles qui prennent un numéro, afin que seul le compteur
 * y soit disputé.
 */
export async function exiger(
  s: ServicesDevis,
  t: Transaction | null,
  ctx: ContexteDevis,
  action: ActionEquipe,
): Promise<void> {
  const ref = s.db.doc(chemins.membre(ctx.artisanId, ctx.uid));
  const m = await (t ? t.get(ref) : ref.get());
  if (!peut(m.data() as Membre | undefined, action)) throw new ErreurMetier('PERMISSION_REFUSEE');
}

/** Paramètres de facturation ; valeurs vides tant que l'artisan ne les a pas saisis. */
export async function lireParametresTx(
  s: ServicesDevis,
  t: Transaction | null,
  artisanId: string,
): Promise<ParametresFacturation & Record<string, unknown>> {
  const ref = s.db.doc(chemins.parametresFacturation(artisanId));
  const d = await (t ? t.get(ref) : ref.get());
  return (
    (d.data() as (ParametresFacturation & Record<string, unknown>) | undefined) ?? {
      raisonSociale: '',
      adresseSiege: '',
      siret: '',
      franchiseTva: false,
      tvaSurDebits: false,
      delaiPaiementJours: 30,
      acompteDefautPct: 30,
      validiteDevisJours: 30,
      tauxPenalitesAnnuel: 12.15,
    }
  );
}

/** Année civile à Paris : le compteur repart à 1 chaque 1er janvier. */
const anneeParis = (ms: number) =>
  Number(
    new Intl.DateTimeFormat('fr-FR', { year: 'numeric', timeZone: 'Europe/Paris' }).format(ms),
  );

/**
 * Prochain numéro du compteur, dans la transaction qui crée le document : sans trou, jamais
 * réutilisé (DEV-06). La lecture du compteur doit précéder toute écriture de la transaction.
 */
export async function reserverNumero(
  s: ServicesDevis,
  t: Transaction,
  artisanId: string,
  type: 'devis' | 'factures',
): Promise<{ annee: number; n: number; ecrire: () => void }> {
  const ref = s.db.doc(chemins.compteurDocuments(artisanId, type));
  const c = await t.get(ref);
  const annee = anneeParis(s.horloge());
  const n = c.exists && c.get('annee') === annee ? (c.get('dernier') as number) + 1 : 1;
  return {
    annee,
    n,
    ecrire: () =>
      t.set(ref, {
        schemaVersion: 1,
        annee,
        dernier: n,
        updatedAt: Timestamp.fromMillis(s.horloge()),
      }),
  };
}

/** `AAAA-MM-JJ` → minuit à Paris (approché à 12 h UTC pour ne jamais changer de jour). */
export const jourEnDate = (j: string | undefined) =>
  j ? Timestamp.fromDate(new Date(`${j}T12:00:00Z`)) : undefined;

export const versDate = (v: unknown): Date | undefined =>
  v instanceof Timestamp ? v.toDate() : v instanceof Date ? v : undefined;

const contention = (e: unknown) => {
  const x = e as { code?: unknown; message?: unknown };
  return x.code === 10 || /ABORTED|maximum number of retries|lock timeout/i.test(String(x.message));
};

/**
 * Transaction qui prend un numéro : le compteur est un document unique, très disputé quand
 * plusieurs factures partent en même temps. Après les tentatives du SDK, on retente avec une
 * attente aléatoire croissante ; un échec n'écrit rien, donc jamais de trou dans la suite.
 */
export async function avecReprise<T>(f: () => Promise<T>, essais = 8): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      return await f();
    } catch (e) {
      if (i >= essais || !contention(e)) throw e;
      await new Promise((ok) => setTimeout(ok, Math.random() * 200 * 2 ** Math.min(i, 5)));
    }
  }
}
