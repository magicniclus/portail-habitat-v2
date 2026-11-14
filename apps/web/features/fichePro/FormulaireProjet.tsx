'use client';

import { fichiers } from '@ph/firebase/chemins';
import { LIMITES_REDACTION } from '@ph/core/ia';
import type { RealisationPro } from '@ph/firebase/pro';
import { Banner, Button, Checkbox, Combobox, Feuille, Field, Input, Textarea } from '@ph/ui';
import { useRouter } from 'next/navigation';
import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { deposerFichier, EnvoiImpossible } from '@/lib/firebaseClient';
import { posterJson } from '@/lib/posterJson';
import { useLieux } from '@/features/inscription/useLieux';
import { AssistantRedaction } from './AssistantRedaction';
import { ChampPhotosProjet, PhotosGardees } from './PhotosGardees';
import {
  dimensionsImage,
  nomFichierSur,
  nouvelIdFichier,
  problemeFichier,
  TYPES_IMAGE,
} from './fichiers';

/**
 * « Ajouter un projet » (maquette Ma fiche) : photos publiques, accord du propriétaire du
 * chantier. Avec `projet` : « Modifier le projet » (texte, photos gardées ou retirées, nouvelles
 * photos ; accord redemandé seulement pour de nouvelles photos).
 */
export function FormulaireProjet({
  artisanId,
  declencheur,
  projet,
}: {
  artisanId: string;
  /** Bouton d'ouverture (« Ajouter un projet » par défaut ; carte vide de la grille). */
  declencheur?: ReactNode;
  projet?: RealisationPro;
}) {
  const router = useRouter();
  const idFormulaire = useId();
  const [ouvert, setOuvert] = useState(false);
  const [titre, setTitre] = useState(projet?.titre ?? '');
  const [ville, setVille] = useState(projet?.ville ?? '');
  const lieux = useLieux(ville, undefined);
  const [description, setDescription] = useState(projet?.description ?? '');
  const [conservees, setConservees] = useState(
    () => projet?.photos.map((p) => p.storagePath) ?? [],
  );
  const [photos, setPhotos] = useState<File[]>([]);
  const [accord, setAccord] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const ajouter = async (ev: FormEvent) => {
    ev.preventDefault();
    const probleme = photos.map((f) => problemeFichier(f, TYPES_IMAGE, 8)).find(Boolean);
    if (probleme) return setErreur(probleme);
    setEnCours(true);
    setErreur(null);
    const rid = projet?.id ?? nouvelIdFichier();
    try {
      const envoyees = await Promise.all(
        photos.map(async (f) => {
          const nomFichier = nomFichierSur(f);
          await deposerFichier(fichiers.realisation(artisanId, rid, nomFichier), f);
          return { nomFichier, ...(await dimensionsImage(f)) };
        }),
      );
      const r = projet
        ? await posterJson<null>(
            '/api/pro/realisations',
            {
              rid,
              titre,
              ville,
              description,
              conservees,
              nouvelles: envoyees,
              ...(envoyees.length ? { autorisationProprietaire: accord } : {}),
            },
            'PATCH',
          )
        : await posterJson<null>('/api/pro/realisations', {
            rid,
            titre,
            ville,
            description,
            photos: envoyees,
            autorisationProprietaire: accord,
          });
      if (!r.ok) setErreur(r.message);
      else {
        // Nouveau projet : formulaire vidé ; modification : rechargé à la prochaine ouverture.
        if (!projet) [setTitre, setVille, setDescription].forEach((f) => f(''));
        setOuvert(false);
        setPhotos([]);
        setAccord(false);
        router.refresh();
      }
    } catch (e) {
      setErreur(
        e instanceof EnvoiImpossible ? e.message : "L'envoi des photos n'a pas abouti. Réessayez.",
      );
    }
    setEnCours(false);
  };

  return (
    <Feuille
      open={ouvert}
      onOpenChange={(o) => {
        // Modification : toujours repartir du projet tel qu'il est enregistré.
        if (o && projet) {
          setTitre(projet.titre);
          setVille(projet.ville);
          setDescription(projet.description);
          setConservees(projet.photos.map((p) => p.storagePath));
          setPhotos([]);
          setAccord(false);
          setErreur(null);
        }
        setOuvert(o);
      }}
      titre={projet ? 'Modifier le projet' : 'Ajouter un projet'}
      declencheur={declencheur ?? <Button>Ajouter un projet</Button>}
      actions={
        <Button
          chargement={enCours}
          type="submit"
          form={idFormulaire}
          disabled={
            enCours ||
            (projet
              ? conservees.length + photos.length === 0 || (photos.length > 0 && !accord)
              : !photos.length || !accord)
          }
        >
          {enCours ? 'Envoi…' : projet ? 'Enregistrer' : 'Publier le projet'}
        </Button>
      }
    >
      <form id={idFormulaire} onSubmit={ajouter} className="grid gap-4">
        {erreur ? <Banner tone="danger">{erreur}</Banner> : null}
        <Field label="Titre du chantier" requis>
          <Input value={titre} onChange={(e) => setTitre(e.target.value)} maxLength={120} />
        </Field>
        <Combobox
          label="Ville"
          valeur={ville}
          onValeurChange={(v) => setVille(v.slice(0, 80))}
          options={lieux.map((l) => ({
            id: `${l.nom}-${l.codePostal}`,
            libelle: l.nom,
            complement: l.codePostal,
          }))}
          onSelection={(o) => setVille(o.libelle)}
          vide="Aucune commune trouvée : votre saisie est gardée telle quelle."
        />
        <Field
          label="Description du chantier"
          aide={`Facultatif (${description.length}/${LIMITES_REDACTION.projet}).`}
        >
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={LIMITES_REDACTION.projet}
            rows={3}
          />
        </Field>
        <AssistantRedaction
          type="projet"
          texte={description}
          remplacer={setDescription}
          infos={{ titre, ville }}
        />
        {projet ? (
          <PhotosGardees
            photos={projet.photos}
            conservees={conservees}
            onChange={setConservees}
            titre={projet.titre}
          />
        ) : null}
        <ChampPhotosProjet
          libelle={projet ? 'Ajouter des photos' : 'Photos'}
          max={20 - conservees.length}
          onChange={setPhotos}
        />
        <Checkbox
          checked={accord}
          onChange={(e) => setAccord(e.currentTarget.checked)}
          className="text-sm"
        >
          Le propriétaire du chantier m&apos;autorise à publier ces photos.
        </Checkbox>
      </form>
    </Feuille>
  );
}
