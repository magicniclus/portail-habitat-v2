'use client';

import { LIBELLES_ETAPE_CYCLE } from '@ph/core/conversion';
import { Banner, Button, Checkbox, Feuille, Field, Input, Select, Textarea } from '@ph/ui';
import { useState } from 'react';
import { enregistrerSequence } from './actions';
import { EtapesSequence, type EtapeSaisie } from './EtapesSequence';

export interface SequenceEditee {
  id?: string;
  nom: string;
  etapeEntree: string;
  objectif: string;
  actif: boolean;
  etapes: EtapeSaisie[];
}

const VIDE: Omit<SequenceEditee, 'etapes'> = {
  nom: '',
  etapeEntree: 'gratuit_actif',
  objectif: '',
  actif: false,
};

/**
 * Création ou modification d'une séquence (CONV-05) : chaque enregistrement crée une version et
 * une entrée d'audit ; les entreprises en cours passent aux nouvelles étapes au prochain envoi.
 */
export function EditeurSequence({
  initiale,
  modeles,
  libelle,
  desactive,
}: {
  initiale?: SequenceEditee;
  modeles: string[];
  libelle: string;
  desactive?: string | undefined;
}) {
  const depart = (): SequenceEditee =>
    initiale ?? {
      ...VIDE,
      etapes: [{ modele: modeles[0] ?? '', declencheur: 'delai', valeur: 3 }],
    };
  const [ouvert, setOuvert] = useState(false);
  const [seq, setSeq] = useState<SequenceEditee>(depart);
  const [motif, setMotif] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const enregistrer = async () => {
    setEnCours(true);
    setErreur(null);
    const e = await enregistrerSequence({ ...seq, motif: motif.trim() });
    setEnCours(false);
    if (e) return setErreur(e);
    setOuvert(false);
    setMotif('');
  };

  return (
    <Feuille
      open={ouvert}
      onOpenChange={(o) => {
        setOuvert(o);
        if (o) setSeq(depart());
      }}
      titre={initiale?.id ? `Modifier ${initiale.id}` : 'Nouvelle séquence'}
      description="Les règles globales s’appliquent toujours : pression, préférences, groupe témoin, mise en veille et chiffres obligatoires du modèle."
      declencheur={
        <Button
          variant={initiale ? 'secondaire' : 'primaire'}
          disabled={Boolean(desactive)}
          title={desactive}
        >
          {libelle}
        </Button>
      }
      actions={
        <Button disabled={enCours || motif.trim().length < 5} onClick={() => void enregistrer()}>
          Enregistrer
        </Button>
      }
    >
      <div className="grid gap-4">
        <Field label="Nom">
          <Input value={seq.nom} onChange={(e) => setSeq({ ...seq, nom: e.target.value })} />
        </Field>
        <Field label="Étape d’entrée">
          <Select
            value={seq.etapeEntree}
            onChange={(e) => setSeq({ ...seq, etapeEntree: e.target.value })}
          >
            {Object.entries(LIBELLES_ETAPE_CYCLE).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Objectif (sortie automatique)">
          <Input
            value={seq.objectif}
            onChange={(e) => setSeq({ ...seq, objectif: e.target.value })}
          />
        </Field>
        <Checkbox checked={seq.actif} onChange={(e) => setSeq({ ...seq, actif: e.target.checked })}>
          Activer dès l’enregistrement (sinon enregistrée en pause)
        </Checkbox>
        <EtapesSequence
          etapes={seq.etapes}
          modeles={modeles}
          onChange={(etapes) => setSeq({ ...seq, etapes })}
        />
        <Field label="Motif (obligatoire)">
          <Textarea value={motif} onChange={(e) => setMotif(e.target.value)} rows={2} />
        </Field>
        {erreur ? <Banner tone="danger">{erreur}</Banner> : null}
      </div>
    </Feuille>
  );
}
