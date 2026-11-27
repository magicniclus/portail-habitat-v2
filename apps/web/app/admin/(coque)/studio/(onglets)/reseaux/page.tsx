import { NOMS_RESEAUX, RESEAUX, type Reseau } from '@ph/core/studio';
import { formatRelatif } from '@ph/core/format';
import { appAdmin } from '@ph/firebase/admin';
import { configReseaux, listerComptesStudio, redirectionReseau } from '@ph/firebase/studio';
import { Badge, Banner } from '@ph/ui';
import { getFirestore } from 'firebase-admin/firestore';
import type { Metadata } from 'next';
import { BoutonDeconnexionReseau } from '@/features/studio/BoutonDeconnexionReseau';
import { maintenantServeur } from '@/server/adminLectures';
import { pageAdmin } from '@/server/sessionAdmin';

export const metadata: Metadata = { title: 'Studio · réseaux' };

const MESSAGES: Record<string, [tone: 'succes' | 'danger' | 'attention', (r: string) => string]> = {
  connecte: ['succes', (r) => `${r} est connecté.`],
  refus: ['attention', (r) => `${r} : autorisation annulée.`],
  erreur: ['danger', (r) => `${r} : la connexion n’a pas abouti. Réessayez.`],
  manque: ['attention', (r) => `${r} n’est pas encore configuré : voir les variables ci-dessous.`],
};

/** Studio › Réseaux (STUDIO.md §10) : connecter YouTube, Instagram et TikTok pour publier et lire les statistiques. */
export default async function ReseauxStudio({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await pageAdmin('/admin/studio/reseaux', 'studio');
  const q = await searchParams;
  const comptes = await listerComptesStudio(getFirestore(appAdmin()));
  const config = configReseaux(process.env);
  const maintenant = maintenantServeur();
  const avis = Object.entries(MESSAGES).flatMap(([cle, [ton, texte]]) => {
    const r = q[cle];
    return typeof r === 'string' && NOMS_RESEAUX.includes(r as Reseau)
      ? [{ ton, texte: texte(RESEAUX[r as Reseau].libelle) }]
      : [];
  });
  return (
    <div className="grid min-w-0 content-start gap-5">
      <header>
        <h1 className="m-0 text-xl">Réseaux</h1>
        <p className="m-0 mt-1 text-neutre-700">
          Connectez vos comptes pour publier, programmer et lire les statistiques de vos vidéos.
        </p>
      </header>
      {avis.map((a) => (
        <Banner key={a.texte} tone={a.ton}>
          {a.texte}
        </Banner>
      ))}
      {!config ? (
        <Banner tone="attention" titre="Clé de chiffrement manquante">
          Ajoutez <code>STUDIO_CHIFFREMENT_CLE</code> (32 octets en base64, par exemple{' '}
          <code>openssl rand -base64 32</code>) dans <code>.env.local</code> : elle protège les
          accès à vos comptes.
        </Banner>
      ) : null}
      <ul className="m-0 grid list-none gap-3 p-0 lg:grid-cols-3">
        {NOMS_RESEAUX.map((r) => {
          const d = RESEAUX[r];
          const compte = comptes.find((c) => c.reseau === r);
          const pret = Boolean(config?.applis[r]);
          return (
            <li
              key={r}
              className="grid content-start gap-3 rounded-card border border-trait bg-blanc p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <strong className="text-lg">{d.libelle}</strong>
                <Badge tone={compte ? 'succes' : 'neutre'}>
                  {compte ? 'Connecté' : 'Non connecté'}
                </Badge>
              </div>
              {compte ? (
                <p className="m-0 text-sm">
                  <strong>{compte.nom}</strong> · connecté{' '}
                  {formatRelatif(compte.connecteLe, maintenant)}
                </p>
              ) : (
                <p className="m-0 text-sm text-neutre-700">{d.prealable}</p>
              )}
              {pret ? (
                <div className="flex flex-wrap gap-2">
                  <a
                    href={`/api/studio/reseaux/${r}`}
                    className="inline-flex min-h-11 items-center rounded-control bg-accent px-4 font-semibold text-blanc no-underline"
                  >
                    {compte ? 'Reconnecter' : 'Connecter'}
                  </a>
                  {compte ? <BoutonDeconnexionReseau reseau={r} libelle={d.libelle} /> : null}
                </div>
              ) : (
                <div className="text-sm">
                  <p className="m-0 font-semibold">À ajouter dans .env.local :</p>
                  <code className="block">{d.variables.id}</code>
                  <code className="block">{d.variables.secret}</code>
                  {config ? (
                    <p className="m-0 mt-1 text-neutre-700">
                      Adresse de retour à déclarer : <code>{redirectionReseau(config, r)}</code>
                    </p>
                  ) : null}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
