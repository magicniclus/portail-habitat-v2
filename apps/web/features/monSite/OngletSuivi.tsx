'use client';

import { entreeSuivi, type SuiviSite } from '@ph/core/sites';
import { Banner, Button } from '@ph/ui';
import { CookieIcon, GoogleLogoIcon, MetaLogoIcon, TargetIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { useAppelSite } from './appelSite';
import { Evenement, Identifiant } from './ChampsSuivi';
import { CarteReglage, EnTeteOnglet, Pastille } from './Mise';

/**
 * Onglet « Suivi et publicité » : balise Google (Analytics 4, Google Ads, Tag Manager) et pixel
 * Meta, événements envoyés, et bandeau de consentement affiché aux visiteurs (CNIL). Seuls des
 * identifiants sont acceptés ; actifs sur le site en ligne dès l'enregistrement.
 */
export function OngletSuivi({ initial }: { initial: SuiviSite }) {
  const [s, setS] = useState(initial);
  const [ok, setOk] = useState(false);
  const { appeler, erreur, enCours } = useAppelSite();
  const verif = entreeSuivi.safeParse(s);
  const erreurs = verif.success
    ? {}
    : Object.fromEntries(verif.error.issues.map((i) => [String(i.path[0]), i.message]));
  const maj = (r: Partial<SuiviSite>) => {
    setS({ ...s, ...r });
    setOk(false);
  };
  const google = Boolean(initial.google);
  const meta = Boolean(initial.meta);
  return (
    <div className="grid gap-5">
      <EnTeteOnglet titre="Suivi et publicité">
        Mesurez les visites et les demandes venues de vos campagnes Google et Facebook / Instagram.
        Collez seulement l’identifiant : le reste est installé et réglé pour vous.
      </EnTeteOnglet>
      <form
        className="grid gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!verif.success) return;
          if ((await appeler('suivi', { suivi: verif.data })) !== null) setOk(true);
        }}
      >
        <CarteReglage
          icone={<GoogleLogoIcon size={22} weight="bold" />}
          titre="Balise Google"
          description="Google Analytics 4, Google Ads ou Google Tag Manager."
          etat={<Pastille actif={google}>{google ? 'Active' : 'Non configurée'}</Pastille>}
        >
          <Identifiant
            libelle="Identifiant de la balise"
            exemple="G-XXXXXXXXXX"
            aide="Analytics : Administration › Flux de données › ID de mesure (G-…). Ads : AW-… · Tag Manager : GTM-…"
            valeur={s.google}
            {...(erreurs.google ? { erreur: erreurs.google } : {})}
            onChange={(google) => maj({ google })}
          />
          <Identifiant
            libelle="Conversion Google Ads (facultatif)"
            exemple="AW-123456789/AbCdEfGhIj"
            aide="Google Ads › Objectifs › Conversions › votre conversion › Configuration de la balise : « ID / libellé »."
            valeur={s.conversionAds}
            {...(erreurs.conversionAds ? { erreur: erreurs.conversionAds } : {})}
            onChange={(conversionAds) => maj({ conversionAds })}
          />
        </CarteReglage>
        <CarteReglage
          icone={<MetaLogoIcon size={22} weight="bold" />}
          titre="Pixel Meta"
          description="Publicités Facebook et Instagram."
          etat={<Pastille actif={meta}>{meta ? 'Actif' : 'Non configuré'}</Pastille>}
        >
          <Identifiant
            libelle="Identifiant du pixel"
            exemple="123456789012345"
            aide="Gestionnaire d’évènements Meta › Sources de données › votre pixel : le numéro sous son nom."
            valeur={s.meta}
            {...(erreurs.meta ? { erreur: erreurs.meta } : {})}
            onChange={(meta) => maj({ meta })}
          />
        </CarteReglage>
        <CarteReglage
          icone={<TargetIcon size={22} weight="bold" />}
          titre="Événements envoyés"
          description="Les pages vues sont envoyées automatiquement. Choisissez les conversions."
        >
          <div className="grid gap-3">
            <Evenement
              libelle="Demande envoyée depuis le formulaire"
              detail="Google : generate_lead (et votre conversion Ads) · Meta : Lead"
              actif={s.evenements.demande}
              onChange={(demande) => maj({ evenements: { ...s.evenements, demande } })}
            />
            <Evenement
              libelle="Clic sur un numéro de téléphone"
              detail="Google : contact · Meta : Contact"
              actif={s.evenements.appel}
              onChange={(appel) => maj({ evenements: { ...s.evenements, appel } })}
            />
          </div>
        </CarteReglage>
        <CarteReglage
          icone={<CookieIcon size={22} weight="bold" />}
          titre="Consentement des visiteurs"
          description="Obligatoire (CNIL) dès qu’une balise ou un pixel est actif : affiché automatiquement, rien n’est chargé avant « Tout accepter »."
        >
          <div
            aria-hidden="true"
            className="grid max-w-[560px] gap-3 rounded-[12px] bg-neutre-100 p-4 text-[13px] text-neutre-800"
          >
            <span>
              Avec votre accord, ce site utilise des cookies de mesure d’audience et de publicité
              pour mieux faire connaître nos services…
            </span>
            <span className="flex justify-end gap-2">
              <span className="rounded-[8px] border border-neutre-800 bg-blanc px-3 py-1.5 font-bold">
                Tout refuser
              </span>
              <span className="rounded-[8px] bg-neutre-800 px-3 py-1.5 font-bold text-blanc">
                Tout accepter
              </span>
            </span>
          </div>
          <p className="m-0 text-xs text-neutre-600">
            Refuser est aussi simple qu’accepter ; le choix est gardé 6 mois et modifiable depuis «
            Gestion des cookies » en bas de chaque page. Sans balise ni pixel : aucun bandeau, votre
            site reste sans cookie.
          </p>
        </CarteReglage>
        <div className="sticky bottom-0 flex flex-wrap items-center gap-3 border-t border-trait bg-blanc py-3 max-[899px]:bottom-[72px]">
          <Button chargement={enCours} type="submit" disabled={enCours || !verif.success}>
            {enCours ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
          {ok ? (
            <span role="status" className="text-sm font-semibold text-succes">
              ✓ Enregistré · actif sur votre site en ligne en moins d’une minute
            </span>
          ) : null}
        </div>
        {erreur ? <Banner tone="danger">{erreur}</Banner> : null}
      </form>
    </div>
  );
}
