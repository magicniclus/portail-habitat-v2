'use client';

import { fichiers } from '@ph/firebase/chemins';
import { LIMITES_REDACTION } from '@ph/core/ia';
import { Banner, Button, Checkbox, Feuille, Field, Input, Textarea } from '@ph/ui';
import { useRouter } from 'next/navigation';
import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { deposerFichier, EnvoiImpossible } from '@/lib/firebaseClient';
import { posterJson } from '@/lib/posterJson';
import { AssistantRedaction } from './AssistantRedaction';
import {
  dimensionsImage,
  nomFichierSur,
  nouvelIdFichier,
  problemeFichier,
  TYPES_IMAGE,
} from './fichiers';

/** « Ajouter un projet » (maquette Ma fiche) : photos publiques, accord du propriétaire du chantier. */
export function FormulaireProjet({
  artisanId,
  declencheur,
}: {
  artisanId: string;
  /** Bouton d'ouverture (« Ajouter un projet » par défaut ; carte vide de la grille). */
  declencheur?: ReactNode;
}) {
  const router = useRouter();
  const idPhotos = useId();
  const [ouvert, setOuvert] = useState(false);
  const [titre, setTitre] = useState('');
  const [ville, setVille] = useState('');
  const [description, setDescription] = useState('');
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
    const rid = nouvelIdFichier();
    try {
      const envoyees = await Promise.all(
        photos.map(async (f) => {
          const nomFichier = nomFichierSur(f);
          await deposerFichier(fichiers.realisation(artisanId, rid, nomFichier), f);
          return { nomFichier, ...(await dimensionsImage(f)) };
        }),
      );
      const r = await posterJson<null>('/api/pro/realisations', {
        rid,
        titre,
        ville,
        description,
        photos: envoyees,
        autorisationProprietaire: accord,
      });
      if (!r.ok) setErreur(r.message);
      else {
        setOuvert(false);
        setTitre('');
        setVille('');
        setDescription('');
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
      onOpenChange={setOuvert}
      titre="Ajouter un projet"
      declencheur={declencheur ?? <Button>Ajouter un projet</Button>}
      actions={
        <Button
          chargement={enCours}
          type="submit"
          form="form-projet"
          disabled={enCours || !photos.length || !accord}
        >
          {enCours ? 'Envoi…' : 'Publier le projet'}
        </Button>
      }
    >
      <form id="form-projet" onSubmit={ajouter} className="grid gap-4">
        {erreur ? <Banner tone="danger">{erreur}</Banner> : null}
        <Field label="Titre du chantier" requis>
          <Input value={titre} onChange={(e) => setTitre(e.target.value)} maxLength={120} />
        </Field>
        <Field label="Ville" requis>
          <Input value={ville} onChange={(e) => setVille(e.target.value)} maxLength={80} />
        </Field>
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
        <div className="grid gap-1.5">
          <label htmlFor={idPhotos} className="text-[15px] font-semibold">
            Photos{' '}
            <span className="font-normal text-neutre-700">
              (JPEG, PNG ou WebP, 8 Mo au plus chacune)
            </span>
          </label>
          <input
            id={idPhotos}
            type="file"
            multiple
            accept={TYPES_IMAGE.join(',')}
            onChange={(e) => setPhotos(Array.from(e.target.files ?? []).slice(0, 20))}
            className="min-h-11 w-full text-base file:mr-3 file:min-h-11 file:cursor-pointer file:rounded-md file:border file:border-trait file:bg-blanc file:px-4 file:font-semibold"
          />
        </div>
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
