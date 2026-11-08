'use client';

import type { SujetStudio } from '@ph/core/studio';
import { Banner, Button, Checkbox, Field, Select } from '@ph/ui';
import { useEffect, useState, useTransition } from 'react';
import { listerVoix, videoSansPrise, voixSynthese } from './actions';

const DUREES = [15, 20, 30, 45, 60, 90] as const;
const SANS_VOIX = '';

/**
 * Rien à tourner soi-même : Claude monte la vidéo avec les captures de Portail Travaux, une
 * intro, une fin et des textes, à partir du script (jamais de musique). Au choix, une voix IA
 * (ElevenLabs) lit le script, et le texte s'affiche en sous-titres.
 */
export function SansPrise({
  projetId,
  dureeCibleS,
  script,
}: {
  projetId: string;
  dureeCibleS: number;
  script: SujetStudio['script'];
}) {
  const proche = DUREES.reduce((a, b) =>
    Math.abs(b - dureeCibleS) < Math.abs(a - dureeCibleS) ? b : a,
  );
  const [duree, setDuree] = useState<number>(proche);
  const [voix, setVoix] = useState<{ id: string; nom: string }[]>([]);
  const [voixId, setVoixId] = useState(SANS_VOIX);
  const [sousTitres, setSousTitres] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();
  const texte = script.map((s) => s.voix).join('\n');
  useEffect(() => {
    let actif = true;
    void listerVoix({ projetId }).then((v) => actif && setVoix(v));
    return () => {
      actif = false;
    };
  }, [projetId]);

  const creer = () =>
    demarrer(async () => {
      setErreur(null);
      const r =
        voixId === SANS_VOIX
          ? await videoSansPrise({ projetId, dureeMs: duree * 1000, sousTitres })
          : await voixSynthese({ projetId, texte, voixId, sousTitres });
      if (!r.ok) setErreur(r.message);
    });

  return (
    <div className="grid content-start gap-3">
      <p className="m-0 text-sm text-neutre-700">
        Vous ne tournez rien : Claude monte la vidéo avec l’écran de Portail Travaux filmé, une
        intro, une fin et quelques textes, à partir du script (sans musique). Vous pourrez tout
        retoucher ensuite dans le montage.
      </p>
      <Field
        label="Voix"
        aide={
          voix.length
            ? 'Une voix IA lit le script ; sa durée fixe celle de la vidéo.'
            : 'Voix IA : ajoutez la clé ELEVENLABS_API_KEY dans .env.local pour en proposer.'
        }
      >
        <Select value={voixId} onChange={(e) => setVoixId(e.target.value)}>
          <option value={SANS_VOIX}>Aucune voix (textes à l’écran)</option>
          {voix.map((v) => (
            <option key={v.id} value={v.id}>
              Voix IA : {v.nom}
            </option>
          ))}
        </Select>
      </Field>
      {voixId === SANS_VOIX ? (
        <Field label="Durée">
          <Select
            value={duree}
            onChange={(e) => setDuree(Number(e.target.value))}
            className="w-auto"
          >
            {DUREES.map((d) => (
              <option key={d} value={d}>
                {d} secondes
              </option>
            ))}
          </Select>
        </Field>
      ) : null}
      <Checkbox
        checked={sousTitres}
        disabled={!texte.trim()}
        onChange={(e) => setSousTitres(e.target.checked)}
      >
        Sous-titres (le texte du script en bas de l’image)
      </Checkbox>
      {erreur ? <Banner tone="danger">{erreur}</Banner> : null}
      <div>
        <Button taille="lg" disabled={enCours} onClick={creer}>
          {enCours ? 'Claude monte la vidéo…' : 'Créer la vidéo'}
        </Button>
      </div>
    </div>
  );
}
