import { formatDate } from '@ph/core/format';
import type { SiteEdition } from '@ph/firebase/sites';
import { FenetreOffre } from '@/features/offres/FenetreOffre';
import { BoutonRetablir } from './ActionsSite';
import { SousDomaine } from './SousDomaine';

/** Onglet Domaine : adresse gratuite, domaine personnel (Site Pro), hébergement, publications. */
export function OngletDomaine({ site, domaine }: { site: SiteEdition; domaine: string }) {
  return (
    <div className="grid gap-6">
      <section
        aria-labelledby="adresse"
        className="grid gap-3 rounded-[12px] border border-trait bg-blanc p-5"
      >
        <h2 id="adresse" className="m-0 text-xl">
          Adresse du site
        </h2>
        <p className="m-0 text-[15px] text-neutre-800">
          Gratuite sur {domaine}, ou votre propre nom de domaine avec Site Pro.
        </p>
        <SousDomaine actuel={site.sousDomaine ?? ''} domaine={domaine} />
      </section>
      <section
        aria-labelledby="domaine-perso"
        className="grid gap-3 rounded-[12px] border border-trait bg-blanc p-5"
      >
        <h2 id="domaine-perso" className="m-0 text-xl">
          Votre propre domaine
        </h2>
        {site.offre === 'site_pro' ? (
          <p className="m-0 text-[15px] text-neutre-800">
            L’achat d’un domaine à votre nom et la connexion d’un domaine existant arrivent très
            bientôt dans cet onglet. Votre site reste en ligne sur son adresse gratuite d’ici là.
          </p>
        ) : (
          <>
            <p className="m-0 text-[15px] text-neutre-800">
              Un domaine .fr, .com ou .eu enregistré à votre nom, ou votre domaine actuel connecté,
              avec le certificat HTTPS.
            </p>
            <div>
              <FenetreOffre
                formule="site_pro"
                raison="Le domaine personnel est inclus dans Site Pro."
              >
                Utiliser mon domaine
              </FenetreOffre>
            </div>
          </>
        )}
      </section>
      <section
        aria-labelledby="hebergement"
        className="grid gap-2 rounded-[12px] border border-trait bg-blanc p-5"
      >
        <h2 id="hebergement" className="m-0 text-xl">
          Hébergement et sécurité
        </h2>
        <p className="m-0 text-[15px] text-neutre-800">
          Votre site est hébergé et protégé par Portail Habitat : HTTPS, protection contre les
          robots sur le formulaire, aucun cookie. Rien à installer ni à configurer.
        </p>
      </section>
      <section aria-labelledby="publications" className="grid gap-3">
        <h2 id="publications" className="m-0 text-xl">
          Publications
        </h2>
        {site.versions.length ? (
          <ul className="m-0 grid list-none gap-2 p-0">
            {site.versions.map((v) => (
              <li
                key={v.n}
                className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-trait bg-blanc p-4"
              >
                <span>
                  <strong>Version {v.n}</strong> · {formatDate(new Date(v.publieLe))}
                  {v.n === site.versionPubliee ? ' · en ligne' : ''}
                </span>
                {v.n === site.versionPubliee ? null : <BoutonRetablir version={v.n} />}
              </li>
            ))}
          </ul>
        ) : (
          <p className="m-0 text-[15px] text-neutre-800">Aucune publication pour l’instant.</p>
        )}
        <p className="m-0 text-sm text-neutre-800">
          Remettre une ancienne version en ligne prend moins de 10 secondes. Vos modifications en
          cours dans l’éditeur ne sont pas touchées.
        </p>
      </section>
    </div>
  );
}
