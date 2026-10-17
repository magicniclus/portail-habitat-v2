'use client';

import type { SaisieConfigMatching } from '@ph/core/matching';
import type { ComparaisonClassement } from '@ph/firebase/admin-serveur';
import { Banner, Button, Field, Input } from '@ph/ui';
import { useState } from 'react';
import { ConfirmationAdmin } from '@/features/admin/ConfirmationAdmin';
import { publierConfig, rejouerDemande } from './actions';
import { ChampsAlgorithme } from './ChampsAlgorithme';

/** Maquette « Admin Algorithme » : réglages, bac à sable, publication d'une nouvelle version. */
export function EditeurAlgorithme({
  actuelle,
  peut,
}: {
  actuelle: SaisieConfigMatching;
  peut: boolean;
}) {
  const [s, setS] = useState(actuelle);
  const [reference, setReference] = useState('');
  const [comparaison, setComparaison] = useState<ComparaisonClassement | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const total = Object.values(s.poids).reduce((a, b) => a + b, 0);

  const rejouer = async () => {
    const r = await rejouerDemande(s, reference);
    if ('erreur' in r) {
      setErreur(r.erreur);
      setComparaison(null);
    } else {
      setErreur(null);
      setComparaison(r.comparaison);
    }
  };

  return (
    <div className="grid gap-5">
      <ChampsAlgorithme
        s={s}
        changer={(x) => {
          setS(x);
          setComparaison(null);
        }}
        inactif={!peut}
      />
      <section
        aria-label="Bac à sable"
        className="grid gap-3 rounded-[12px] border border-trait bg-blanc p-4"
      >
        <h2 className="m-0 text-lg">Bac à sable</h2>
        <div className="flex flex-wrap items-end gap-2">
          <Field label="Référence d’une demande passée">
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="PH-…"
            />
          </Field>
          <Button
            variant="secondaire"
            onClick={rejouer}
            disabled={!peut || total !== 100 || !reference}
          >
            Rejouer avec ces réglages
          </Button>
        </div>
        {erreur ? <Banner tone="danger">{erreur}</Banner> : null}
        {comparaison ? (
          <ol aria-label="Classement" className="m-0 grid list-none gap-1 p-0 text-sm">
            {comparaison.lignes.map((l) => (
              <li
                key={l.artisanId}
                className="flex flex-wrap justify-between gap-2 border-t border-trait py-2"
              >
                <strong>{l.nom}</strong>
                <span>
                  rang {l.avant ?? '—'} → {l.apres ?? '—'} · score {Math.round(l.scoreAvant)} →{' '}
                  {Math.round(l.scoreApres)}
                </span>
              </li>
            ))}
          </ol>
        ) : null}
      </section>
      <ConfirmationAdmin
        libelle="Publier la configuration"
        titre="Publier une nouvelle version de l’algorithme"
        description="Elle s’applique aux prochaines demandes ; la version précédente reste consultable."
        desactive={
          !peut
            ? 'Permission requise : matching.config'
            : total !== 100
              ? 'Le total des poids doit faire 100'
              : undefined
        }
        onConfirmer={(motif) => publierConfig(s, motif)}
      />
    </div>
  );
}
