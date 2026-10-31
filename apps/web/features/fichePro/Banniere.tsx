'use client';

import { Chargeur } from '@ph/ui';
import { BANNIERES_MAX_VISIBILITE } from '@ph/core/annuaire';
import { fichiers } from '@ph/firebase/chemins';
import { CrownIcon, ImageIcon, TrashIcon } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import { CarrouselBannieres } from '@/features/fiche/CarrouselBannieres';
import { FenetreOffre } from '@/features/offres/FenetreOffre';
import { deposerFichier, EnvoiImpossible } from '@/lib/firebaseClient';
import { posterJson } from '@/lib/posterJson';
import { useGlisserDeposer } from './useGlisserDeposer';
import { nomFichierSur, problemeFichier, TYPES_IMAGE } from './fichiers';

const pastille =
  'inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-control border border-trait bg-blanc px-3.5 text-sm font-semibold text-texte shadow-sm has-focus-visible:outline-2 has-focus-visible:outline-accent focus-visible:outline-2 focus-visible:outline-accent';

/**
 * Bannières de Ma fiche (1600 × 500, 5 Mo ; clic ou glisser-déposer) : 5 avec la visibilité
 * payante, une seule sinon (remplacée à chaque envoi ; « Plus de bannières » ouvre la fenêtre
 * d'offre). Les commandes n'existent que dans l'espace pro ; la fiche publique n'affiche que
 * les images.
 */
export function Banniere({
  artisanId,
  bannieres,
  max,
  modifiable,
  offre,
}: {
  artisanId: string;
  bannieres: string[];
  max: number;
  modifiable: boolean;
  /** Le membre peut souscrire (fenêtre d'offre affichée quand une seule bannière est permise). */
  offre: boolean;
}) {
  const router = useRouter();
  const id = useId();
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const visibles = bannieres.slice(0, max);
  const pleine = max > 1 && visibles.length >= max;

  const choisir = async (f: File | undefined) => {
    if (!f) return;
    if (pleine) return setErreur(`${max} bannières au plus : retirez-en une d'abord.`);
    const probleme = problemeFichier(f, TYPES_IMAGE, 5);
    if (probleme) return setErreur(probleme);
    setEnCours(true);
    setErreur(null);
    const nomFichier = nomFichierSur(f);
    try {
      await deposerFichier(fichiers.banniere(artisanId, nomFichier), f);
      const r = await posterJson<{ bannieres: string[] }>('/api/pro/banniere', { nomFichier });
      if (!r.ok) setErreur(r.message);
      else router.refresh();
    } catch (e) {
      setErreur(
        e instanceof EnvoiImpossible
          ? e.message
          : "L'envoi de la bannière n'a pas abouti. Réessayez.",
      );
    }
    setEnCours(false);
  };

  const retirer = async (url: string) => {
    setEnCours(true);
    setErreur(null);
    const r = await posterJson<{ bannieres: string[] }>('/api/pro/banniere', { url }, 'DELETE');
    if (!r.ok) setErreur(r.message);
    else router.refresh();
    setEnCours(false);
  };

  const { survol, zone } = useGlisserDeposer((f) => void choisir(f), modifiable && !enCours);
  const hauteur = 'h-[clamp(120px,18vw,170px)]';

  return (
    <div
      {...zone}
      className={`relative ${hauteur} overflow-hidden bg-accent-100 ${survol ? 'outline-2 -outline-offset-4 outline-accent outline-dashed' : ''}`}
    >
      {visibles.length ? (
        <CarrouselBannieres
          urls={visibles}
          className="size-full"
          {...(modifiable
            ? {
                surImage: (url: string, i: number) => (
                  <button
                    type="button"
                    disabled={enCours}
                    onClick={() => void retirer(url)}
                    aria-label={`Retirer la bannière ${i + 1}`}
                    className={`${pastille} absolute top-3 left-3 px-3`}
                  >
                    <TrashIcon size={18} aria-hidden="true" />
                  </button>
                ),
              }
            : {})}
        />
      ) : modifiable ? (
        <span className="flex size-full flex-col items-center justify-center gap-1 text-sm text-neutre-800">
          <ImageIcon size={26} aria-hidden="true" />
          Bannière (1600 × 500 px) : glissez une image ici
        </span>
      ) : null}
      {modifiable ? (
        <div className="absolute top-3 right-3 flex flex-wrap justify-end gap-2">
          {pleine ? null : (
            <label htmlFor={id} className={pastille}>
              {enCours ? (
                <>
                  <Chargeur taille="sm" ton="courant" decoratif /> Envoi…
                </>
              ) : max > 1 ? (
                `Ajouter une bannière (${visibles.length}/${max})`
              ) : visibles.length ? (
                'Changer la bannière'
              ) : (
                'Ajouter une bannière'
              )}
              <input
                id={id}
                type="file"
                accept={TYPES_IMAGE.join(',')}
                disabled={enCours}
                onChange={(e) => void choisir(e.target.files?.[0])}
                className="sr-only text-base"
              />
            </label>
          )}
          {max === 1 && offre ? (
            <FenetreOffre
              formule="fiche_pro"
              raison={`Jusqu'à ${BANNIERES_MAX_VISIBILITE} bannières sur votre fiche avec la visibilité Fiche Pro.`}
              className={`${pastille} border-premium bg-premium-fond text-premium-texte hover:bg-premium-fond hover:brightness-95`}
            >
              <CrownIcon size={18} weight="fill" aria-hidden="true" className="text-premium" />
              Jusqu’à {BANNIERES_MAX_VISIBILITE} bannières
            </FenetreOffre>
          ) : null}
        </div>
      ) : null}
      {erreur ? (
        <p
          role="alert"
          className="absolute right-3 bottom-3 m-0 rounded-control bg-blanc px-3 py-1.5 text-sm text-danger"
        >
          {erreur}
        </p>
      ) : null}
    </div>
  );
}
