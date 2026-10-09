'use server';

import { entreeConfirmerTelephone } from '@ph/core/schemas';
import { appAdmin } from '@ph/firebase/admin';
import { confirmerTelephonePartenaire } from '@ph/firebase/partenaires';
import { getFirestore } from 'firebase-admin/firestore';
import { redirect } from 'next/navigation';
import { action } from '@/server/action';

const confirmer = action(
  {
    schema: entreeConfirmerTelephone,
    nom: 'confirmerTelephonePartenaire',
    authentification: 'facultative',
    rateLimit: { cle: 'confirmer-telephone', max: 20, fenetre: '1h' },
  },
  async (e) =>
    confirmerTelephonePartenaire({ db: getFirestore(appAdmin()), horloge: Date.now }, e.jeton),
);

/**
 * Bouton de la page /confirmer-telephone : la confirmation demande un clic (les aperçus de liens
 * des messageries ouvrent l'adresse sans la personne).
 */
export async function confirmerTelephone(formulaire: FormData) {
  const r = await confirmer({ jeton: String(formulaire.get('jeton') ?? '') });
  redirect(`/confirmer-telephone?etat=${r.ok && r.data === 'confirme' ? 'confirme' : 'invalide'}`);
}
