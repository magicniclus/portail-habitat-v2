import { decisionInactivite } from '@ph/core/support';
import type { Auth } from 'firebase-admin/auth';
import { Timestamp } from 'firebase-admin/firestore';
import { chemins } from '../../chemins';
import type { ServicesComptes } from '../comptes/services';
import { supprimerCompteParticulier } from './actions';

const J = 86_400_000;
/** Suppressions au plus par passage : un incident ne vide jamais la base d'un coup. */
const MAX_SUPPRESSIONS = 100;

/** Dernière activité connue de chaque compte (Firebase Auth : connexion, rafraîchissement, création). */
export async function* activitesAuth(
  auth: Auth,
): AsyncGenerator<{ uid: string; derniere: number }> {
  let page: string | undefined;
  do {
    const r = await auth.listUsers(1000, page);
    for (const u of r.users)
      yield {
        uid: u.uid,
        derniere: Math.max(
          ...[u.metadata.lastSignInTime, u.metadata.lastRefreshTime, u.metadata.creationTime]
            .filter((t): t is string => Boolean(t))
            .map((t) => Date.parse(t)),
        ),
      };
    page = r.pageToken;
  } while (page);
}

/**
 * Comptes particuliers inactifs (DATABASE §14) : `compte-inactif` 30 jours avant les 3 ans, puis
 * suppression (demandes en cours annulées, profil anonymisé). Jamais un artisan ni l'équipe.
 */
export async function purgerComptesInactifs(
  s: ServicesComptes,
  comptes: AsyncIterable<{ uid: string; derniere: number }>,
): Promise<{ avertis: number; supprimes: number }> {
  const maintenant = s.horloge();
  let avertis = 0;
  let supprimes = 0;
  for await (const c of comptes) {
    // Filtre sans lecture : trop récent pour être averti.
    if (maintenant - c.derniere < 1065 * J) continue;
    const [user, admin] = await Promise.all([
      s.db.doc(chemins.user(c.uid)).get(),
      s.db.doc(chemins.admin(c.uid)).get(),
    ]);
    const roles = (user.get('roles') as string[] | undefined) ?? [];
    if (
      !user.exists ||
      admin.exists ||
      roles.includes('artisan') ||
      user.get('statut') === 'supprime'
    )
      continue;
    const averti = (user.get('avertiInactifLe') as Timestamp | undefined)?.toMillis();
    const d = decisionInactivite(c.derniere, maintenant, averti);
    if (d === 'avertir') {
      await user.ref.update({ avertiInactifLe: Timestamp.fromMillis(maintenant) });
      await s.notifier({
        modele: 'compte-inactif',
        destinataire: { uid: c.uid },
        refObjet: `${chemins.user(c.uid)}/inactif/${new Date(maintenant).toISOString().slice(0, 10)}`,
        donnees: {
          message:
            'Vous ne vous êtes pas connecté depuis bientôt 3 ans : sans nouvelle connexion d’ici 30 jours, votre compte et vos demandes seront supprimés.',
          lien: '/connexion',
        },
      });
      avertis++;
    } else if (d === 'supprimer' && supprimes < MAX_SUPPRESSIONS) {
      await supprimerCompteParticulier(s, c.uid);
      supprimes++;
    }
  }
  return { avertis, supprimes };
}
