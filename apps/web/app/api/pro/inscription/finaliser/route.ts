import { ErreurMetier } from '@ph/core/erreurs';
import { normaliserTel, sirenDeSiret } from '@ph/core/format';
import { decouperNom } from '@ph/core/onboarding';
import { entreeFinaliserInscription, entreeFinaliserOnboarding } from '@ph/core/schemas';
import { finaliserOnboarding, rechercherEntreprise } from '@ph/firebase/comptes';
import { VERSION_LEGALE } from '@/features/legal/documents';
import { action } from '@/server/action';
import { servicesComptes } from '@/server/espace';
import { brouillonCourant, oublierBrouillon } from '@/server/inscription';
import { routeJson } from '@/server/json';

export const dynamic = 'force-dynamic';

const finaliser = action(
  {
    schema: entreeFinaliserInscription,
    nom: 'finaliserInscription',
    idempotence: true,
    rateLimit: { cle: 'inscription', max: 10, fenetre: '1h' },
  },
  async (e, ctx) => {
    const b = await brouillonCourant();
    if (!b?.zone)
      throw new ErreurMetier(
        'PRECONDITION',
        'Votre inscription a expiré : recommencez depuis la page Pro.',
      );
    const s = servicesComptes();
    // Téléphone : plus demandé à l'étape 1 (formulaire court) ; gardé s'il vient d'un ancien brouillon.
    const tel = b.identite.telephone ? normaliserTel(b.identite.telephone) : null;
    const m = 'manuelle' in e ? e.manuelle : null;
    // Saisie à la main : si le SIREN est finalement au répertoire, il est reconnu (fermée ou déjà
    // inscrite : refus) ; introuvable ou répertoire indisponible : saisie gardée, à vérifier.
    const entreprise = m
      ? await entrepriseDuRepertoire(s, sirenDeSiret(m.siret)).catch((x: unknown) => {
          const code = (x as ErreurMetier).code;
          if (code === 'ENTREE_INVALIDE' || code === 'INDISPONIBLE') return null;
          throw x;
        })
      : await entrepriseDuRepertoire(s, (e as { siren: string }).siren);
    // Identifiant du compte (Google ou email saisi) : si l'email de l'étape 1 est différent, il
    // devient l'email de contact de la fiche (décision du 15/11/2026).
    const compte = await s.auth.getUser(ctx.uid!);
    const emailCompte = compte.email?.toLowerCase();
    const emailEtape1 = b.identite.email.toLowerCase();
    const entree = entreeFinaliserOnboarding.parse({
      cleIdempotence: e.cleIdempotence,
      brouillonId: b.brouillonId,
      entreprise: {
        ...(entreprise ?? {
          siren: sirenDeSiret(m!.siret),
          siret: m!.siret,
          raisonSociale: m!.raisonSociale,
          nomCommercial: m!.raisonSociale,
          adresseSiege: m!.adresse,
        }),
        ...(tel ? { telephonePublic: tel } : {}),
      },
      metierPrincipal: b.metierPrincipal,
      metiers: b.metiers,
      intentions: b.intentions,
      zone: { centre: b.zone.centre, rayonKm: b.zone.rayonKm },
      cgvVersion: VERSION_LEGALE,
      sirenReconnu: entreprise !== null,
      // Nom du compte (Google, ou saisi à l'étape compte) ; ancien brouillon : celui de l'étape 1.
      profil: decouperNom(compte.displayName ?? b.identite.nom ?? ''),
      ...(emailCompte && emailCompte !== emailEtape1 ? { emailContact: emailEtape1 } : {}),
      ...(b.acquisition ? { acquisition: b.acquisition } : {}),
    });
    const r = await finaliserOnboarding(s, ctx.uid!, entree);
    await oublierBrouillon();
    return r;
  },
);

/** Entreprise relue côté serveur (API publique + cache) : rien n'est repris du navigateur. */
async function entrepriseDuRepertoire(s: ReturnType<typeof servicesComptes>, siren: string) {
  const trouvee = (await rechercherEntreprise(s, siren)).find((x) => x.entreprise.siren === siren);
  if (!trouvee) throw new ErreurMetier('ENTREE_INVALIDE', 'Nous ne trouvons pas ce SIREN.');
  if (trouvee.analyse.refusee)
    throw new ErreurMetier(
      'PRECONDITION',
      'Cette entreprise est fermée : l’inscription est impossible (ONB-02).',
    );
  if (trouvee.analyse.inscription !== 'libre')
    throw new ErreurMetier('CONFLIT', 'Cette entreprise a déjà un compte.');
  const x = trouvee.entreprise;
  return {
    siren: x.siren,
    siret: x.siret,
    raisonSociale: x.raisonSociale,
    nomCommercial: x.nomCommercial ?? x.raisonSociale,
    ...(x.codeNaf ? { codeNaf: x.codeNaf } : {}),
    ...(x.dateCreation ? { dateCreationEntreprise: x.dateCreation } : {}),
    adresseSiege: x.adresse,
  };
}

/** Étape 3 : création de l'entreprise, du propriétaire et du portefeuille en une transaction (ONB-05, ONB-06). */
export const POST = (requete: Request) => routeJson(requete, finaliser);
