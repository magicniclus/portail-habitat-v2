import {
  masquerEmail,
  peut,
  siegesDisponibles,
  type Membre,
  type RoleMembre,
} from '@ph/core/equipe';
import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import { chemins, collections } from '../../chemins';

export interface MembreEquipe {
  uid: string;
  nom: string;
  /** Adresse visible par qui gère l'équipe ; masquée pour les autres. */
  email: string;
  role: RoleMembre;
  statut: 'actif' | 'suspendu';
  derniereActivite?: number;
}

export interface Equipe {
  membres: MembreEquipe[];
  invitations: { id: string; email: string; role: RoleMembre; expireLe: number }[];
  demandesAcces: { id: string; nom: string; message?: string; le: number }[];
  sieges: { max: number; utilises: number; disponibles: number };
}

/**
 * Page Équipe (maquette Equipe, COMPTES §4) : membres, invitations en cours (elles occupent un
 * siège), demandes d'accès ouvertes. `lecteur` : le membre qui consulte (adresses complètes s'il gère).
 */
export async function lireEquipe(
  db: Firestore,
  artisanId: string,
  lecteur: Membre,
  maintenant: number,
): Promise<Equipe> {
  const gere = peut(lecteur, 'membres.gerer');
  const [artisan, membres, invitations, demandes] = await Promise.all([
    db.doc(chemins.artisan(artisanId)).get(),
    db.collection(chemins.membres(artisanId)).get(),
    db
      .collection(collections.invitations)
      .where('artisanId', '==', artisanId)
      .where('statut', '==', 'envoyee')
      .where('expireLe', '>', Timestamp.fromMillis(maintenant))
      .get(),
    gere
      ? db
          .collection(collections.demandesAcces)
          .where('artisanId', '==', artisanId)
          .where('statut', '==', 'ouverte')
          .get()
      : null,
  ]);
  const users = membres.docs.length
    ? await db.getAll(...membres.docs.map((m) => db.doc(chemins.user(m.id))))
    : [];
  const demandeurs = demandes?.docs.length
    ? await db.getAll(...demandes.docs.map((d) => db.doc(chemins.user(d.get('demandeurUid')))))
    : [];
  const ms = (t: unknown) => (t as Timestamp | undefined)?.toMillis();
  const siegesMax = (artisan.get('siegesMax') as number | undefined) ?? 1;
  const nbMembres = membres.size;
  return {
    membres: membres.docs
      .map((m, i) => {
        const email = (users[i]?.get('email') as string | undefined) ?? '';
        const derniere = ms(m.get('derniereActivite'));
        return {
          uid: m.id,
          nom: (users[i]?.get('nomAffiche') as string | undefined) ?? masquerEmail(email),
          email: gere ? email : masquerEmail(email),
          role: m.get('role') as RoleMembre,
          statut: m.get('statut') as MembreEquipe['statut'],
          ...(derniere ? { derniereActivite: derniere } : {}),
        };
      })
      .sort((a, b) => a.nom.localeCompare(b.nom, 'fr')),
    invitations: gere
      ? invitations.docs.map((d) => ({
          id: d.id,
          email: d.get('email') as string,
          role: d.get('role') as RoleMembre,
          expireLe: ms(d.get('expireLe'))!,
        }))
      : [],
    demandesAcces: (demandes?.docs ?? []).map((d, i) => ({
      id: d.id,
      nom: (demandeurs[i]?.get('nomAffiche') as string | undefined) ?? 'Un professionnel',
      ...(d.get('message') ? { message: d.get('message') as string } : {}),
      le: ms(d.get('createdAt')) ?? 0,
    })),
    sieges: {
      max: siegesMax,
      utilises: nbMembres + invitations.size,
      disponibles: siegesDisponibles({
        siegesMax,
        nbMembres,
        invitationsEnCours: invitations.size,
      }),
    },
  };
}
