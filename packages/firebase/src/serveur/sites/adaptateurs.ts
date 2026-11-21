import { ErreurMetier } from '@ph/core/erreurs';
import type { ConfigHebergeur, EnregistrementAttendu } from '@ph/core/sites';
import type { HebergeurSites, ResolveurDns } from './domaines';

type Fetch = typeof fetch;
const DELAI = 8000;

/**
 * Hébergeur Vercel (DOMAINES §3-4) : projet unique des sites, domaine nu et www ajoutés ; les
 * valeurs A et CNAME sont lues dans la configuration recommandée par Vercel, jamais en dur.
 */
export function hebergeurVercel(
  o: { jeton: string; projet: string; equipe?: string },
  f: Fetch = fetch,
): HebergeurSites {
  const api = async (methode: string, chemin: string, corps?: unknown) => {
    const url = new URL(`https://api.vercel.com${chemin}`);
    if (o.equipe) url.searchParams.set('teamId', o.equipe);
    const r = await f(url, {
      method: methode,
      headers: { authorization: `Bearer ${o.jeton}`, 'content-type': 'application/json' },
      ...(corps ? { body: JSON.stringify(corps) } : {}),
      signal: AbortSignal.timeout(DELAI),
    });
    const json = (await r.json().catch(() => ({}))) as Record<string, unknown>;
    return { ok: r.ok, statut: r.status, json };
  };
  const projet = encodeURIComponent(o.projet);
  return {
    async ajouterDomaine(nom) {
      const verifications: ConfigHebergeur['verifications'] = [];
      for (const hote of [nom, `www.${nom}`]) {
        const r = await api('POST', `/v10/projects/${projet}/domains`, { name: hote });
        // 409 : déjà dans le projet (nouvel essai de l'artisan), on relit son état.
        const d = r.ok
          ? r.json
          : r.statut === 409
            ? (await api('GET', `/v9/projects/${projet}/domains/${hote}`)).json
            : null;
        if (!d)
          throw new ErreurMetier('INDISPONIBLE', 'Ajout du domaine impossible pour le moment.');
        for (const v of (d.verification as { type: string; domain: string; value: string }[]) ?? [])
          if (v.type === 'TXT') verifications.push({ nom: v.domain, valeur: v.value });
      }
      const c = (await api('GET', `/v6/domains/${encodeURIComponent(nom)}/config`)).json as {
        recommendedIPv4?: { rank: number; value: string[] }[];
        recommendedCNAME?: { rank: number; value: string }[];
      };
      const premier = <T extends { rank: number }>(l?: T[]) =>
        [...(l ?? [])].sort((a, b) => a.rank - b.rank)[0];
      const apex = premier(c.recommendedIPv4)?.value;
      const cname = premier(c.recommendedCNAME)?.value;
      if (!apex?.length || !cname)
        throw new ErreurMetier('INDISPONIBLE', 'Configuration du domaine indisponible.');
      return { apex, cname, verifications };
    },
    async verifierDomaine(nom) {
      const r = await Promise.all(
        [nom, `www.${nom}`].map((h) => api('POST', `/v9/projects/${projet}/domains/${h}/verify`)),
      );
      return r.every((x) => x.ok && x.json.verified === true);
    },
    async retirerDomaine(nom) {
      await Promise.all(
        [nom, `www.${nom}`].map((h) => api('DELETE', `/v9/projects/${projet}/domains/${h}`)),
      );
    },
  };
}

const TYPES = { A: 1, CNAME: 5, TXT: 16 } as const;

/**
 * Résolveur DNS-over-HTTPS (1.1.1.1, puis 8.8.8.8 en secours) : jamais le cache local, pour voir
 * ce que voient les visiteurs (DOMAINES §4).
 */
export function resolveurDoh(f: Fetch = fetch): ResolveurDns {
  const serveurs = ['https://cloudflare-dns.com/dns-query', 'https://dns.google/resolve'];
  return {
    async resoudre(type: EnregistrementAttendu['type'], nom: string) {
      for (const base of serveurs) {
        try {
          const url = `${base}?name=${encodeURIComponent(nom)}&type=${type}`;
          const r = await f(url, {
            headers: { accept: 'application/dns-json' },
            signal: AbortSignal.timeout(DELAI),
          });
          if (!r.ok) continue;
          const j = (await r.json()) as { Answer?: { type: number; data: string }[] };
          return (j.Answer ?? [])
            .filter((a) => a.type === TYPES[type])
            .map((a) =>
              type === 'TXT' ? a.data.replace(/"\s*"/g, '').replace(/^"|"$/g, '') : a.data,
            );
        } catch {
          // Serveur suivant.
        }
      }
      return [];
    },
  };
}

/**
 * Adaptateurs selon l'environnement : Vercel si ses clés sont présentes ; sinon, hors production
 * seulement, un hébergeur local qui considère le domaine servi (émulateurs, e2e).
 */
export function hebergeurDepuisEnv(
  env: Record<string, string | undefined> = process.env,
): HebergeurSites {
  if (env.VERCEL_API_TOKEN && env.VERCEL_PROJET_SITES)
    return hebergeurVercel({
      jeton: env.VERCEL_API_TOKEN,
      projet: env.VERCEL_PROJET_SITES,
      ...(env.VERCEL_EQUIPE ? { equipe: env.VERCEL_EQUIPE } : {}),
    });
  if (
    env.VERCEL_ENV === 'production' ||
    (env.NODE_ENV === 'production' && !env.FIRESTORE_EMULATOR_HOST)
  )
    return {
      ajouterDomaine: async () => {
        throw new ErreurMetier('INDISPONIBLE', 'Connexion de domaine indisponible pour le moment.');
      },
      verifierDomaine: async () => false,
      retirerDomaine: async () => undefined,
    };
  return {
    ajouterDomaine: async () => ({
      apex: [env.SITES_IP_LOCALE ?? '127.0.0.1'],
      cname: env.SITES_CNAME_LOCAL ?? 'localhost',
      verifications: [],
    }),
    verifierDomaine: async () => true,
    retirerDomaine: async () => undefined,
  };
}
