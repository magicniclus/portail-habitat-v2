'use client';

import { fichiers } from '@ph/firebase/chemins';
import { Banner, Button } from '@ph/ui';
import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import { nomFichierSur, nouvelIdFichier, problemeFichier } from '@/features/fichePro/fichiers';
import { deposerFichier } from '@/lib/firebaseClient';
import { posterJson } from '@/lib/posterJson';

/** PNG ou JPEG seulement : les seuls formats que le PDF sait poser. */
const TYPES = ['image/png', 'image/jpeg'];

const TEXTES = {
  tampon: {
    titre: 'Cachet de l’entreprise',
    present: 'Cachet enregistré : posé sur vos factures et sur les devis où « Tampon » est coché.',
    absent: 'Aucun cachet. PNG ou JPEG, 2 Mo au plus, fond transparent conseillé.',
    ajouter: 'Ajouter un cachet',
    changer: 'Changer le cachet',
    echec: "L'envoi du cachet n'a pas abouti. Réessayez.",
  },
  logo: {
    titre: 'Logo des devis et factures',
    present: 'Logo enregistré : en haut de vos prochains devis et factures.',
    absent: 'Aucun logo : celui de « Ma fiche » est repris. PNG ou JPEG, 2 Mo au plus.',
    ajouter: 'Ajouter un logo',
    changer: 'Changer le logo',
    echec: "L'envoi du logo n'a pas abouti. Réessayez.",
  },
} as const;

/**
 * Cachet ou logo des devis et factures (maquette, onglet Paramètres) : image de 2 Mo déposée dans
 * Storage puis vérifiée par le serveur. Le cachet reste privé ; le logo rejoint le dossier public
 * du logo de l'entreprise.
 */
export function ImageFacturation({
  artisanId,
  quoi,
  present,
}: {
  artisanId: string;
  quoi: keyof typeof TEXTES;
  present: boolean;
}) {
  const router = useRouter();
  const id = useId();
  const t = TEXTES[quoi];
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const appeler = async (corps: object) => {
    const r = await posterJson<unknown>('/api/pro/devis/image', { quoi, ...corps });
    if (!r.ok) setErreur(r.message);
    else router.refresh();
  };
  const choisir = async (f: File | undefined) => {
    if (!f) return;
    const probleme = problemeFichier(f, TYPES, 2);
    if (probleme) return setErreur(probleme.replace(', PNG ou WebP', ' ou PNG'));
    setEnCours(true);
    setErreur(null);
    const base = `${nouvelIdFichier()}-${nomFichierSur(f)}`;
    const nomFichier = (quoi === 'logo' ? `devis-${base}` : base).slice(0, 200);
    try {
      await deposerFichier(fichiers[quoi](artisanId, nomFichier), f);
      await appeler({ action: 'enregistrer', nomFichier });
    } catch {
      setErreur(t.echec);
    }
    setEnCours(false);
  };
  return (
    <section aria-labelledby={`${id}-titre`} className="grid gap-2">
      <h2 id={`${id}-titre`} className="m-0 text-lg">
        {t.titre}
      </h2>
      <p className="m-0 text-sm text-neutre-700">{present ? t.present : t.absent}</p>
      <div className="flex flex-wrap items-center gap-2">
        <label
          htmlFor={id}
          className="relative inline-flex min-h-11 cursor-pointer items-center overflow-hidden rounded-md border border-trait bg-blanc px-4 text-sm font-semibold has-focus-visible:outline-2 has-focus-visible:outline-accent"
        >
          {enCours ? 'Envoi…' : present ? t.changer : t.ajouter}
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
