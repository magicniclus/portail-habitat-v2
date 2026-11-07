'use client';

import { FORMAT_DEFAUT, FORMATS_STUDIO, NOMS_FORMATS, type FormatStudio } from '@ph/core/studio';
import { formatNombre } from '@ph/core/format';
import type { IdeeStudio } from '@ph/firebase/studio';
import { Badge, Banner, Button, Checkbox, Select } from '@ph/ui';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { supprimerIdee, tournerIdee } from './actions';

/**
 * Idées gardées : on les retrouve et on les tourne sans rappeler l'IA (aucun coût Claude), ou on
 * les supprime.
 */
export function IdeesGardees({ idees }: { idees: IdeeStudio[] }) {
  const router = useRouter();
  const [format, setFormat] = useState<FormatStudio>(FORMAT_DEFAUT);
  const [camera, setCamera] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();
  const tourner = (ideeId: string) =>
    demarrer(async () => {
      setErreur(null);
      const r = await tournerIdee({ ideeId, format, camera });
      if (r.ok) router.push(`/admin/studio/${r.data}` as Route);
      else setErreur(r.message);
    });
  const supprimer = (idee: IdeeStudio) => {
    if (!window.confirm(`Supprimer l’idée « ${idee.sujet.titre} » ?`)) return;
    demarrer(async () => {
      setErreur(null);
      const r = await supprimerIdee({ ideeId: idee.id });
      if (!r.ok) setErreur(r.message);
    });
  };
  return (
    <section aria-labelledby="idees-studio" className="grid gap-2">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="idees-studio" className="m-0 text-lg">
            Idées gardées ({idees.length})
          </h2>
          <p className="m-0 text-sm text-neutre-700">
            Tournez-les quand vous voulez : aucun nouvel appel à l’IA.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Select
            aria-label="Format des vidéos"
            value={format}
            onChange={(e) => setFormat(e.target.value as FormatStudio)}
            className="w-auto"
          >
            {NOMS_FORMATS.map((f) => (
              <option key={f} value={f}>
                {FORMATS_STUDIO[f].libelle}
              </option>
            ))}
          </Select>
          <Checkbox checked={camera} onChange={(e) => setCamera(e.target.checked)}>
            Avec caméra
          </Checkbox>
        </div>
      </div>
      {erreur ? <Banner tone="danger">{erreur}</Banner> : null}
      <ul className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2 xl:grid-cols-3">
        {idees.map((i) => (
          <li
            key={i.id}
            className="grid content-start gap-2 rounded-card border border-trait bg-blanc p-3.5"
          >
            <div className="flex items-start justify-between gap-2">
              <strong>{i.sujet.titre}</strong>
              {i.sujet.potentielViral ? (
                <Badge tone={i.sujet.potentielViral >= 7 ? 'succes' : 'attention'}>
                  Viral {i.sujet.potentielViral}/10
                </Badge>
              ) : null}
            </div>
            <p className="m-0 text-sm">{i.sujet.angle}</p>
            {i.sujet.accroches[0] ? (
              <p className="m-0 text-sm text-neutre-700">« {i.sujet.accroches[0]} »</p>
            ) : null}
            <p className="m-0 text-xs text-neutre-700">
              {i.sujet.vuesVisees
                ? `${formatNombre(i.sujet.vuesVisees.min)} – ${formatNombre(i.sujet.vuesVisees.max)} vues visées · `
                : ''}
              {i.sujet.script.length} phrases de script
              {i.utilisations ? ` · tournée ${i.utilisations} fois` : ''}
            </p>
            {i.liens.length ? (
              <ul className="m-0 pl-4 text-xs">
                {i.liens.map((l) => (
                  <li key={l.lien}>
                    <a href={l.lien} target="_blank" rel="noopener noreferrer">
                      {l.titre} ↗
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button disabled={enCours} onClick={() => tourner(i.id)}>
                Tourner cette vidéo
              </Button>
              <Button variant="fantome" disabled={enCours} onClick={() => supprimer(i)}>
                Supprimer
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
