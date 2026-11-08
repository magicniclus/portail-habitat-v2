'use client';

import type { IdeeStudio } from '@ph/firebase/studio';
import { Banner, Button, Chargeur, Checkbox, Field, Input, Select } from '@ph/ui';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { ideesSession, tournerIdee } from './actions';
import type { VideoATourner } from './SessionTournage';

/**
 * Préparer une session de tournage : des idées de Claude d'un coup (un seul appel), ou les idées
 * gardées ; puis cocher les vidéos à tourner à la suite.
 */
export function PreparerSession(p: {
  aTourner: VideoATourner[];
  idees: IdeeStudio[];
  onCommencer: (videos: VideoATourner[]) => void;
}) {
  const router = useRouter();
  const [theme, setTheme] = useState('');
  const [nombre, setNombre] = useState(5);
  const [exclues, setExclues] = useState<ReadonlySet<string>>(new Set());
  const [erreur, setErreur] = useState<string | null>(null);
  const [action, setAction] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();
  const agir = (quoi: string, f: () => Promise<{ ok: boolean; message?: string }>) => {
    setAction(quoi);
    demarrer(async () => {
      setErreur(null);
      const r = await f();
      if (!r.ok) setErreur(r.message ?? 'Action impossible.');
      else router.refresh();
    });
  };
  const choisies = p.aTourner.filter((v) => !exclues.has(v.id));
  return (
    <div className="grid gap-6">
      <section
        aria-labelledby="session-idees"
        className="grid gap-3 rounded-card border border-trait bg-blanc p-4"
      >
        <h2 id="session-idees" className="m-0 text-lg">
          1. Des idées à tourner
        </h2>
        <div className="grid items-end gap-3 md:grid-cols-[1fr_160px_auto]">
          <Field label="Thème (facultatif)">
            <Input
              value={theme}
              maxLength={200}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="Ex. les demandes gratuites, le devis en 2 minutes"
            />
          </Field>
          <Field label="Combien">
            <Select value={nombre} onChange={(e) => setNombre(Number(e.target.value))}>
              {[3, 5, 8].map((n) => (
                <option key={n} value={n}>
                  {n} idées
                </option>
              ))}
            </Select>
          </Field>
          <Button
            disabled={enCours}
            aria-busy={enCours && action === 'idees'}
            onClick={() =>
              agir('idees', () =>
                ideesSession({ nombre, format: 'vertical', theme: theme.trim() || undefined }),
              )
            }
          >
            {enCours && action === 'idees' ? <Chargeur taille="xs" ton="courant" decoratif /> : '✦'}
            {enCours && action === 'idees' ? 'Claude écrit les scripts…' : 'Trouver les idées'}
          </Button>
        </div>
        <p className="m-0 text-sm text-neutre-700">
          Un seul appel à Claude pour toutes les idées : chacune devient une vidéo avec son script
          en prompteur.
        </p>
        {p.idees.length ? (
          <details className="text-sm">
            <summary className="flex min-h-11 cursor-pointer items-center font-semibold">
              Idées gardées ({p.idees.length})
            </summary>
            <ul className="m-0 grid list-none gap-2 p-0">
              {p.idees.map((i) => (
                <li key={i.id} className="flex flex-wrap items-center justify-between gap-2">
                  <span>{i.sujet.titre}</span>
                  <Button
                    variant="secondaire"
                    taille="sm"
                    disabled={enCours}
                    onClick={() =>
                      agir(i.id, () =>
                        tournerIdee({ ideeId: i.id, format: 'vertical', camera: true }),
                      )
                    }
                  >
                    {enCours && action === i.id ? 'Ajout…' : 'Ajouter à la session'}
                  </Button>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
        {erreur ? <Banner tone="danger">{erreur}</Banner> : null}
      </section>

      <section
        aria-labelledby="session-liste"
        className="grid gap-3 rounded-card border border-trait bg-blanc p-4"
      >
        <h2 id="session-liste" className="m-0 text-lg">
          2. Vidéos à tourner
        </h2>
        {p.aTourner.length ? (
          <ul className="m-0 grid list-none gap-1 p-0">
            {p.aTourner.map((v) => (
              <li key={v.id}>
                <Checkbox
                  checked={!exclues.has(v.id)}
                  onChange={(e) =>
                    setExclues((x) => {
                      const n = new Set(x);
                      if (e.target.checked) n.delete(v.id);
                      else n.add(v.id);
                      return n;
                    })
                  }
                >
                  {v.titre} · {v.script.length} phrases
                </Checkbox>
              </li>
            ))}
          </ul>
        ) : (
          <p className="m-0 text-sm text-neutre-700">
            Aucune vidéo à tourner : trouvez des idées ci-dessus.
          </p>
        )}
        <div>
          <Button taille="lg" disabled={!choisies.length} onClick={() => p.onCommencer(choisies)}>
            ● Commencer la session ({choisies.length} vidéo{choisies.length > 1 ? 's' : ''})
          </Button>
        </div>
        <p className="m-0 text-sm text-neutre-700">
          Vous tournez les vidéos à la suite, face caméra, le script en prompteur. Chaque prise part
          dans sa vidéo et Claude la monte pendant que vous tournez la suivante.
        </p>
      </section>
    </div>
  );
}
