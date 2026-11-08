'use client';

import type { SujetStudio } from '@ph/core/studio';
import type { ProjetStudio, TendanceAffichee } from '@ph/firebase/studio';
import { Banner, Button, Chargeur, Field, Input } from '@ph/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { choisirSujet, declinerSujet, garderIdee, proposerSujets } from './actions';
import { CarteSujet, cleTitre } from './CarteSujet';
import { ListeReels } from './ListeReels';
import { TableTendances } from './TableTendances';

/** Étape 1 : Claude analyse les vidéos courtes qui marchent et propose des sujets avec script. */
export function EtapeSujets({
  projetId,
  sujets,
  choisi,
  themeInitial,
  auto = false,
  tendances,
  reels,
  titresGardes,
}: {
  projetId: string;
  sujets: SujetStudio[];
  choisi: SujetStudio | null;
  themeInitial: string;
  /** Arrivée depuis « Trouver les meilleures vidéos » : l'analyse part toute seule. */
  auto?: boolean;
  tendances: TendanceAffichee[];
  reels: ProjetStudio['reels'];
  /** Titres des idées déjà gardées (en minuscules). */
  titresGardes: string[];
}) {
  const router = useRouter();
  const liens = new Map(
    tendances.flatMap((t) => (t.lien ? [[cleTitre(t.titre), t.lien] as const] : [])),
  );
  const [succes, setSucces] = useState<string | null>(null);
  const [theme, setTheme] = useState(themeInitial);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();
  const agir = (f: () => Promise<{ ok: boolean; message?: string }>) =>
    demarrer(async () => {
      setErreur(null);
      const r = await f();
      if (!r.ok) setErreur(r.message ?? 'Action impossible.');
    });
  const lance = useRef(false);
  useEffect(() => {
    if (!auto || sujets.length || lance.current) return;
    lance.current = true;
    agir(() => proposerSujets({ projetId, theme: themeInitial || undefined }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- une seule fois à l'arrivée
  }, []);
  return (
    <section aria-labelledby="etape-idees" className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="etape-idees" className="m-0 text-xl">
          {choisi ? `Idée choisie : ${choisi.titre}` : 'Choisissez l’idée de la vidéo'}
        </h2>
        {choisi ? (
          <Link
            href={`/admin/studio/${projetId}/montage` as Route}
            className="inline-flex min-h-11 items-center gap-2 rounded-control bg-neutre-900 px-5 font-bold text-blanc no-underline hover:bg-neutre-800 hover:text-blanc"
          >
            Ouvrir dans le Studio →
          </Link>
        ) : null}
      </div>
      <div className="grid items-end gap-3 rounded-card border border-trait bg-blanc p-4 md:grid-cols-[1fr_auto]">
        <Field label="Orienter vers un thème (facultatif)">
          <Input
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            placeholder="Ex. les demandes gratuites"
          />
        </Field>
        <Button
          disabled={enCours}
          onClick={() => agir(() => proposerSujets({ projetId, theme: theme.trim() || undefined }))}
        >
          {enCours
            ? 'Claude analyse les tendances…'
            : sujets.length
              ? 'Proposer d’autres idées'
              : 'Analyser les tendances et proposer'}
        </Button>
      </div>
      {enCours ? (
        <p className="m-0 flex items-center gap-2 text-sm text-neutre-700" aria-live="polite">
          <Chargeur taille="sm" />
          Claude analyse les vidéos courtes qui percent en ce moment (vues, engagement, vues par
          rapport aux abonnés), puis écrit ses propositions : une à deux minutes.
        </p>
      ) : null}
      {erreur ? <Banner tone="danger">{erreur}</Banner> : null}
      {succes ? <Banner tone="succes">{succes}</Banner> : null}
      {tendances.length || reels.length ? (
        <details className="rounded-card border border-trait bg-blanc px-4 py-1 open:pb-4">
          <summary className="flex min-h-11 cursor-pointer items-center font-semibold">
            Ce qui marche en ce moment ({tendances.length + reels.length})
          </summary>
          <div className="mt-2 grid gap-3">
            {tendances.length ? <TableTendances tendances={tendances} /> : null}
            {reels.length ? <ListeReels reels={reels} /> : null}
          </div>
        </details>
      ) : null}
      {sujets.length ? (
        <p className="m-0 text-sm text-neutre-700">
          Choisissez <strong>une</strong> idée : le Studio s’ouvre ensuite pour tourner et monter. ☆
          garde une idée pour plus tard.
        </p>
      ) : null}
      <ul className="m-0 grid list-none gap-4 p-0 xl:grid-cols-2">
        {sujets.map((s, i) => (
          <CarteSujet
            key={`${i}-${s.titre}`}
            sujet={s}
            choisi={choisi?.titre === s.titre}
            autreChoisi={Boolean(choisi) && choisi?.titre !== s.titre}
            desactive={enCours}
            liens={liens}
            onChoisir={() => agir(() => choisirSujet({ projetId, index: i }))}
            gardee={titresGardes.includes(s.titre.trim().toLowerCase())}
            onGarder={() => agir(() => garderIdee({ projetId, index: i }))}
            onDecliner={(nombre) =>
              agir(async () => {
                setSucces(null);
                const r = await declinerSujet({ projetId, index: i, nombre });
                if (r.ok) {
                  setSucces(
                    r.data.length > 1
                      ? `${r.data.length} vidéos créées, prêtes à tourner.`
                      : 'Variante créée, prête à tourner.',
                  );
                  router.push('/admin/studio' as Route);
                }
                return r;
              })
            }
          />
        ))}
      </ul>
      {choisi ? null : (
        <div>
          <Button
            variant="fantome"
            disabled={enCours}
            onClick={() => agir(() => choisirSujet({ projetId, index: null }))}
          >
            Aller au Studio sans idée (j’improvise) →
          </Button>
        </div>
      )}
    </section>
  );
}
