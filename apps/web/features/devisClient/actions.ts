'use server';

import { entreeSignatureDevis } from '@ph/core/schemas';
import { signerDevis } from '@ph/firebase/devis';
import { headers } from 'next/headers';
import { action } from '@/server/action';
import { servicesDevis } from '@/server/devis';
import { servicesComptes } from '@/server/espace';

const signer = action(
  {
    schema: entreeSignatureDevis,
    nom: 'signerDevis',
    authentification: 'facultative',
    rateLimit: { cle: 'signer-devis', max: 20, fenetre: '1h' },
  },
  async (e) => {
    const ip = (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim() ?? '';
    return signerDevis(
      { ...servicesDevis(), notifier: servicesComptes().notifier },
      { lien: e.lien, nom: e.nom, ip },
    );
  },
);

/** « Accepter ce devis » : un clic explicite, nom et « Bon pour accord » obligatoires. */
export async function accepterDevis(
  _: { erreur?: string; ok?: boolean } | null,
  formulaire: FormData,
): Promise<{ erreur?: string; ok?: boolean }> {
  const r = await signer({
    lien: String(formulaire.get('lien') ?? ''),
    nom: String(formulaire.get('nom') ?? ''),
    accord: formulaire.get('accord') === 'on',
  });
  return r.ok ? { ok: true } : { erreur: r.message };
}
