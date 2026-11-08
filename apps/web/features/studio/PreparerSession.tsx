'use client';

import type { IdeeStudio } from '@ph/firebase/studio';
import { Banner, Button, Chargeur, Checkbox } from '@ph/ui';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { ideesSession, tournerIdee } from './actions';
import type { VideoATourner } from './SessionTournage';
import { ThemesSession, type ThemeSession } from './ThemesSession';

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
  const [themes, setThemes] = useState<ThemeSession[]>([{ theme: '', nombre: 5 }]);
  const [progression, setProgression] = useState<string | null>(null);
  const total = themes.reduce((n, x) => n + x.nombre, 0);
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
        <ThemesSession themes={themes} onChange={setThemes} desactive={enCours} />
        <div className="flex flex-wrap items-center gap-3">
          <Button
            disabled={enCours || !total}
            aria-busy={enCours && action === 'idees'}
            onClick={() => {
              setAction('idees');
              demarrer(async () => {
                setErreur(null);
                // Un appel à Claude par thème, l'un après l'autre (progression affichée).
                for (const [k, x] of themes.entries()) {
                  setProgression(`Thème ${k + 1} sur ${themes.length} : Claude écrit les scripts…`);
                  const r = await ideesSession({
                    nombre: x.nombre,
                    format: 'vertical',
                    theme: x.theme.trim() || undefined,
                  });
                  if (!r.ok) {
                    setErreur(r.message);
                    break;
                  }
                }
                setProgression(null);
                router.refresh();
              });
            }}
          >
            {enCours && action === 'idees' ? <Chargeur taille="xs" ton="courant" decoratif /> : '✦'}
            Trouver les idées ({total} vidéo{total > 1 ? 's' : ''})
          </Button>
          {progression ? (
            <span className="text-sm text-neutre-700" aria-live="polite">
              {progression}
            </span>
          ) : null}
        </div>
        <p className="m-0 text-sm text-neutre-700">
          Un appel à Claude par thème, jusqu’à 10 vidéos chacun, chacune avec une accroche
          différente ; chaque idée devient une vidéo avec son script en prompteur.
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
