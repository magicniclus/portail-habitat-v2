import { createHash } from 'node:crypto';
import { PERMISSIONS_ADMIN } from '@ph/core/admin';
import type { ContexteBase, Dependances, RegleDebit } from '@ph/core/enveloppe';
import { ACTIONS_EQUIPE, peut, type ActionEquipe, type Membre } from '@ph/core/equipe';
import type { Resultat } from '@ph/core/resultat';
import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import { chemins, collections } from '../chemins';

const DUREES: Record<RegleDebit['fenetre'], number> = {
  '1m': 60_000,
  '1h': 3_600_000,
  '1j': 86_400_000,
};
const DUREE_IDEMPOTENCE = 86_400_000;
const empreinte = (texte: string) => createHash('sha256').update(texte).digest('hex');

const estActionEquipe = (p: string): p is ActionEquipe =>
  (ACTIONS_EQUIPE as readonly string[]).includes(p);
const estPermissionAdmin = (p: string) => (PERMISSIONS_ADMIN as readonly string[]).includes(p);

/**
 * Services Firestore de l'enveloppe `action()` / `callable()` :
 * permission (équipe via `membres`, équipe interne via `admins`), limite de débit, audit, idempotence.
 */
export function dependancesEnveloppe(
  db: () => Firestore,
  horloge: () => number = Date.now,
): Dependances {
  return {
    async verifierPermission(
      ctx: ContexteBase,
      permission: string,
      entree: unknown,
    ): Promise<boolean> {
      if (!ctx.uid) return false;
      if (estActionEquipe(permission)) {
        const artisanId = (entree as { artisanId?: unknown })?.artisanId;
        if (typeof artisanId !== 'string' || !artisanId) return false;
        const doc = await db().doc(chemins.membre(artisanId, ctx.uid)).get();
        return peut(doc.exists ? (doc.data() as Membre) : null, permission, { uid: ctx.uid });
      }
      if (estPermissionAdmin(permission)) {
        const doc = await db().doc(chemins.admin(ctx.uid)).get();
        const admin = doc.data() as
          { actif?: boolean; permissionsEffectives?: string[] } | undefined;
        return admin?.actif === true && (admin.permissionsEffectives ?? []).includes(permission);
      }
      return false;
    },

    async limiterDebit(regle: RegleDebit, identifiantClient: string): Promise<boolean> {
      const ref = db()
        .collection(collections.rateLimits)
        .doc(empreinte(`${regle.cle}:${identifiantClient}`));
      const duree = DUREES[regle.fenetre];
      return db().runTransaction(async (tx) => {
        const maintenant = horloge();
        const actuel = (await tx.get(ref)).data() as
          { compteur: number; fenetreDebut: Timestamp } | undefined;
        const nouvelleFenetre = !actuel || actuel.fenetreDebut.toMillis() + duree <= maintenant;
        if (!nouvelleFenetre && actuel.compteur >= regle.max) return false;
        const debut = nouvelleFenetre ? maintenant : actuel.fenetreDebut.toMillis();
        tx.set(ref, {
          schemaVersion: 1,
          compteur: nouvelleFenetre ? 1 : actuel.compteur + 1,
          fenetreDebut: Timestamp.fromMillis(debut),
          expireLe: Timestamp.fromMillis(debut + duree + 3_600_000),
        });
        return true;
      });
    },

    async auditer(ctx, evenement): Promise<void> {
      await db()
        .collection(collections.auditLog)
        .add({
          schemaVersion: 1,
          acteurUid: ctx.uid ?? ctx.identifiantClient,
          action: evenement.action,
          ok: evenement.ok,
          ...(evenement.code ? { code: evenement.code } : {}),
          createdAt: Timestamp.fromMillis(horloge()),
        });
    },

    idempotence: {
      async lire(cle: string): Promise<Resultat<unknown> | undefined> {
        const doc = (
          await db().collection(collections.idempotence).doc(empreinte(cle)).get()
        ).data();
        if (!doc || (doc.expireLe as Timestamp).toMillis() <= horloge()) return undefined;
        return JSON.parse(doc.resultat as string) as Resultat<unknown>;
      },
      async ecrire(cle: string, resultat: Resultat<unknown>): Promise<void> {
        await db()
          .collection(collections.idempotence)
          .doc(empreinte(cle))
          .set({
            schemaVersion: 1,
            // Sérialisé : le résultat peut contenir des valeurs que Firestore refuse (undefined…).
            resultat: JSON.stringify(resultat),
            createdAt: Timestamp.fromMillis(horloge()),
            expireLe: Timestamp.fromMillis(horloge() + DUREE_IDEMPOTENCE),
          });
      },
    },
  };
}
