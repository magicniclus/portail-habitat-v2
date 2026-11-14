import { entreeDossierDiag } from '@ph/core/schemas';
import { creerDossierDiag } from '@ph/firebase/demandes';
import { action } from '@/server/action';
import { servicesDemandes } from '@/server/demandes';
import { communesParcours, referentielDiagnostic, textesDiagnostic } from '@/server/diagnostic';
import { routeJson } from '@/server/json';
import { traceRequete } from '@/server/trace';

export const dynamic = 'force-dynamic';

const envoyer = action(
  {
    schema: entreeDossierDiag,
    nom: 'creerDossierDiag',
    authentification: 'facultative',
    rateLimit: { cle: 'dossier-diag', max: 5, fenetre: '1h' },
    idempotence: true,
  },
  async (e, ctx) => {
    return creerDossierDiag(
      {
        ...servicesDemandes(),
        referentiel: referentielDiagnostic(),
        textes: textesDiagnostic(),
        commune: (slug) => {
          const c = communesParcours().find((x) => x.id === slug);
          return c ? { nom: c.nom, presquile: c.presquile, codePostal: c.cp } : null;
        },
      },
      e,
      { uid: ctx.uid, ...(await traceRequete()) },
    );
  },
);

/** Envoi du parcours diagnostic (DIA-06) : la réponse porte le budget calculé côté serveur. */
export const POST = (requete: Request) => routeJson(requete, envoyer);
