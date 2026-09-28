import { ErreurMetier } from '@ph/core/erreurs';
import { normaliserTel } from '@ph/core/format';
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
    // L'entreprise est relue côté serveur (API publique + cache) : rien n'est repris du navigateur.
    const trouvee = (await rechercherEntreprise(s, e.siren)).find(
      (x) => x.entreprise.siren === e.siren,
    );
    if (!trouvee) throw new ErreurMetier('ENTREE_INVALIDE', 'Nous ne trouvons pas ce SIREN.');
    if (trouvee.analyse.refusee)
      throw new ErreurMetier(
        'PRECONDITION',
        'Cette entreprise est fermée : l’inscription est impossible (ONB-02).',
      );
    if (trouvee.analyse.inscription !== 'libre')
      throw new ErreurMetier('CONFLIT', 'Cette entreprise a déjà un compte.');
    const x = trouvee.entreprise;
    const tel = normaliserTel(b.identite.telephone);
    const entree = entreeFinaliserOnboarding.parse({
      cleIdempotence: e.cleIdempotence,
      brouillonId: b.brouillonId,
      entreprise: {
        siren: x.siren,
        siret: x.siret,
        raisonSociale: x.raisonSociale,
        nomCommercial: x.nomCommercial ?? x.raisonSociale,
        ...(x.codeNaf ? { codeNaf: x.codeNaf } : {}),
        ...(x.dateCreation ? { dateCreationEntreprise: x.dateCreation } : {}),
        adresseSiege: x.adresse,
        ...(tel ? { telephonePublic: tel } : {}),
      },
      metierPrincipal: b.metierPrincipal,
      metiers: b.metiers,
      intentions: b.intentions,
      zone: { centre: b.zone.centre, rayonKm: b.zone.rayonKm },
      cgvVersion: VERSION_LEGALE,
    });
    const r = await finaliserOnboarding(s, ctx.uid!, entree);
    await oublierBrouillon();
    return r;
  },
);

/** Étape 3 : création de l'entreprise, du propriétaire et du portefeuille en une transaction (ONB-05, ONB-06). */
export const POST = (requete: Request) => routeJson(requete, finaliser);
