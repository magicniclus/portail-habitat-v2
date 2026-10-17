'use client';

import { fichiers } from '@ph/firebase/chemins';
import { Banner, Button } from '@ph/ui';
import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import { nomFichierSur, nouvelIdFichier, problemeFichier } from '@/features/fichePro/fichiers';
import { deposerFichier } from '@/lib/firebaseClient';
import { posterJson } from '@/lib/posterJson';

const TYPES = ['image/png', 'image/jpeg'];

/**
 * Cachet de l'entreprise (maquette, onglet Paramètres) : image PNG ou JPEG de 2 Mo, gardée privée,
 * posée sur les devis où « Tampon » est coché et sur les factures. Fond transparent conseillé.
 */
export function Tampon({ artisanId, present }: { artisanId: string; present: boolean }) {
  const router = useRouter();
  const id = useId();
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const appeler = async (corps: object) => {
    const r = await posterJson<unknown>('/api/pro/devis/tampon', corps);
    if (!r.ok) setErreur(r.message);
    else router.refresh();
  };
  const choisir = async (f: File | undefined) => {
    if (!f) return;
    const probleme = problemeFichier(f, TYPES, 2);
    if (probleme) return setErreur(probleme.replace(', PNG ou WebP', ' ou PNG'));
    setEnCours(true);
    setErreur(null);
    const nomFichier = `${nouvelIdFichier()}-${nomFichierSur(f)}`.slice(0, 200);
    try {
      await deposerFichier(fichiers.tampon(artisanId, nomFichier), f);
      await appeler({ action: 'enregistrer', nomFichier });
    } catch {
      setErreur("L'envoi du cachet n'a pas abouti. Réessayez.");
    }
    setEnCours(false);
  };
  return (
    <section aria-labelledby="tampon" className="grid gap-2">
      <h2 id="tampon" className="m-0 text-lg">
        Cachet de l’entreprise
      </h2>
      <p className="m-0 text-sm text-neutre-700">
        {present
          ? 'Cachet enregistré : posé sur vos factures et sur les devis où « Tampon » est coché.'
          : 'Aucun cachet. PNG ou JPEG, 2 Mo au plus, fond transparent conseillé.'}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <label
          htmlFor={id}
          className="relative inline-flex min-h-11 cursor-pointer items-center overflow-hidden rounded-md border border-trait bg-blanc px-4 text-sm font-semibold has-focus-visible:outline-2 has-focus-visible:outline-accent"
        >
          {enCours ? 'Envoi…' : present ? 'Changer le cachet' : 'Ajouter un cachet'}
          <input
            id={id}
            type="file"
            accept={TYPES.join(',')}
            disabled={enCours}
            onChange={(e) => void choisir(e.target.files?.[0])}
            className="sr-only text-base"
          />
        </label>
        {present ? (
          <Button
            variant="fantome"
            disabled={enCours}
            onClick={() => void appeler({ action: 'retirer' })}
          >
            Retirer
          </Button>
        ) : null}
      </div>
      {erreur ? <Banner tone="danger">{erreur}</Banner> : null}
    </section>
  );
}
