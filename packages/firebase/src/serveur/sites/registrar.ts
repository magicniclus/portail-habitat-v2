import { ErreurMetier } from '@ph/core/erreurs';
import type { EnregistrementAttendu, TitulaireDomaine } from '@ph/core/sites';
import type { RegistrarDomaines } from './achatDomaine';

type Fetch = typeof fetch;
const DELAI = 10_000;
const PROD = 'https://api.gandi.net/v5';
/** Bac à sable Gandi : tout est simulé, rien n'est acheté (essais en recette). */
const BAC_A_SABLE = 'https://api.sandbox.gandi.net/v5';

/** Téléphone au format des registres : `+33.556123456`. */
const telRegistre = (e164: string) => e164.replace(/^\+(\d{2})/, '+$1.');

/**
 * Gandi (registrar français, API gratuite, DOMAINES §3) : disponibilité, enregistrement au nom de
 * l'entreprise de l'artisan (titulaire = raison sociale, SIREN, siège ; payé par le solde prépayé
 * du compte Portail Travaux), zone LiveDNS (A, AAAA et CNAME seulement : les MX ne sont jamais
 * touchés), code de transfert. Jeton d'accès personnel (`Authorization: Bearer`).
 */
export function registrarGandi(
  o: { jeton: string; bacASable?: boolean },
  f: Fetch = fetch,
): RegistrarDomaines {
  const base = o.bacASable ? BAC_A_SABLE : PROD;
  const appel = (methode: string, chemin: string, corps?: unknown) =>
    f(`${base}${chemin}`, {
      method: methode,
      headers: { authorization: `Bearer ${o.jeton}`, 'content-type': 'application/json' },
      ...(corps === undefined ? {} : { body: JSON.stringify(corps) }),
      // 303 de « createstatus » quand le domaine est créé : lu tel quel, pas suivi.
      redirect: 'manual',
      signal: AbortSignal.timeout(DELAI),
    });
  const api = async <T>(methode: string, chemin: string, corps?: unknown): Promise<T> => {
    const r = await appel(methode, chemin, corps);
    if (!r.ok)
      throw new ErreurMetier('INDISPONIBLE', `Bureau d’enregistrement indisponible (${r.status}).`);
    return (await r.json().catch(() => null)) as T;
  };
  const domaine = (nom: string) => `/domain/domains/${encodeURIComponent(nom)}`;
  return {
    fournisseur: 'gandi',
    async disponibilite(noms) {
      return Promise.all(
        noms.map(async (nom) => {
          const r = await api<{ products?: { process: string; status: string }[] }>(
            'GET',
            `/domain/check?name=${encodeURIComponent(nom)}`,
          ).catch(() => null);
          // Seulement « available » à la création (ni réservé, ni premium, ni précommande).
          const libre = (r?.products ?? []).some(
            (p) => p.process === 'create' && p.status === 'available',
          );
          return { nom, libre };
        }),
      );
    },
    async commander(nom, t: TitulaireDomaine) {
      await api('POST', '/domain/domains', {
        fqdn: nom,
        duration: 1,
        owner: {
          type: 'company',
          orgname: t.organisation,
          siren: t.siren,
          given: 'Service',
          family: t.organisation,
          email: t.email,
          phone: telRegistre(t.telephone),
          streetaddr: t.adresse.ligne1,
          zip: t.adresse.codePostal,
          city: t.adresse.ville,
          country: t.adresse.pays,
          lang: 'fr',
        },
      });
      // Enregistrement asynchrone : suivi par son nom.
      return { commandeId: nom };
    },
    async etatCommande(nom) {
      const r = await appel('GET', `${domaine(nom)}/createstatus`);
      // Domaine créé : redirection vers sa fiche ; on active alors le renouvellement automatique.
      if (r.status === 303) {
        await api('PATCH', `${domaine(nom)}/autorenew`, { enabled: true, duration: 1 });
        return 'livre';
      }
      if (!r.ok)
        throw new ErreurMetier(
          'INDISPONIBLE',
          `Bureau d’enregistrement indisponible (${r.status}).`,
        );
      const e = (await r.json().catch(() => null)) as { step?: string } | null;
      return e?.step === 'ERROR' ? 'echec' : 'en_cours';
    },
    async ecrireZone(nom, lignes: EnregistrementAttendu[]) {
      const zone = `/livedns/domains/${encodeURIComponent(nom)}/records`;
      // Anciennes cibles du domaine nu et de www (page d'attente) : A, AAAA, CNAME seulement.
      for (const sous of ['@', 'www'])
        for (const type of ['A', 'AAAA', 'CNAME']) {
          const r = await appel('DELETE', `${zone}/${sous}/${type}`);
          if (!r.ok && r.status !== 404)
            throw new ErreurMetier(
              'INDISPONIBLE',
              `Bureau d’enregistrement indisponible (${r.status}).`,
            );
        }
      // Une écriture par nom et type (plusieurs valeurs possibles, ex. deux A).
      const groupes = new Map<string, string[]>();
      for (const l of lignes) {
        const cle = `${l.nom}/${l.type}`;
        groupes.set(cle, [
          ...(groupes.get(cle) ?? []),
          l.type === 'CNAME' ? `${l.valeur}.` : l.valeur,
        ]);
      }
      for (const [cle, valeurs] of groupes)
        await api('PUT', `${zone}/${cle}`, { rrset_values: valeurs, rrset_ttl: 3600 });
    },
    async codeTransfert(nom) {
      const d = await api<{ authinfo?: string }>('GET', domaine(nom));
      if (!d?.authinfo)
        throw new ErreurMetier(
          'INDISPONIBLE',
          'Code de transfert indisponible : écrivez au support.',
        );
      return d.authinfo;
    },
  };
}

