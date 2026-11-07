import { bouton, cn } from '@ph/ui';
import { conteneur } from './styles';

const TUILES = [
  {
    titre: 'Demandes de travaux',
    texte:
      'Des particuliers de votre secteur décrivent leur projet. Vous choisissez ceux qui vous intéressent.',
    d: 'M4 6h16v10H9l-5 3V6z',
  },
  {
    titre: 'Visibilité sur le portail',
    texte:
      'Votre fiche apparaît quand un client cherche un artisan de votre métier près de chez lui.',
    d: 'M12 21s7-6.2 7-11.5a7 7 0 0 0-14 0C5 14.8 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  },
  {
    titre: 'Site internet',
    texte: 'Un vrai site à votre nom, créé avec l’IA, modifiable en un clic.',
    d: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z',
  },
  {
    titre: 'Avis clients',
    texte: 'Vous demandez un avis après chaque chantier et vous répondez depuis votre espace.',
    d: 'M4 5h16v11H9l-5 4zM8 10h8M8 13h5',
  },
  {
    titre: 'Devis et factures',
    texte: 'Modèles par métier, mentions vérifiées, signature en ligne et relances.',
    d: 'M7 3h7l4 4v14H7zM14 3v4h4M10 12h5M10 16h5',
  },
  {
    titre: 'Suivi clients',
    texte: 'Chaque client et chaque chantier au même endroit, du premier appel à la facture.',
    d: 'M4 4h16v16H4zM4 9h16M9 4v16',
  },
];

/** Bloc final Portail Travaux (maquette : fond bleu nuit, 6 tuiles) et appel vers le formulaire. */
export function AppelFinal({ titre, cta }: { titre: string; cta: string }) {
  return (
    <section
      data-formulaire-landing
      className="relative overflow-hidden bg-nuit py-[clamp(64px,8vw,120px)] text-blanc"
      style={{
        backgroundImage:
          'radial-gradient(circle at 88% 110%, color-mix(in srgb, var(--accent) 42%, transparent) 0, transparent 42%), radial-gradient(circle at 0% 0%, color-mix(in srgb, var(--color-blanc) 7%, transparent) 0, transparent 38%), radial-gradient(color-mix(in srgb, var(--color-blanc) 7%, transparent) 1px, transparent 1.2px)',
        backgroundSize: 'auto, auto, 22px 22px',
      }}
    >
      <div
        className={cn(
          conteneur,
          'relative grid items-center gap-[clamp(40px,6vw,72px)] min-[900px]:grid-cols-2',
        )}
      >
        <div className="grid min-w-0 justify-items-start gap-[22px]">
          <span className="inline-flex items-center gap-2 rounded-pill border border-blanc/20 bg-blanc/10 px-3.5 py-[7px] text-[13px] font-bold whitespace-nowrap uppercase tracking-[0.06em]">
            <span aria-hidden="true" className="size-2 rounded-full bg-accent" />
            Portail Travaux
          </span>
          <h2 className="m-0 max-w-[18ch] text-[clamp(34px,4.6vw,58px)] leading-[1.04] tracking-[-0.025em] text-blanc">
            {titre}
          </h2>
          <p className="m-0 max-w-[44ch] text-[clamp(17px,1.6vw,19px)] leading-[1.55] text-blanc/90">
            Portail Travaux met en relation les particuliers et les artisans du bâtiment. En
            rejoignant le réseau, vous recevez des demandes de travaux et vous profitez de tous nos
            outils, gratuitement.
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-5 gap-y-3.5">
            <a
              href="#inscription"
              data-cta-final
              className={bouton({ taille: 'lg', className: 'min-h-[52px] px-7 text-[17px]' })}
            >
              {cta}
            </a>
            <span className="text-sm text-blanc/80">Sans abonnement · Sans carte bancaire</span>
          </div>
        </div>
        <ul className="m-0 grid min-w-0 list-none grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-3.5 p-0">
          {TUILES.map((t) => (
            <li
              key={t.titre}
              className="grid content-start gap-2.5 rounded-[12px] border border-blanc/15 bg-blanc/5 p-5"
            >
              <span className="flex size-10 items-center justify-center rounded-[10px] bg-accent">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d={t.d} />
                </svg>
              </span>
              <span className="text-[17px] leading-[1.25] font-bold">{t.titre}</span>
              <span className="text-[14.5px] leading-[21px] text-blanc/80">{t.texte}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
