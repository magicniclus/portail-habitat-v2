'use client';

import { ouvrirSessionPro } from '@/features/connexion/sessionPro';
import { authClient } from '@/lib/firebaseClient';
import { routes } from '@/lib/routes';
import { voirEnTantQue } from './actions';
import { ConfirmationAdmin } from './ConfirmationAdmin';

/**
 * « Voir en tant que » (superadmin, ADM-04) : la session admin est remplacée par une session pro en
 * lecture seule ; le bandeau rouge de l'espace pro permet d'en sortir.
 */
export function VoirEnTantQue({
  uid,
  nom,
  desactive,
}: {
  uid: string;
  nom: string;
  desactive?: string | undefined;
}) {
  return (
    <ConfirmationAdmin
      libelle="Voir en tant que"
      titre={`Voir l’espace de ${nom}`}
      description="Lecture seule : aucune modification n’est possible et la consultation est journalisée."
      desactive={desactive}
      onConfirmer={async (motif) => {
        const r = await voirEnTantQue(uid, motif);
        if (!r.ok) return r.message;
        const auth = await authClient();
        const m = await import('firebase/auth');
        await ouvrirSessionPro(await m.signInWithCustomToken(auth, r.data.jeton), 'pro');
        window.location.assign(routes.proTableauDeBord);
        return null;
      }}
    />
  );
}
