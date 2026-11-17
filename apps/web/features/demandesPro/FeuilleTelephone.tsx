'use client';

import { Banner, Button, Feuille, Field, Input } from '@ph/ui';
import { useState, type FormEvent } from 'react';
import { posterJson } from '@/lib/posterJson';

/**
 * « Votre numéro » (décision du 17/11/2026) : le téléphone n'est plus demandé à l'inscription ;
 * il l'est ici, avant la première demande acceptée, s'il manque. Enregistré comme dans Ma fiche
 * (`/api/pro/fiche`, droit `fiche.modifier`), puis l'action en attente reprend.
 */
export function FeuilleTelephone({
  ouvert,
  fermer,
  enregistre,
}: {
  ouvert: boolean;
  fermer: () => void;
  enregistre: () => void;
}) {
  const [tel, setTel] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const envoyer = async (ev: FormEvent) => {
    ev.preventDefault();
    setEnCours(true);
    setErreur(null);
    const r = await posterJson<unknown>('/api/pro/fiche', { telephonePublic: tel.trim() });
    setEnCours(false);
    if (!r.ok) return setErreur(r.message);
    enregistre();
  };

  return (
    <Feuille
      open={ouvert}
      onOpenChange={(o) => (o ? null : fermer())}
      titre="Votre numéro"
      description="Le particulier pourra vous rappeler. Il apparaît sur votre fiche ; vous le modifiez quand vous voulez dans Ma fiche."
      actions={
        <Button chargement={enCours} type="submit" form="form-votre-numero" disabled={enCours}>
          Enregistrer et continuer
        </Button>
      }
    >
      <form id="form-votre-numero" onSubmit={envoyer} noValidate className="grid gap-3">
        {erreur ? <Banner tone="danger">{erreur}</Banner> : null}
        <Field label="Téléphone" requis>
          <Input
            champ="tel"
            value={tel}
            onChange={(e) => setTel(e.target.value)}
            enterKeyHint="done"
          />
        </Field>
      </form>
    </Feuille>
  );
}
