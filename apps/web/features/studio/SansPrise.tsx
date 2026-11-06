'use client';

import { Banner, Button, Field, Select } from '@ph/ui';
import { useState, useTransition } from 'react';
import { videoSansPrise } from './actions';

const DUREES = [15, 20, 30, 45, 60, 90] as const;

/**
 * Sans voix ni image : rien à enregistrer. Claude monte la vidéo avec les captures de Portail
 * Travaux, des cartons, des textes animés et la musique, à partir du script.
 */
export function SansPrise({ projetId, dureeCibleS }: { projetId: string; dureeCibleS: number }) {
  const proche = DUREES.reduce((a, b) =>
    Math.abs(b - dureeCibleS) < Math.abs(a - dureeCibleS) ? b : a,
  );
  const [duree, setDuree] = useState<number>(proche);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();
  return (
    <div className="grid content-start gap-3">
      <p className="m-0 text-sm text-neutre-700">
        Aucune voix, aucune caméra : la vidéo se lit avec des textes à l’écran sur les captures de
        Portail Travaux, avec une musique de fond. Pratique pour les vidéos regardées sans le son.
      </p>
      <Field label="Durée">
        <Select value={duree} onChange={(e) => setDuree(Number(e.target.value))} className="w-auto">
          {DUREES.map((d) => (
            <option key={d} value={d}>
              {d} secondes
            </option>
          ))}
        </Select>
      </Field>
      {erreur ? <Banner tone="danger">{erreur}</Banner> : null}
      <div>
        <Button
          taille="lg"
          disabled={enCours}
          onClick={() =>
            demarrer(async () => {
              setErreur(null);
              const r = await videoSansPrise({ projetId, dureeMs: duree * 1000 });
              if (!r.ok) setErreur(r.message);
            })
          }
        >
          {enCours ? 'Claude monte la vidéo…' : 'Créer la vidéo'}
        </Button>
      </div>
    </div>
  );
}
