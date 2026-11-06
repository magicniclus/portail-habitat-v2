'use client';

import type { SujetStudio } from '@ph/core/studio';
import type { ProjetStudio, TendanceAffichee } from '@ph/firebase/studio';
import { Banner, Button, Chargeur, Field, Input } from '@ph/ui';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { choisirSujet, declinerSujet, garderIdee, proposerSujets } from './actions';
import { CarteSujet } from './CarteSujet';
import { ListeReels } from './ListeReels';
import { TableTendances } from './TableTendances';

/** Étape 1 : Claude analyse les vidéos courtes qui marchent et propose des sujets avec script. */
export function EtapeSujets({
  projetId,
  sujets,
  choisi,
  themeInitial,
  replie,
  auto = false,
  tendances,
  reels,
  titresGardes,
}: {
  projetId: string;
  sujets: SujetStudio[];
  choisi: SujetStudio | null;
  themeInitial: string;
  replie: boolean;
  /** Arrivée depuis « Trouver les meilleures vidéos » : l'analyse part toute seule. */
  auto?: boolean;
  tendances: TendanceAffichee[];
  reels: ProjetStudio['reels'];
  /** Titres des idées déjà gardées (en minuscules). */
  titresGardes: string[];
}) {
  const router = useRouter();
  const liens = new Map(tendances.flatMap((t) => (t.lien ? [[t.titre, t.lien] as const] : [])));
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
    <details open={!replie} className="rounded-card border border-trait bg-blanc p-4">
      <summary className="min-h-11 cursor-pointer text-lg font-bold">
        1. Idées de vidéos {choisi ? `· ${choisi.titre}` : ''}
      </summary>
      <div className="mt-3 grid gap-3">
        <div className="grid items-end gap-3 md:grid-cols-[1fr_auto]">
          <Field label="Orienter vers un thème (facultatif)">
            <Input
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="Ex. les demandes gratuites"
            />
          </Field>
          <Button
            disabled={enCours}
            onClick={() =>
              agir(() => proposerSujets({ projetId, theme: theme.trim() || undefined }))
            }
          >
            {enCours
              ? 'Claude analyse les tendances…'
              : sujets.length
                ? 'Proposer d’autres sujets'
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
        {tendances.length ? <TableTendances tendances={tendances} /> : null}
        {reels.length ? <ListeReels reels={reels} /> : null}
        <ul className="m-0 grid list-none gap-3 p-0 xl:grid-cols-3">
          {sujets.map((s, i) => (
            <CarteSujet
              key={`${i}-${s.titre}`}
              sujet={s}
              choisi={choisi?.titre === s.titre}
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
        <div>
          <Button
            variant="secondaire"
            disabled={enCours}
            onClick={() => agir(() => choisirSujet({ projetId, index: null }))}
          >
            Enregistrer sans sujet (j’improvise)
          </Button>
        </div>
      </div>
    </details>
  );
}
