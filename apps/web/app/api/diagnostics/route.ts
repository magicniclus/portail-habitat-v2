import { entreeDossierDiag } from '@ph/core/schemas';
import { creerDossierDiag } from '@ph/firebase/demandes';
import { headers } from 'next/headers';
import { createHash } from 'node:crypto';
import { action } from '@/server/action';
import { servicesDemandes } from '@/server/demandes';
import { communesParcours, referentielDiagnostic, textesDiagnostic } from '@/server/diagnostic';
import { routeJson } from '@/server/json';

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
    const h = await headers();
    const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim();
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
      {
        uid: ctx.uid,
        ...(ip ? { ipHash: createHash('sha256').update(ip).digest('hex').slice(0, 32) } : {}),
        userAgent: h.get('user-agent') ?? undefined,
      },
    );
  },
);

/** Envoi du parcours diagnostic (DIA-06) : la réponse porte le budget calculé côté serveur. */
export const POST = (requete: Request) => routeJson(requete, envoyer);
