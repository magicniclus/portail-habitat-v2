import { LIBELLES_STATUT_STUDIO } from '@ph/core/studio';
import { formatEuros } from '@ph/core/format';
import { appAdmin } from '@ph/firebase/admin';
import { lireProjetStudio } from '@ph/firebase/studio';
import { Badge } from '@ph/ui';
import { getFirestore } from 'firebase-admin/firestore';
import type { Metadata, Route } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ConfigFirebase } from '@/features/firebase/ConfigFirebase';
import { EcouteProjet } from '@/features/studio/EcouteProjet';
import { EtapeEnregistrement } from '@/features/studio/EtapeEnregistrement';
import { EtapeExport } from '@/features/studio/EtapeExport';
import { EtapeMontage } from '@/features/studio/EtapeMontage';
import { EtapeSujets } from '@/features/studio/EtapeSujets';
import { SuiviTravail } from '@/features/studio/SuiviTravail';
import { TONS_STATUT } from '@/features/studio/tons';
import { pageAdmin } from '@/server/sessionAdmin';

export const metadata: Metadata = { title: 'Studio · vidéo' };
/** Proposer des sujets ou retoucher un montage : un appel à Claude peut durer plusieurs minutes. */
export const maxDuration = 300;

export default async function ProjetStudioPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const analyse = (await searchParams).analyse === '1';
  await pageAdmin(`/admin/studio/${id}`, 'studio');
  const p = await lireProjetStudio(getFirestore(appAdmin()), id);
  if (!p) notFound();
  const apresSujet = p.statut !== 'sujet';
  return (
    <main className="grid min-w-0 content-start gap-5 px-[clamp(16px,3vw,32px)] py-[clamp(20px,3vw,32px)]">
      <ConfigFirebase />
      <EcouteProjet statut={p.statut} />
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <Link href={'/admin/studio' as Route} className="text-sm">
            ← Toutes les vidéos
          </Link>
          <h1 className="m-0 mt-1 text-[clamp(24px,3vw,30px)]">{p.titre}</h1>
        </div>
        <p className="m-0 flex items-center gap-2 text-sm text-neutre-700">
          <Badge tone={TONS_STATUT[p.statut]}>{LIBELLES_STATUT_STUDIO[p.statut]}</Badge>
          {formatEuros(p.coutCentimes, { decimales: 'toujours' })} de Claude
        </p>
      </header>
      <EtapeSujets
        projetId={p.id}
        sujets={p.sujets}
        choisi={p.sujet}
        themeInitial={p.theme ?? ''}
        replie={apresSujet}
        auto={analyse && p.statut === 'sujet'}
        tendances={p.tendances}
      />
      {apresSujet ? (
        <EtapeEnregistrement
          projetId={p.id}
          script={p.sujet?.script ?? []}
          cameraPrevue={p.camera}
          dejaEnregistre={Boolean(p.prise)}
        />
      ) : null}
      {p.prise ? <SuiviTravail projetId={p.id} statut={p.statut} erreur={p.erreur} /> : null}
      {p.plan && p.prise ? (
        <EtapeMontage
          projetId={p.id}
          plan={p.plan}
          prise={p.prise.fichiers}
          captures={p.captures}
          mots={p.mots}
          camera={p.camera}
        />
      ) : null}
      {p.rendu ? <EtapeExport rendu={p.rendu} sujet={p.sujet} /> : null}
    </main>
  );
}
