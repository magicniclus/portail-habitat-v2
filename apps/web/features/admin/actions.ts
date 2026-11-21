'use server';

import { entreeAfficherDonnee, entreeVoirEnTantQue } from '@ph/core/schemas';
import { appAdmin } from '@ph/firebase/admin';
import { afficherDonneePersonnelle, jetonImpersonation } from '@ph/firebase/admin-serveur';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { actionAdmin } from '@/server/actionAdmin';
import { lireSessionAdmin } from '@/server/sessionAdmin';

const services = () => ({
  db: getFirestore(appAdmin()),
  auth: getAuth(appAdmin()),
  horloge: Date.now,
});

const afficher = actionAdmin(
  { schema: entreeAfficherDonnee, nom: 'adminAfficherDonnee', lectureSeule: true },
  async (e, ctx) => {
    const r = await lireSessionAdmin();
    return afficherDonneePersonnelle(services(), {
      acteurUid: ctx.uid!,
      pii: r.etat === 'ok' && r.session.pii,
      ...e,
    });
  },
);

/** « Afficher » une donnée personnelle masquée : la consultation est journalisée (ADM-02). */
export async function afficherDonnee(cible: string, champ: string) {
  return afficher({ cible, champ });
}

const voir = actionAdmin(
  { schema: entreeVoirEnTantQue, nom: 'adminImpersonerLecture' },
  async (e, ctx) => ({
    jeton: await jetonImpersonation(services(), {
      acteurUid: ctx.uid!,
      cibleUid: e.uid,
      motif: e.motif,
    }),
  }),
);

/** « Voir en tant que » : jeton à usage du navigateur, session pro en lecture seule (ADM-04). */
export async function voirEnTantQue(uid: string, motif: string) {
  return voir({ uid, motif });
}
