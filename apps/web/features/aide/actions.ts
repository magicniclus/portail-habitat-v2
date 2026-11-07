'use server';

import type { Resultat } from '@ph/core/resultat';
import { entreeContact } from '@ph/core/schemas';
import { appAdmin } from '@ph/firebase/admin';
import { creerContact } from '@ph/firebase/support';
import { getFirestore } from 'firebase-admin/firestore';
import { action } from '@/server/action';

const SUJETS_PRO = new Set(['inscription-pro', 'pro']);

const envoyer = action(
  {
    schema: entreeContact,
    nom: 'envoyerContact',
    authentification: 'facultative',
    rateLimit: { cle: 'contact', max: 5, fenetre: '1h' },
  },
  async (e) =>
    creerContact({ db: getFirestore(appAdmin()), horloge: Date.now }, e, {
      role: SUJETS_PRO.has(e.sujet) ? 'artisan' : 'particulier',
    }),
);

export type EtatContact = Resultat<{ reference: string; prenom: string; email: string }> | null;

/** Formulaire `/aide` (useActionState) : Zod, limite de débit et App Check par l'enveloppe. */
export async function envoyerContact(_: EtatContact, f: FormData): Promise<EtatContact> {
  const texte = (n: string) => {
    const v = f.get(n);
    return typeof v === 'string' && v !== '' ? v : undefined;
  };
  const brut = {
    sujet: texte('sujet'),
    nom: texte('nom'),
    email: texte('email'),
    referenceDossier: texte('referenceDossier'),
    message: texte('message'),
    site: texte('site'),
  };
  // Piège à robots rempli : on répond comme si tout allait bien, sans rien enregistrer.
  if (brut.site) return { ok: true, data: { reference: 'CT-000000', prenom: '', email: '' } };
  const r = await envoyer(brut);
  if (!r.ok) return r;
  return {
    ok: true,
    data: {
      reference: r.data.reference,
      prenom: (brut.nom ?? '').split(' ')[0]!,
      email: brut.email ?? '',
    },
  };
}
