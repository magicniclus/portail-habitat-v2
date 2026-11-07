'use server';

import { entreePreferences } from '@ph/core/schemas';
import { majPreferences } from '@ph/firebase/notifications';
import { redirect } from 'next/navigation';
import { action } from '@/server/action';
import { lireJeton, servicesNotifications } from '@/server/notifications';

const enregistrer = action(
  {
    schema: entreePreferences,
    nom: 'enregistrerPreferences',
    authentification: 'facultative',
    rateLimit: { cle: 'preferences', max: 20, fenetre: '1h' },
  },
  async (e) => {
    const jeton = lireJeton(e.jeton);
    if (!jeton?.sujet.startsWith('u:')) return false;
    await majPreferences(servicesNotifications(), jeton.sujet.slice(2), {
      activite: { email: e.activiteEmail, inapp: e.activiteInapp },
      relance: { email: e.relanceEmail },
      offres_pro: { email: e.offresProEmail },
      marketing: { email: e.marketingEmail },
    });
    return true;
  },
);

/** Formulaire de la page /preferences (sans connexion : le jeton signé de l'email fait foi). */
export async function enregistrerPreferences(formulaire: FormData) {
  const jeton = String(formulaire.get('jeton') ?? '');
  const coche = (n: string) => formulaire.get(n) === 'on';
  const r = await enregistrer({
    jeton,
    activiteEmail: coche('activiteEmail'),
    activiteInapp: coche('activiteInapp'),
    relanceEmail: coche('relanceEmail'),
    offresProEmail: coche('offresProEmail'),
    marketingEmail: coche('marketingEmail'),
  });
  redirect(
    `/preferences?t=${encodeURIComponent(jeton)}&${r.ok && r.data ? 'ok=1' : 'erreur=enregistrement'}`,
  );
}
