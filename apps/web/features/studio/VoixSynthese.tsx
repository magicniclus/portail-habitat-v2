'use client';

import type { SujetStudio } from '@ph/core/studio';
import { Banner, Button, Checkbox, Field, Select, Textarea } from '@ph/ui';
import { useEffect, useState } from 'react';
import { listerVoix, voixSynthese } from './actions';

/** Une voix ElevenLabs lit le texte (le script par défaut) ; elle remplace l'enregistrement. */
export function VoixSynthese({
  projetId,
  script,
}: {
  projetId: string;
  script: SujetStudio['script'];
}) {
  const [voix, setVoix] = useState<{ id: string; nom: string }[] | null>(null);
  const [voixId, setVoixId] = useState('');
  const [texte, setTexte] = useState(() => script.map((s) => s.voix).join('\n'));
  const [sousTitres, setSousTitres] = useState(true);
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<{ ton: 'succes' | 'danger'; texte: string } | null>(null);
  useEffect(() => {
    let actif = true;
    void listerVoix({ projetId }).then((v) => {
      if (!actif) return;
      setVoix(v);
      setVoixId((x) => x || v[0]?.id || '');
    });
    return () => {
      actif = false;
    };
  }, [projetId]);
  const generer = async () => {
    setMessage(null);
    setEnvoi(true);
    const r = await voixSynthese({ projetId, texte, voixId, sousTitres });
    setEnvoi(false);
    setMessage(
      r.ok
        ? { ton: 'succes', texte: 'Voix créée : Claude monte la vidéo.' }
        : { ton: 'danger', texte: r.message },
    );
  };
  if (voix === null) return <p className="m-0 text-sm text-neutre-700">Chargement des voix…</p>;
  if (voix.length === 0)
    return (
      <Banner tone="info">
        ElevenLabs n’est pas configuré : ajoutez la clé ELEVENLABS_API_KEY dans .env.local (voir
        docs/CLES.md), puis rechargez la page.
      </Banner>
    );
  return (
    <div className="grid content-start gap-3">
      <Field label="Voix">
        <Select value={voixId} onChange={(e) => setVoixId(e.target.value)}>
          {voix.map((v) => (
            <option key={v.id} value={v.id}>
              {v.nom}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Texte lu" aide={`${texte.length} / 5 000 caractères`}>
        <Textarea
          rows={8}
          maxLength={5_000}
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
        />
      </Field>
      <Checkbox checked={sousTitres} onChange={(e) => setSousTitres(e.target.checked)}>
        Sous-titres (le texte lu en bas de l’image)
      </Checkbox>
      {message ? <Banner tone={message.ton}>{message.texte}</Banner> : null}
      <div>
        <Button
          taille="lg"
          disabled={envoi || texte.trim().length < 10 || !voixId}
          onClick={() => void generer()}
        >
          {envoi ? 'Création de la voix…' : 'Créer la voix et lancer le montage'}
        </Button>
      </div>
    </div>
  );
}
