import { cn } from '@ph/ui';
import { DemoSiteVideos } from './DemoSiteVideos';
import { conteneur, titreFort } from './styles';

/** Site uniquement (LANDINGS §3.3) : « Regardez votre site se construire tout seul ». */
export function DemoCreation() {
  return (
    <section className="bg-neutre-100/40 py-[clamp(56px,7vw,90px)]">
      <div className={cn(conteneur, 'grid gap-[clamp(24px,3vw,36px)] text-center')}>
        <div className="mx-auto max-w-[720px]">
          <h2 className={cn(titreFort, 'text-[clamp(28px,3.6vw,44px)] leading-[1.1]')}>
            Regardez votre site se construire tout seul
          </h2>
          <p className="m-0 text-[17px] leading-[27px] text-neutre-700">
            L’IA crée votre site, vous le retouchez, vous le publiez, et les demandes de vos clients
            arrivent dans votre espace. Faites défiler pour voir chaque étape, filmée dans Portail
            Travaux.
          </p>
        </div>
        <DemoSiteVideos />
        <p className="m-0 mx-auto max-w-[60ch] text-[15.5px] leading-6 text-neutre-700">
          Rien n’est figé : textes, photos, couleurs, pages, tout se change en un clic, quand vous
          voulez.
        </p>
      </div>
    </section>
  );
}

const ATOUTS = [
  [
    'Plusieurs pages',
    'Accueil, prestations, réalisations, contact : ajoutez autant de pages que nécessaire.',
    'M4 4h10l6 6v10H4zM14 4v6h6',
  ],
  [
    'Éditeur visuel complet',
    'Cliquez sur un texte, une photo ou un bouton pour le modifier.',
    'M4 20h4L20 8l-4-4L4 16zM14 6l4 4',
  ],
  [
    'Site mobile automatiquement',
    'Votre site s’adapte au téléphone, avec un bouton d’appel visible.',
    'M8 2h8a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zM11 18h2',
  ],
  [
    'Référencement page par page',
    'Titre, description et adresse de chaque page, prêts pour Google.',
    'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4',
  ],
  [
    'Formulaire de devis intégré',
    'Chaque demande arrive dans votre espace avec les coordonnées du client.',
    'M4 4h16v16H4zM8 9h8M8 13h8M8 17h4',
  ],
  [
    'Statistiques des visites',
    'Visiteurs, pages vues et demandes reçues, sans cookie.',
    'M4 20V10M10 20V4M16 20v-7M22 20H2',
  ],
];

/** Site uniquement (LANDINGS §3.6) : « Pas une fiche annuaire. Un vrai site, à votre nom. » */
export function VraiSite() {
  return (
    <section className="bg-blanc py-[clamp(56px,7vw,96px)]">
      <div className={cn(conteneur, 'grid gap-[clamp(24px,3vw,36px)]')}>
        <h2 className={cn(titreFort, 'm-0 max-w-[20ch]')}>
          Pas une fiche annuaire. Un vrai site, à votre nom.
        </h2>
        <ul className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-x-[clamp(20px,3vw,40px)] gap-y-[clamp(20px,3vw,32px)] p-0">
          {ATOUTS.map(([t, l, d]) => (
            <li key={t} className="grid grid-cols-[44px_minmax(0,1fr)] items-start gap-3.5">
              <span className="flex size-11 items-center justify-center rounded-[12px] border border-accent-300 bg-accent-100 text-accent-700">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d={d} />
                </svg>
              </span>
              <span className="grid gap-1">
                <strong className="text-[17px] leading-[1.25]">{t}</strong>
                <span className="text-[15px] leading-[22px] text-neutre-700">{l}</span>
              </span>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
          <p className="m-0 text-[17px] leading-[26px] font-semibold">
            Laissez l’IA tout faire, ou reprenez la main sur chaque détail. Dans les deux cas, c’est
            gratuit.
          </p>
          <a
            href="#inscription"
            className="inline-flex min-h-12 items-center rounded-[10px] border-[1.5px] border-accent px-5 text-base font-bold text-accent-800 no-underline hover:bg-accent-100"
          >
            Créer gratuitement mon site
          </a>
        </div>
      </div>
    </section>
  );
}
