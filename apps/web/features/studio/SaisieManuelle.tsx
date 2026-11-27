'use client';

import { NOMS_RESEAUX, RESEAUX, type Reseau } from '@ph/core/studio';
import { Banner, Button, Field, Input, Select } from '@ph/ui';
import { useState, useTransition } from 'react';
import { CHIFFRES_VIDES, ChampsChiffres, versEntree } from './ChampsChiffres';
import { noterPublicationManuelle } from './publication';

const aujourdhui = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

/**
 * « J'ai publié moi-même » : en attendant de connecter les comptes, on note où et quand la vidéo
 * est sortie, et ses chiffres. Ils servent au calendrier, aux résultats et aux idées de Claude.
 */
export function SaisieManuelle({
  projetId,
  variantes,
}: {
  projetId: string;
  variantes: { id: string; accroche: string }[];
}) {
  const [reseau, setReseau] = useState<Reseau>('tiktok');
  const [variante, setVariante] = useState('');
  const [quand, setQuand] = useState(aujourdhui);
  const [lien, setLien] = useState('');
  const [chiffres, setChiffres] = useState(CHIFFRES_VIDES);
  const [message, setMessage] = useState<{ ton: 'succes' | 'danger'; texte: string } | null>(null);
  const [enCours, demarrer] = useTransition();
  const envoyer = () =>
    demarrer(async () => {
      setMessage(null);
      const r = await noterPublicationManuelle({
        projetId,
        reseau,
        variante: variante || null,
        publieeLe: new Date(quand).getTime(),
        lien: lien.trim() || null,
        ...versEntree(chiffres),
      });
      if (r.ok) {
        setChiffres(CHIFFRES_VIDES);
        setLien('');
      }
      setMessage(
        r.ok
          ? { ton: 'succes', texte: 'Noté. Mettez les chiffres à jour dans quelques jours.' }
          : { ton: 'danger', texte: r.message },
      );
    });
  return (
    <details className="rounded-card border border-trait p-3">
      <summary className="min-h-11 cursor-pointer font-semibold">J’ai publié moi-même</summary>
      <div className="mt-2 grid gap-3">
        <p className="m-0 text-sm text-neutre-700">
          Recopiez les chiffres de l’appli (statistiques de la vidéo). Claude s’en sert pour ses
          prochaines idées.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Réseau">
            <Select value={reseau} onChange={(e) => setReseau(e.target.value as Reseau)}>
              {NOMS_RESEAUX.map((r) => (
                <option key={r} value={r}>
                  {RESEAUX[r].libelle}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Publiée le">
            <Input type="datetime-local" value={quand} onChange={(e) => setQuand(e.target.value)} />
          </Field>
          {variantes.length ? (
            <Field label="Accroche">
              <Select value={variante} onChange={(e) => setVariante(e.target.value)}>
                <option value="">Version principale</option>
                {variantes.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.accroche}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
          <Field label="Lien de la vidéo (facultatif)">
            <Input
              type="url"
              value={lien}
              onChange={(e) => setLien(e.target.value)}
              placeholder="https://…"
            />
          </Field>
        </div>
        <ChampsChiffres valeur={chiffres} onChange={setChiffres} />
        {message ? <Banner tone={message.ton}>{message.texte}</Banner> : null}
        <div>
          <Button disabled={enCours || chiffres.vues.trim() === ''} onClick={envoyer}>
            Enregistrer
          </Button>
        </div>
      </div>
    </details>
  );
}
