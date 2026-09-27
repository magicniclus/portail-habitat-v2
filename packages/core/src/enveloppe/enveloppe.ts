import type { z } from 'zod';
import { estErreurMetier } from '../erreurs';
import { echec, succes, type Resultat } from '../resultat';

/** Ce que l'appelant (Server Action ou Function) sait de la requête. */
export interface ContexteBase {
  uid: string | null;
  /** uid, ou empreinte de l'IP pour un visiteur : jamais de donnée personnelle en clair. */
  identifiantClient: string;
  appCheckVerifie: boolean;
}

export interface RegleDebit {
  cle: string;
  max: number;
  fenetre: '1m' | '1h' | '1j';
}

export interface EvenementAudit {
  action: string;
  ok: boolean;
  code?: string;
}

/** Services branchés par chaque app (Firestore, Sentry…). Le cœur reste pur et testable. */
export interface Dependances<C extends ContexteBase = ContexteBase> {
  verifierPermission?: (ctx: C, permission: string, entree: unknown) => Promise<boolean>;
  /** `true` si la requête est autorisée. */
  limiterDebit?: (regle: RegleDebit, identifiantClient: string) => Promise<boolean>;
  auditer?: (ctx: C, evenement: EvenementAudit) => Promise<void>;
  idempotence?: {
    lire: (cle: string) => Promise<Resultat<unknown> | undefined>;
    ecrire: (cle: string, resultat: Resultat<unknown>) => Promise<void>;
  };
  signalerErreur?: (erreur: unknown) => void;
}

export interface OptionsEnveloppe<S extends z.ZodType> {
  schema: S;
  /** Nom stable de l'action (audit, idempotence, journaux). */
  nom?: string;
  /** `requise` par défaut. */
  authentification?: 'requise' | 'facultative';
  /** App Check exigé par défaut ; `false` seulement pour un webhook signé. */
  appCheck?: boolean;
  permission?: string;
  rateLimit?: RegleDebit;
  audit?: boolean;
  /** L'entrée doit alors contenir `cleIdempotence`. */
  idempotence?: boolean;
}

export type Traitement<S extends z.ZodType, C, R> = (entree: z.output<S>, ctx: C) => Promise<R>;
export type Executable<C, R> = (brut: unknown, ctx: C) => Promise<Resultat<R>>;

function champsErreur(erreur: z.ZodError): Record<string, string[]> {
  const champs: Record<string, string[]> = {};
  for (const probleme of erreur.issues) {
    const cle = probleme.path.length ? probleme.path.map(String).join('.') : '_';
    (champs[cle] ??= []).push(probleme.message);
  }
  return champs;
}

function verifierConfiguration(options: OptionsEnveloppe<z.ZodType>, deps: Dependances<never>): void {
  const manque = (dep: string) => {
    throw new Error(`Enveloppe mal configurée : l'option demandée exige la dépendance « ${dep} ».`);
  };
  if (options.permission && !deps.verifierPermission) manque('verifierPermission');
  if (options.rateLimit && !deps.limiterDebit) manque('limiterDebit');
  if (options.audit && !deps.auditer) manque('auditer');
  if (options.idempotence && !deps.idempotence) manque('idempotence');
  if ((options.audit || options.idempotence) && !options.nom) {
    throw new Error('Enveloppe mal configurée : audit et idempotence exigent un « nom ».');
  }
}

/**
 * Fabrique l'enveloppe commune à `action()` (site) et `callable()` (Functions) :
 * connexion → App Check → schéma Zod → permission → débit → idempotence → traitement → audit.
 */
export function creerEnveloppe<C extends ContexteBase>(deps: Dependances<C>) {
  return function envelopper<S extends z.ZodType, R>(
    options: OptionsEnveloppe<S>,
    traitement: Traitement<S, C, R>,
  ): Executable<C, R> {
    verifierConfiguration(options, deps as Dependances<never>);
    const { schema, nom = 'anonyme', authentification = 'requise', appCheck = true } = options;

    const executer = async (brut: unknown, ctx: C): Promise<Resultat<R>> => {
      if (authentification === 'requise' && !ctx.uid) return echec('NON_AUTHENTIFIE');
      if (appCheck && !ctx.appCheckVerifie) return echec('APP_CHECK_INVALIDE');

      const analyse = schema.safeParse(brut);
      if (!analyse.success) return echec('ENTREE_INVALIDE', { champs: champsErreur(analyse.error) });
      const entree = analyse.data;

      if (options.permission && !(await deps.verifierPermission!(ctx, options.permission, entree))) {
        return echec('PERMISSION_REFUSEE');
      }
      if (options.rateLimit && !(await deps.limiterDebit!(options.rateLimit, ctx.identifiantClient))) {
        return echec('TROP_DE_REQUETES');
      }

      let cleIdem: string | undefined;
      if (options.idempotence) {
        const cle = (entree as { cleIdempotence?: unknown }).cleIdempotence;
        if (typeof cle !== 'string' || !cle) {
          return echec('ENTREE_INVALIDE', { champs: { cleIdempotence: ['Clé d’idempotence requise.'] } });
        }
        cleIdem = `${nom}:${ctx.uid ?? ctx.identifiantClient}:${cle}`;
        const deja = await deps.idempotence!.lire(cleIdem);
        if (deja) return deja as Resultat<R>;
      }

      let resultat: Resultat<R>;
      try {
        resultat = succes(await traitement(entree, ctx));
      } catch (e) {
        if (estErreurMetier(e)) {
          resultat = echec(e.code, { message: e.message });
        } else {
          deps.signalerErreur?.(e);
          resultat = echec('INTERNE');
        }
      }

      if (cleIdem && resultat.ok) await deps.idempotence!.ecrire(cleIdem, resultat);
      if (options.audit) {
        await deps.auditer!(ctx, resultat.ok ? { action: nom, ok: true } : { action: nom, ok: false, code: resultat.code });
      }
      return resultat;
    };
    return executer;
  };
}
