import { formatDate } from '@ph/core/format';
import type { SiteEdition } from '@ph/firebase/sites';
import {
  ClockCounterClockwiseIcon,
  GlobeIcon,
  LinkSimpleIcon,
  ShieldCheckIcon,
} from '@phosphor-icons/react/ssr';
import { BoutonRetablir } from './ActionsSite';
import { DomainePerso } from './DomainePerso';
import { CarteReglage, EnTeteOnglet, Pastille } from './Mise';
import { SousDomaine } from './SousDomaine';

/** Onglet Domaine : adresse gratuite, domaine personnel (Site Pro), hébergement, publications. */
export function OngletDomaine({ site, domaine }: { site: SiteEdition; domaine: string }) {
  return (
    <div className="grid gap-5">
      <EnTeteOnglet titre="Domaine et publication">
        L’adresse de votre site, votre propre nom de domaine et l’historique des mises en ligne.
      </EnTeteOnglet>
      <CarteReglage
        icone={<GlobeIcon size={22} weight="bold" />}
        titre="Adresse du site"
        description={`Gratuite sur ${domaine}, ou votre propre nom de domaine avec Site Pro.`}
      >
        <div className="max-w-[520px]">
          <SousDomaine actuel={site.sousDomaine ?? ''} domaine={domaine} />
        </div>
      </CarteReglage>
      <CarteReglage
        icone={<LinkSimpleIcon size={22} weight="bold" />}
        titre="Votre propre domaine"
        etat={
          <Pastille actif={site.domaine?.statut === 'actif'}>
            {site.domaine?.statut === 'actif'
              ? 'En ligne'
              : site.domaine
                ? 'En cours'
                : 'Aucun domaine'}
          </Pastille>
        }
        description="Un domaine .fr, .com ou .eu à votre nom, ou votre domaine actuel connecté, avec le certificat HTTPS."
      >
        <div className="max-w-[560px]">
          <DomainePerso
            sitePro={site.offre === 'site_pro'}
            {...(site.domaine ? { domaine: site.domaine } : {})}
            {...(site.domaineVoulu ? { voulu: site.domaineVoulu } : {})}
          />
        </div>
      </CarteReglage>
      <CarteReglage
        icone={<ShieldCheckIcon size={22} weight="bold" />}
        titre="Hébergement et sécurité"
        description="HTTPS, protection contre les robots sur le formulaire, sans cookie (sauf balise Google ou pixel Meta activés, avec l’accord du visiteur). Rien à installer ni à configurer."
      />
      <CarteReglage
        icone={<ClockCounterClockwiseIcon size={22} weight="bold" />}
        titre="Publications"
        description="Remettre une ancienne version en ligne prend moins de 10 secondes ; vos modifications en cours dans l’éditeur ne sont pas touchées."
      >
        {site.versions.length ? (
          <ul className="m-0 grid list-none gap-0 p-0">
            {site.versions.map((v) => (
              <li
                key={v.n}
                className="flex flex-wrap items-center justify-between gap-3 border-t border-trait py-3 first:border-t-0 first:pt-0"
              >
                <span className="flex items-center gap-2 text-[15px]">
                  <strong>Version {v.n}</strong>
                  <span className="text-neutre-700">{formatDate(new Date(v.publieLe))}</span>
                  {v.n === site.versionPubliee ? <Pastille actif>En ligne</Pastille> : null}
                </span>
                {v.n === site.versionPubliee ? null : <BoutonRetablir version={v.n} />}
              </li>
            ))}
          </ul>
        ) : (
          <p className="m-0 text-[15px] text-neutre-700">Aucune publication pour l’instant.</p>
        )}
      </CarteReglage>
    </div>
  );
}
