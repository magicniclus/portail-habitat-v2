import { peut } from '@ph/core/equipe';
import { formatNombre } from '@ph/core/format';
import { appAdmin } from '@ph/firebase/admin';
import { encartAffiche, type CleEncart } from '@ph/core/paiements';
import {
  lireAvisPro,
  lireDocumentsPro,
  lireEncartsMasques,
  lireFichePro,
  lireRealisationsPro,
} from '@ph/firebase/pro';
import { bouton } from '@ph/ui';
import { getFirestore } from 'firebase-admin/firestore';
import type { Metadata, Route } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ConfigFirebase } from '@/features/firebase/ConfigFirebase';
import { Documents } from '@/features/fichePro/Documents';
import { ApercuParticulier } from '@/features/fichePro/ApercuParticulier';
import { Banniere } from '@/features/fichePro/Banniere';
import { TexteAPropos } from '@/features/fichePro/APropos';
import { CarteFiche } from '@/features/fichePro/CarteFiche';
import { Certifications } from '@/features/fichePro/Certifications';
import { CarteZoneFiche } from '@/features/fichePro/CarteZoneFiche';
import { DerniersAvis } from '@/features/fichePro/DerniersAvis';
import { EnTeteFiche } from '@/features/fichePro/EnTeteFiche';
import { InfosFiche } from '@/features/fichePro/InfosFiche';
import { ProgressionFiche } from '@/features/fichePro/ProgressionFiche';
import { ResumeAvis } from '@/features/fichePro/ResumeAvis';
import { VideoPresentation } from '@/features/fichePro/VideoPresentation';
import { Realisations } from '@/features/fichePro/Realisations';
import { EncartOffre } from '@/features/offres/EncartOffre';
import { EditionPresentation, EditionZone } from '@/features/fichePro/EditionsFiche';
import { routes } from '@/lib/routes';
import { sessionPro } from '@/server/sessionPro';
import { maintenant } from '@/server/temps';

export const metadata: Metadata = { title: 'Ma fiche', robots: { index: false } };

/** Maquette Ma Fiche : la fiche publique, modifiable bloc par bloc, et l'aperçu côté particulier. */
export default async function PageMaFiche() {
  const s = await sessionPro(routes.proFiche);
  const active = s.espace.active;
  if (!active || active.membre.role === 'comptable') redirect(routes.proTableauDeBord);
  const db = getFirestore(appAdmin());
  const [f, documents, realisations, masques, avis] = await Promise.all([
    lireFichePro(db, active.artisanId),
    lireDocumentsPro(db, active.artisanId),
    lireRealisationsPro(db, active.artisanId),
    lireEncartsMasques(db, s.uid),
    lireAvisPro(db, active.artisanId, 50),
  ]);
  if (!f) redirect(routes.proTableauDeBord);
  const edite = peut(active.membre, 'fiche.modifier');
  const instant = maintenant();
  // Un seul encart d'offre par écran (PAIEMENTS §4) : numéro masqué d'abord, puis 5 projets.
  const encartPour = (cle: CleEncart) =>
    peut(active.membre, 'abonnement.gerer')
      ? encartAffiche({
          cle,
          formule: active.artisan.formule,
          masques,
          enLigne: f.enLigne,
          maintenant: instant,
        })
      : null;
  const offreCoordonnees = encartPour('coordonnees');
  const offreRealisations =
    !offreCoordonnees && realisations.length >= 5 ? encartPour('realisations') : null;
  const note = avis.length
    ? formatNombre(avis.reduce((t, a) => t + a.note, 0) / avis.length, 1)
    : null;
  return (
    <main className="grid gap-5 px-[clamp(16px,3vw,32px)] pt-[clamp(20px,3vw,32px)] pb-12">
      <ConfigFirebase />
      {f.enLigne ? null : <ProgressionFiche pourcent={f.completude.pourcent} />}
      {f.enLigne ? (
        <Link
          href={`/artisans/${f.slug}` as Route}
          className={bouton({ variant: 'secondaire', className: 'justify-self-end' })}
        >
          Voir ma fiche publique
        </Link>
      ) : null}
      {edite ? null : (
        <p className="m-0 rounded-md bg-neutre-100 p-3 text-sm">
          Seuls le propriétaire et le gérant peuvent modifier la fiche.
        </p>
      )}
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)]">
        <div className="grid min-w-0 gap-5">
          <EnTeteFiche
            artisanId={active.artisanId}
            nom={f.nomCommercial}
            enLigne={f.enLigne}
            metiers={f.metiers}
            modifiable={edite}
            {...(f.logoUrl ? { logoUrl: f.logoUrl } : {})}
            banniere={
              <Banniere
                artisanId={active.artisanId}
                modifiable={edite}
                {...(f.banniereUrl ? { banniereUrl: f.banniereUrl } : {})}
              />
            }
          />
          <ResumeAvis note={note} nombre={avis.length} />
          <CarteFiche
            titre="À propos"
            action={
              edite ? <EditionPresentation pitch={f.pitch} description={f.description} /> : null
            }
          >
            <TexteAPropos pitch={f.pitch} description={f.description} />
          </CarteFiche>
          <InfosFiche f={f} edite={edite} />
          <Certifications
            labels={f.certifications}
            ajout={peut(active.membre, 'documents.televerser')}
          />
          <CarteFiche titre="Documents et assurances" id="documents">
            <Documents
              artisanId={active.artisanId}
              documents={documents}
              peutDeposer={peut(active.membre, 'documents.televerser')}
            />
          </CarteFiche>
          <CarteFiche titre="Zone d'intervention">
            <CarteZoneFiche centre={f.zone.centre} rayonKm={f.zone.rayonKm} />
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-pill border border-trait px-3.5 py-1.5 text-sm font-semibold">
                {f.ville ? `${f.ville}, ` : ''}
                {f.zone.rayonKm} km
              </span>
              {edite ? <EditionZone zone={f.zone} /> : null}
            </div>
          </CarteFiche>
          <VideoPresentation
            artisanId={active.artisanId}
            modifiable={edite}
            {...(f.videoUrl ? { videoUrl: f.videoUrl } : {})}
          />
          <CarteFiche
            titre="Projets réalisés"
            sousTitre="Vos dernières réalisations, visibles par les particuliers."
          >
            <Realisations
              artisanId={active.artisanId}
              realisations={realisations}
              peutModifier={peut(active.membre, 'realisations.modifier')}
            />
            {offreRealisations ? (
              <EncartOffre cle="realisations" offre={offreRealisations} />
            ) : null}
          </CarteFiche>
          <DerniersAvis avis={avis} note={note} />
        </div>
        <ApercuParticulier
          encart={
            offreCoordonnees ? <EncartOffre cle="coordonnees" offre={offreCoordonnees} /> : null
          }
        />
      </div>
    </main>
  );
}
