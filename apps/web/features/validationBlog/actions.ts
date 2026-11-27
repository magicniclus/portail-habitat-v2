'use server';

import { entreeValidationPilote } from '@ph/core/schemas';
import { validerArticlePilote } from '@ph/firebase/blog';
import { action } from '@/server/action';
import { servicesSites } from '@/server/sites';

const valider = action(
  {
    schema: entreeValidationPilote,
    nom: 'validerArticlePilote',
    authentification: 'facultative',
    rateLimit: { cle: 'valider-blog', max: 30, fenetre: '1h' },
  },
  async (e) => validerArticlePilote(servicesSites(), e.lien),
);

/** « Valider la publication » : un clic explicite (jamais au chargement de la page, D70). */
export async function validerPublication(
  _: { erreur?: string; statut?: 'planifie' | 'publie' } | null,
  formulaire: FormData,
): Promise<{ erreur?: string; statut?: 'planifie' | 'publie' }> {
  const r = await valider({ lien: String(formulaire.get('lien') ?? '') });
  return r.ok ? { statut: r.data.statut } : { erreur: r.message };
}
