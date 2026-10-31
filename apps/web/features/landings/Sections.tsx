import {
  decouperGras,
  OUTILS_INCLUS,
  type AvisLanding,
  type ContenuLanding,
  type preuveSociale,
} from '@ph/core/landings';
import { initiales } from '@ph/core/format';
import { bouton, cn, Logo } from '@ph/ui';
import Link from 'next/link';
import { routes } from '@/lib/routes';
import { CaptureEcran } from './CaptureEcran';
import { IconeLanding } from './IconeLanding';

export const conteneur = 'mx-auto w-full max-w-[1240px] px-[clamp(16px,4vw,44px)]';
export const bande = 'py-[clamp(48px,6vw,88px)]';
export const titre2 = 'm-0 mb-3 text-[clamp(28px,3.4vw,40px)] leading-[1.12]';
const surtitre = 'mb-2 block text-[13px] font-bold uppercase tracking-wide text-accent-700';

/** En-tête des landings : bandeau, logo et « Espace pro » ; aucun bouton orange (LAND-02). */
export function EnTeteLanding() {
  return (
    <>
      <p className="m-0 bg-accent-900 px-5 py-[9px] text-center text-[13.5px] font-semibold text-blanc">
        100 % gratuit · Sans carte bancaire
      </p>
      <header className="border-b border-trait bg-fond">
        <div className={cn(conteneur, 'flex min-h-14 items-center justify-between py-2')}>
          <Link href={routes.pro} className="flex min-h-11 items-center text-texte no-underline">
            <Logo variant="pro" taille={32} />
          </Link>
          <Link
            href={routes.connexionPro}
            className={bouton({ variant: 'secondaire', className: 'text-[15px]' })}
          >
            Espace pro
          </Link>
        </div>
      </header>
    </>
  );
}

export function SousTitre({ texte }: { texte: string }) {
  return (
    <p className="m-0 mb-5 max-w-[58ch] text-lg leading-[29px] text-neutre-800">
      {decouperGras(texte).map((s, i) =>
        s.gras ? (
          <strong key={i} className="text-texte">
            {s.texte}
          </strong>
        ) : (
          <span key={i}>{s.texte}</span>
        ),
      )}
    </p>
  );
}

export function Vitrine({ v }: { v: ContenuLanding['vitrine'] }) {
  return (
    <section className={cn(bande, 'bg-neutre-100')}>
      <div className={cn(conteneur, 'grid gap-10')}>
        <div className="max-w-[60ch]">
          <span className={surtitre}>{v.surtitre}</span>
          <h2 className={titre2}>{v.titre}</h2>
          <p className="m-0 mb-4 text-[17px] leading-[27px] text-neutre-800">{v.texte}</p>
          <ul className="m-0 flex list-none flex-wrap gap-x-5 gap-y-2 p-0 text-[15px]">
            {v.points.map((p) => (
              <li key={p} className="flex gap-2">
                <span aria-hidden="true" className="font-bold text-accent-700">
                  ✓
                </span>
                {p}
              </li>
            ))}
          </ul>
        </div>
        <div className="grid items-end gap-6 min-[760px]:grid-cols-[minmax(0,1fr)_220px]">
          <CaptureEcran capture={v.grand} cadre="navigateur" />
          <CaptureEcran capture={v.tel} cadre="telephone" className="mx-auto w-[min(220px,60vw)]" />
        </div>
      </div>
    </section>
  );
}