/**
 * Disponibilité vue du DNS public (sans compte revendeur) : un domaine enregistré répond, un
 * domaine libre n'existe pas (NXDOMAIN). En cas de doute ou de panne : « pris » (jamais un faux
 * « disponible »).
 */
export async function disponibiliteDns(
  noms: string[],
  f: Fetch = fetch,
): Promise<{ nom: string; libre: boolean }[]> {
  return Promise.all(
    noms.map(async (nom) => {
      const r = await f(
        `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(nom)}&type=NS`,
        { headers: { accept: 'application/dns-json' }, signal: AbortSignal.timeout(DELAI) },
      ).catch(() => null);
      const corps = (await r?.json().catch(() => null)) as { Status?: number } | null;
      return { nom, libre: r?.ok === true && corps?.Status === 3 };
    }),
  );
}

/**
 * Bureau d'enregistrement selon l'environnement : Gandi si son jeton est présent (bac à sable si
 * `GANDI_BAC_A_SABLE=1`) ; en production
 * sans clés, achat indisponible (message clair) ; ailleurs (émulateurs, e2e), un bureau local :
 * disponibilité lue dans le DNS public (« pris » dans le nom : indisponible), commande livrée
 * aussitôt.
 */
export function registrarDepuisEnv(
  env: Record<string, string | undefined> = process.env,
): RegistrarDomaines {
  if (env.GANDI_TOKEN)
    return registrarGandi({ jeton: env.GANDI_TOKEN, bacASable: env.GANDI_BAC_A_SABLE === '1' });
  const indisponible = async (): Promise<never> => {
    throw new ErreurMetier('INDISPONIBLE', 'L’achat de domaine ouvre très bientôt.');
  };
  if (
    env.VERCEL_ENV === 'production' ||
    (env.NODE_ENV === 'production' && !env.FIRESTORE_EMULATOR_HOST)
  )
    return {
      fournisseur: 'gandi',
      disponibilite: indisponible,
      commander: indisponible,
      etatCommande: indisponible,
      ecrireZone: indisponible,
      codeTransfert: indisponible,
    };
  return {
    fournisseur: 'local',
    // Disponibilité réelle (DNS public) ; « pris » dans le nom force l'indisponible (tests).
    disponibilite: async (noms) =>
      (await disponibiliteDns(noms)).map((d) => ({
        ...d,
        libre: d.libre && !d.nom.includes('pris'),
      })),
    commander: async (nom) => ({ commandeId: `local-${nom}` }),
    etatCommande: async () => 'livre',
    ecrireZone: async () => undefined,
    codeTransfert: async () => 'CODE-LOCAL-TRANSFERT',
  };
}
