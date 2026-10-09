import { peut } from '@ph/core/equipe';
import { formatFourchette, formatTel } from '@ph/core/format';
import { appAdmin } from '@ph/firebase/admin';
import { lireDocumentsPro, lireFichePro, lireRealisationsPro } from '@ph/firebase/pro';
import { bouton } from '@ph/ui';
import { getFirestore } from 'firebase-admin/firestore';
import type { Metadata, Route } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { CarteCompletude } from '@/features/espacePro/BlocsTableauDeBord';
import { ConfigFirebase } from '@/features/firebase/ConfigFirebase';
import { Documents } from '@/features/fichePro/Documents';
import { Logo } from '@/features/fichePro/Logo';
import { Realisations } from '@/features/fichePro/Realisations';
import {
  EditionCoordonnees,
  EditionDevis,
  EditionPresentation,
  EditionZone,
} from '@/features/fichePro/EditionsFiche';
import { routes } from '@/lib/routes';
import { sessionPro } from '@/server/sessionPro';

export const metadata: Metadata = { title: 'Ma fiche', robots: { index: false } };

function Section({
  titre,
  action,
  children,
}: {
  titre: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      aria-label={titre}
      className="grid content-start gap-3 rounded-2xl border border-trait p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="m-0 text-xl">{titre}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

const vide = (texte: string) => <p className="m-0 text-sm text-neutre-700">{texte}</p>;

/** Maquette Ma Fiche : la fiche publique, modifiable section par section. */
export default async function PageMaFiche() {
  const s = await sessionPro(routes.proFiche);
  const active = s.espace.active;
  if (!active || active.membre.role === 'comptable') redirect(routes.proTableauDeBord);
  const db = getFirestore(appAdmin());
  const [f, documents, realisations] = await Promise.all([
    lireFichePro(db, active.artisanId),
    lireDocumentsPro(db, active.artisanId),
    lireRealisationsPro(db, active.artisanId),
  ]);
  if (!f) redirect(routes.proTableauDeBord);
  const edite = peut(active.membre, 'fiche.modifier');
  return (
    <main className="grid gap-5 px-[clamp(16px,3vw,32px)] pt-[clamp(20px,3vw,32px)] pb-12">
      <ConfigFirebase />
      {edite ? (
        <Logo
          artisanId={active.artisanId}
          nom={f.nomCommercial}
          {...(f.logoUrl ? { logoUrl: f.logoUrl } : {})}
        />
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 basis-[min(100%,420px)] grow">
          <h1 className="m-0 mb-1.5 text-[clamp(26px,3vw,34px)] leading-[1.1]">
            {f.nomCommercial}
          </h1>
          <p className="m-0 text-base text-neutre-800">
            {f.enLigne
              ? 'Votre fiche est en ligne : les modifications y apparaissent en quelques minutes.'
              : 'Votre fiche est hors ligne : complétez-la pendant que nous vérifions vos documents.'}
          </p>
        </div>
        {f.enLigne ? (
          <Link href={`/artisans/${f.slug}` as Route} className={bouton({ variant: 'secondaire' })}>
            Voir ma fiche publique
          </Link>
        ) : null}
      </div>
      {edite ? null : (
        <p className="m-0 rounded-md bg-neutre-100 p-3 text-sm">
          Seuls le propriétaire et le gérant peuvent modifier la fiche.
        </p>
      )}
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="grid gap-5">
          <Section
            titre="Présentation"
            action={
              edite ? <EditionPresentation pitch={f.pitch} description={f.description} /> : null
            }
          >
            {f.pitch ? <p className="m-0 font-semibold">{f.pitch}</p> : null}
            {f.description ? (
              <p className="m-0 text-[15px] leading-[24px] whitespace-pre-line">{f.description}</p>
            ) : (
              vide('Présentez votre entreprise : savoir-faire, chantiers, équipe.')
            )}
          </Section>
          <Section titre="Informations" action={edite ? <EditionCoordonnees {...f} /> : null}>
            <dl className="m-0 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-[15px]">
              <dt className="font-semibold">Téléphone</dt>
              <dd className="m-0">{f.telephonePublic ? formatTel(f.telephonePublic) : '—'}</dd>
              <dt className="font-semibold">Email</dt>
              <dd className="m-0 break-all">{f.emailContact ?? '—'}</dd>
              <dt className="font-semibold">Site</dt>
              <dd className="m-0 break-all">{f.siteWeb ?? '—'}</dd>
            </dl>
          </Section>
          <Section titre="Projets réalisés">
            <Realisations
              artisanId={active.artisanId}
              realisations={realisations}
              peutModifier={peut(active.membre, 'realisations.modifier')}
            />
          </Section>
        </div>
        <div className="grid gap-5">
          <CarteCompletude c={f.completude} />
          <Section
            titre="Devis moyen"
            action={edite ? <EditionDevis {...(f.devis ? { devis: f.devis } : {})} /> : null}
          >
            {f.devis ? (
              <p className="m-0 text-xl font-bold">
                {formatFourchette(f.devis.minCentimes, f.devis.maxCentimes)}
              </p>
            ) : (
              vide('Non renseigné.')
            )}
          </Section>
          <Section
            titre="Zone d'intervention"
            action={edite ? <EditionZone zone={f.zone} /> : null}
          >
            <p className="m-0 text-[15px]">
              Rayon de <strong>{f.zone.rayonKm} km</strong>
              {f.ville ? ` · siège à ${f.ville}` : ''}
            </p>
          </Section>
          <Section titre="Documents et assurances">
            <Documents
              artisanId={active.artisanId}
              documents={documents}
              peutDeposer={peut(active.membre, 'documents.televerser')}
            />
          </Section>
        </div>
      </div>
    </main>
  );
}