export function CommentCaMarche({ etapes }: { etapes: ContenuLanding['etapes'] }) {
  return (
    <section className={bande}>
      <div className={cn(conteneur, 'grid gap-10 min-[900px]:grid-cols-[0.8fr_1.2fr]')}>
        <div>
          <span className={surtitre}>En 3 étapes</span>
          <h2 className={titre2}>Comment ça marche</h2>
          <p className="m-0 mb-4 text-[17px] leading-[27px] text-neutre-800">
            Pas de rendez-vous, pas d’installation. Vous avancez à votre rythme, depuis votre
            téléphone ou votre ordinateur.
          </p>
          <a href="#inscription" className="inline-flex min-h-11 items-center font-semibold">
            Créer mon espace gratuit →
          </a>
        </div>
        <ol className="m-0 grid list-none gap-6 p-0">
          {etapes.map((e, i) => (
            <li key={e.titre} className="flex gap-4">
              <span
                aria-hidden="true"
                className="flex size-10 flex-none items-center justify-center rounded-full bg-accent-100 font-bold text-accent-800"
              >
                {i + 1}
              </span>
              <div>
                <h3 className="m-0 mb-1 text-lg">{e.titre}</h3>
                <p className="m-0 text-[15.5px] leading-[25px] text-neutre-800">{e.texte}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/** Outils inclus : chaque carte ramène au formulaire, jamais vers une autre landing (LANDINGS §3.7). */
export function OutilsInclus({ eco }: { eco: ContenuLanding['eco'] }) {
  return (
    <section data-section-gratuit className={cn(bande, 'bg-neutre-100')}>
      <div className={conteneur}>
        <span className={surtitre}>Un seul compte</span>
        <h2 className={titre2}>{eco.titre}</h2>
        <p className="m-0 mb-8 max-w-[60ch] text-[17px] leading-[27px] text-neutre-800">
          {eco.texte}
        </p>
        <ul className="m-0 grid list-none gap-4 p-0 min-[640px]:grid-cols-2 min-[1000px]:grid-cols-3">
          {OUTILS_INCLUS.map((o) => (
            <li key={o.id}>
              <a
                href="#inscription"
                className="flex h-full min-h-11 gap-3 rounded-[14px] border border-trait bg-blanc p-5 text-texte no-underline hover:border-accent-300"
              >
                <span className="text-accent-700">
                  <IconeLanding nom={o.icone} />
                </span>
                <span className="grid gap-1">
                  <strong className="text-[17px]">{o.titre}</strong>
                  <span className="text-[15px] text-neutre-800">{o.texte}</span>
                  <span className="text-[13px] font-semibold text-succes">Gratuit</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** LAND-04 : rendue seulement avec des données réelles (`config/preuveSociale`). */
export function PreuveSociale({ p }: { p: ReturnType<typeof preuveSociale> }) {
  if (!p.visible) return null;
  return (
    <section data-preuve-sociale className={bande}>
      <div className={conteneur}>
        <h2 className={titre2}>Ils utilisent déjà Portail Travaux</h2>
        {p.chiffres.length ? (
          <p className="m-0 mb-8 flex flex-wrap gap-x-10 gap-y-3">
            {p.chiffres.map((c) => (
              <span key={c.libelle} className="grid">
                <strong className="text-[32px] leading-tight">{c.valeur}</strong>
                <span className="text-neutre-800">{c.libelle}</span>
              </span>
            ))}
          </p>
        ) : null}
        <div className="grid gap-4 min-[760px]:grid-cols-3">
          {p.temoignages.map((t) => (
            <figure key={t.nom} className="m-0 rounded-[14px] border border-trait p-5">
              <blockquote className="m-0 mb-3 text-[15.5px] leading-[25px]">
                « {t.texte} »
              </blockquote>
              <figcaption className="text-sm text-neutre-800">
                <strong>{t.nom}</strong> · {t.metier} · {t.ville}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function CarteAvis({ a }: { a: AvisLanding }) {
  return (
    <div className="w-[300px] flex-none rounded-[14px] border border-trait bg-blanc p-4">
      <p className="m-0 mb-2 text-etoile">
        <span role="img" aria-label="5 étoiles sur 5">
          ★★★★★
        </span>
      </p>
      <p className="m-0 mb-3 text-[15px] leading-[23px]">{a.texte}</p>
      <p className="m-0 flex items-center gap-2 text-sm">
        <span
          aria-hidden="true"
          className="flex size-8 items-center justify-center rounded-full bg-accent-700 text-xs font-bold text-blanc"
        >
          {initiales(a.nom)}
        </span>
        <span>
          <strong>{a.nom}</strong> · {a.metier}
        </span>
      </p>
    </div>
  );
}

/** Bandeau défilant (LANDINGS §3.10) : seulement avec `preuvesMarketing` (avis à remplacer, §7). */
export function AvisDefilants({ avis }: { avis: AvisLanding[] }) {
  if (!avis.length) return null;
  const bas = [...avis.slice(10), ...avis.slice(0, 10)];
  const ligne = (liste: AvisLanding[], sens: 'gauche' | 'droite') => (
    <div
      className="flex w-max gap-4 hover:[animation-play-state:paused]"
      style={{ animation: `defiler-${sens} 90s linear infinite` }}
    >
      {[...liste, ...liste].map((a, i) => (
        <CarteAvis key={`${a.nom}-${i}`} a={a} />
      ))}
    </div>
  );
  return (
    <section aria-label="Avis d’artisans" className={cn(bande, 'overflow-hidden')}>
      <div className={conteneur}>
        <h2 className={titre2}>Ce qu’en disent les artisans</h2>
      </div>
      <div className="grid gap-4 [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
        {ligne(avis, 'gauche')}
        {ligne(bas, 'droite')}
      </div>
    </section>
  );
}

const TUILES = [
  'Demandes de travaux',
  'Visibilité sur le portail',
  'Site internet',
  'Avis clients',
  'Devis et factures',
  'Suivi clients',
];

/** Bloc final Portail Travaux (6 tuiles) et appel final vers le formulaire. */
export function AppelFinal({ titre, cta }: { titre: string; cta: string }) {
  return (
    <section data-formulaire-landing className={cn(bande, 'bg-accent-900 text-blanc')}>
      <div className={cn(conteneur, 'grid gap-8 min-[900px]:grid-cols-[1.1fr_0.9fr]')}>
        <div>
          <h2 className={cn(titre2, 'text-blanc')}>{titre}</h2>
          <p className="m-0 mb-6 max-w-[56ch] text-[17px] leading-[27px] text-accent-100">
            Portail Travaux met en relation les particuliers et les artisans du bâtiment. En
            rejoignant le réseau, vous recevez des demandes de travaux et vous profitez de tous nos
            outils, gratuitement.
          </p>
          <a
            href="#inscription"
            data-cta-final
            className={bouton({ taille: 'lg', className: 'min-h-[52px]' })}
          >
            {cta}
          </a>
          <p className="m-0 mt-3 text-sm text-accent-100">Sans abonnement · Sans carte bancaire</p>
        </div>
        <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0">
          {TUILES.map((t) => (
            <li
              key={t}
              className="rounded-[12px] border border-accent-700 px-4 py-3 text-[15px] font-semibold"
            >
              {t}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
