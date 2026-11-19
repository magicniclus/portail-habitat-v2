'use client';

import { MODELES, type Scene } from '@ph/core/dessin';
import { Button, Feuille, Field, Input, RadioCard, RadioCardGroup } from '@ph/ui';
import { useState } from 'react';
import { sceneDepuisChoix, type ChoixDepart } from './scenesDepart';

type Choix = ChoixDepart;

const CHOIX: { id: Choix; libelle: string; detail: string }[] = [
  { id: 'rectangle', libelle: 'Rectangle', detail: 'Le plus courant' },
  { id: 'L', libelle: 'En L', detail: 'Un angle retiré' },
  { id: 'U', libelle: 'En U', detail: 'Une cour ou un patio' },
  { id: 'T', libelle: 'En T', detail: 'Deux angles retirés' },
  { id: 'vide', libelle: 'Partir de zéro', detail: 'Tracer mur par mur' },
];

const cm = (v: string) => Math.round(Number(v.replace(',', '.')) * 10);

/** Fenêtre « Nouveau plan » : titre, forme et cotes hors tout. */
export function NouveauPlan({
  ouvert,
  fermer,
  creer,
}: {
  ouvert: boolean;
  fermer: () => void;
  creer: (titre: string, scene: Scene) => Promise<string | null>;
}) {
  const [titre, setTitre] = useState('Mon projet');
  const [choix, setChoix] = useState<Choix>('rectangle');
  const [v, setV] = useState({
    largeur: '1000',
    profondeur: '800',
    decoupeL: '400',
    decoupeP: '300',
  });
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const champ = (cle: keyof typeof v, label: string) => (
    <Field label={label}>
      <Input
        inputMode="decimal"
        value={v[cle]}
        onChange={(ev) => setV({ ...v, [cle]: ev.target.value })}
      />
    </Field>
  );

  const valider = async () => {
    const r = sceneDepuisChoix(choix, {
      largeur: cm(v.largeur),
      profondeur: cm(v.profondeur),
      decoupeL: cm(v.decoupeL),
      decoupeP: cm(v.decoupeP),
    });
    if (!r.ok) return setErreur(r.message);
    setEnvoi(true);
    setErreur(await creer(titre.trim() || 'Mon projet', r.scene));
    setEnvoi(false);
  };

  return (
    <Feuille
      open={ouvert}
      onOpenChange={(o) => !o && fermer()}
      titre="Nouveau plan"
      description="Choisissez une forme ou un modèle de départ : vous pourrez tout modifier ensuite."
      actions={
        <Button onClick={() => void valider()} disabled={envoi}>
          Créer le plan
        </Button>
      }
    >
      <form className="grid gap-4" onSubmit={(ev) => (ev.preventDefault(), void valider())}>
        <Field label="Nom du projet">
          <Input value={titre} maxLength={120} onChange={(ev) => setTitre(ev.target.value)} />
        </Field>
        <RadioCardGroup legende="Forme de départ">
          {CHOIX.map((c) => (
            <RadioCard
              key={c.id}
              name="forme"
              value={c.id}
              checked={choix === c.id}
              onChange={() => setChoix(c.id)}
              titre={c.libelle}
              description={c.detail}
            />
          ))}
        </RadioCardGroup>
        <RadioCardGroup legende="Ou partir d’un modèle">
          {MODELES.map((m) => (
            <RadioCard
              key={m.id}
              name="forme"
              value={`modele:${m.id}`}
              checked={choix === `modele:${m.id}`}
              onChange={() => setChoix(`modele:${m.id}`)}
              titre={m.libelle}
              description={m.detail}
            />
          ))}
        </RadioCardGroup>
        {choix === 'vide' || choix.startsWith('modele:') ? null : (
          <div className="grid grid-cols-2 gap-3">
            {champ('largeur', 'Largeur hors tout (cm)')}
            {champ('profondeur', 'Profondeur hors tout (cm)')}
            {choix === 'rectangle' ? null : (
              <>
                {champ('decoupeL', 'Découpe : largeur (cm)')}
                {champ('decoupeP', 'Découpe : profondeur (cm)')}
              </>
            )}
          </div>
        )}
        {erreur ? (
          <p role="alert" className="m-0 text-sm text-danger">
            {erreur}
          </p>
        ) : null}
      </form>
    </Feuille>
  );
}
