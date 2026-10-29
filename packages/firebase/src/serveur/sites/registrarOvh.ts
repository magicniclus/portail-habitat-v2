import { ErreurMetier } from '@ph/core/erreurs';
import type { EnregistrementAttendu, TitulaireDomaine } from '@ph/core/sites';
import { createHash } from 'node:crypto';
import type { RegistrarDomaines } from './achatDomaine';

type Fetch = typeof fetch;
const DELAI = 10_000;
const BASE = 'https://eu.api.ovh.com/1.0';

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

/** Téléphone au format OVH : `+33.556123456`. */
const telOvh = (e164: string) => e164.replace(/^\+(\d{2})/, '+$1.');

/**
 * OVHcloud (compte revendeur, DOMAINES §3) : disponibilité par panier, commande au nom de
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
        phone: telOvh(t.telephone),
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
 * Bureau d'enregistrement selon l'environnement : OVH si ses clés sont présentes ; en production
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
  const indisponible = async (): Promise<never> => {
    throw new ErreurMetier('INDISPONIBLE', 'L’achat de domaine ouvre très bientôt.');
  };
  if (
    env.VERCEL_ENV === 'production' ||
    (env.NODE_ENV === 'production' && !env.FIRESTORE_EMULATOR_HOST)
  )
    return {
      fournisseur: 'ovh',
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
