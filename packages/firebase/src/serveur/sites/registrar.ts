import { ErreurMetier } from '@ph/core/erreurs';
import type { EnregistrementAttendu, TitulaireDomaine } from '@ph/core/sites';
import { createHash } from 'node:crypto';
import type { RegistrarDomaines } from './achatDomaine';

type Fetch = typeof fetch;
const DELAI = 10_000;
const BASE = 'https://eu.api.ovh.com/1.0';
const PROD = 'https://api.gandi.net/v5';
/** Bac à sable Gandi : tout est simulé, rien n'est acheté (essais en recette). */
const BAC_A_SABLE = 'https://api.sandbox.gandi.net/v5';

/** Téléphone au format des registres : `+33.556123456`. */
const telRegistre = (e164: string) => e164.replace(/^\+(\d{2})/, '+$1.');

export interface ClesOvh {
  cleApplication: string;
  secretApplication: string;
  cleConsommateur: string;
}

/** Signature OVH : `$1$` + SHA1(secret+consommateur+méthode+url+corps+horodatage). */
export function signatureOvh(
  c: ClesOvh,
  methode: string,
  url: string,
  corps: string,
  horodatage: number,
): string {
  const brut = [c.secretApplication, c.cleConsommateur, methode, url, corps, horodatage].join('+');
  return `$1$${createHash('sha1').update(brut).digest('hex')}`;
}

/**
 * OVHcloud (compte client ordinaire, sans programme revendeur ; DOMAINES §3) : disponibilité par panier, commande au nom de
 * l'entreprise (contact titulaire = raison sociale, SIREN, siège ; Portail Travaux reste contact
 * technique par le compte), zone DNS (A et CNAME seulement, MX jamais touchés), code de transfert.
 */
export function registrarOvh(
  c: ClesOvh,
  f: Fetch = fetch,
  horloge: () => number = Date.now,
): RegistrarDomaines {
  const api = async <T>(methode: string, chemin: string, corps?: unknown): Promise<T> => {
    const url = `${BASE}${chemin}`;
    const texte = corps === undefined ? '' : JSON.stringify(corps);
    const t = Math.floor(horloge() / 1000);
    const r = await f(url, {
      method: methode,
      headers: {
        'content-type': 'application/json',
        'X-Ovh-Application': c.cleApplication,
        'X-Ovh-Consumer': c.cleConsommateur,
        'X-Ovh-Timestamp': String(t),
        'X-Ovh-Signature': signatureOvh(c, methode, url, texte, t),
      },
      ...(texte ? { body: texte } : {}),
      signal: AbortSignal.timeout(DELAI),
    });
    if (!r.ok)
      throw new ErreurMetier('INDISPONIBLE', `Bureau d’enregistrement indisponible (${r.status}).`);
    return (await r.json().catch(() => null)) as T;
  };
  const panier = async () =>
    (await api<{ cartId: string }>('POST', '/order/cart', { ovhSubsidiary: 'FR' })).cartId;
  return {
    fournisseur: 'ovh',
    async disponibilite(noms) {
      const id = await panier();
      return Promise.all(
        noms.map(async (nom) => {
          const offres = await api<{ action: string; orderable: boolean }[]>(
            'GET',
            `/order/cart/${id}/domain?domain=${encodeURIComponent(nom)}`,
          ).catch(() => []);
          return { nom, libre: (offres ?? []).some((o) => o.action === 'create' && o.orderable) };
        }),
      );
    },
    async commander(nom, t: TitulaireDomaine) {
      const contact = await api<{ id: number }>('POST', '/me/contact', {
        legalForm: 'corporation',
        organisationName: t.organisation,
        companyNationalIdentificationNumber: t.siren,
        lastName: t.organisation,
        firstName: 'Service',
        email: t.email,
        phone: telRegistre(t.telephone),
        language: 'fr_FR',
        address: {
          line1: t.adresse.ligne1,
          zip: t.adresse.codePostal,
          city: t.adresse.ville,
          country: t.adresse.pays,
        },
      });
      const id = await panier();
      await api('POST', `/order/cart/${id}/assign`);
      const item = await api<{ itemId: number }>('POST', `/order/cart/${id}/domain`, {
        domain: nom,
        duration: 'P1Y',
      });
      await api('POST', `/order/cart/${id}/item/${item.itemId}/configuration`, {
        label: 'OWNER_CONTACT',
        value: `/me/contact/${contact.id}`,
      });
      const commande = await api<{ orderId: number }>('POST', `/order/cart/${id}/checkout`, {
        autoPayWithPreferredPaymentMethod: true,
        waiveRetractationPeriod: true,
      });
      return { commandeId: String(commande.orderId) };
    },
    async etatCommande(commandeId) {
      const s = await api<string>('GET', `/me/order/${encodeURIComponent(commandeId)}/status`);
      if (s === 'delivered') return 'livre';
      return s === 'cancelled' || s === 'notPaid' ? 'echec' : 'en_cours';
    },
    async ecrireZone(nom, lignes: EnregistrementAttendu[]) {
      // Domaine livré : OVH le laisse en renouvellement manuel ; on le passe en automatique
      // (payé par le moyen de paiement du compte) pour qu'il n'expire jamais sans prévenir.
      await api('PUT', `/domain/${encodeURIComponent(nom)}/serviceInfos`, {
        renew: { automatic: true, deleteAtExpiration: false, forced: false, period: 12 },
      });
      const zone = `/domain/zone/${encodeURIComponent(nom)}`;
      // Anciennes cibles du domaine nu et de www (page d'attente OVH) : A, AAAA, CNAME seulement.
      for (const sous of ['', 'www']) {
        const ids = await api<number[]>('GET', `${zone}/record?subDomain=${sous}`);
        for (const id of ids ?? []) {
          const r = await api<{ fieldType: string }>('GET', `${zone}/record/${id}`);
          if (['A', 'AAAA', 'CNAME'].includes(r.fieldType))
            await api('DELETE', `${zone}/record/${id}`);
        }
      }
      for (const l of lignes)
        await api('POST', `${zone}/record`, {
          fieldType: l.type,
          subDomain: l.nom === '@' ? '' : l.nom,
          target: l.type === 'CNAME' ? `${l.valeur}.` : l.valeur,
          ttl: 3600,
        });
      await api('POST', `${zone}/refresh`);
    },
    async codeTransfert(nom) {
      await api('PUT', `/domain/${encodeURIComponent(nom)}`, { transferLockStatus: 'unlocked' });
      return api<string>('GET', `/domain/${encodeURIComponent(nom)}/authInfo`);
    },
  };
}

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
 * Bureau d'enregistrement selon l'environnement : OVH si ses trois clés sont présentes (le moins
 * cher en renouvellement), sinon Gandi si son jeton est présent (bac à sable si
 * `GANDI_BAC_A_SABLE=1`) ; en production
 * sans clés, achat indisponible (message clair) ; ailleurs (émulateurs, e2e), un bureau local :
 * disponibilité lue dans le DNS public (« pris » dans le nom : indisponible), commande livrée
 * aussitôt.
 */
export function registrarDepuisEnv(
  env: Record<string, string | undefined> = process.env,
): RegistrarDomaines {
  if (env.OVH_APP_KEY && env.OVH_APP_SECRET && env.OVH_CONSUMER_KEY)
    return registrarOvh({
      cleApplication: env.OVH_APP_KEY,
      secretApplication: env.OVH_APP_SECRET,
      cleConsommateur: env.OVH_CONSUMER_KEY,
    });
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
