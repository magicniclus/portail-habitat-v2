import { ErreurMetier } from '@ph/core/erreurs';
import {
  enregistrementsConnexion,
  etatEnregistrement,
  fqdn,
  hotesDuDomaine,
  normaliserDomaine,
  suiteVerification,
  type ConfigHebergeur,
  type EnregistrementAttendu,
} from '@ph/core/sites';
import { randomBytes } from 'node:crypto';
import { FieldValue, Timestamp, type DocumentData } from 'firebase-admin/firestore';
import { chemins, collections } from '../../chemins';
import type { Notifier } from '../comptes/services';
import { exigerSite, type ContexteSite, type ServicesSites } from './edition';

/** Hébergeur des sites (Vercel) : seul le serveur l'appelle, jamais le navigateur (DOMAINES §6). */
export interface HebergeurSites {
  ajouterDomaine(nom: string): Promise<ConfigHebergeur>;
  /** Demande de vérification et de certificat ; `true` quand le domaine est servi en HTTPS. */
  verifierDomaine(nom: string): Promise<boolean>;
  retirerDomaine(nom: string): Promise<void>;
}

/** Résolveur public (1.1.1.1, 8.8.8.8), jamais le cache local. */
export interface ResolveurDns {
  resoudre(type: EnregistrementAttendu['type'], nom: string): Promise<string[]>;
}

export interface ServicesDomaines extends ServicesSites {
  hebergeur: HebergeurSites;
  dns: ResolveurDns;
  notifier: Notifier;
  jeton?: () => string;
}

/** 24 caractères [a-z0-9], générés une fois par (site, domaine). */
const jeton24 = () =>
  Array.from(randomBytes(24), (o) => 'abcdefghijklmnopqrstuvwxyz0123456789'[o % 36]).join('');

/** « Vérifier maintenant » : une fois toutes les 30 s au plus. */
const INTERVALLE_MANUEL = 30_000;

async function indexAilleurs(s: ServicesDomaines, nom: string, siteId: string) {
  const index = await Promise.all(
    hotesDuDomaine(nom).map((h) => s.db.doc(chemins.domaineSite(h)).get()),
  );
  return index.some((d) => d.exists && d.get('siteId') !== siteId);
}

/**
 * Cas C (DOMAINES §4) : l'artisan relie un domaine qu'il possède déjà. Site Pro obligatoire ;
 * domaine déjà actif sur un autre site → refus sans révéler lequel. Les enregistrements A et
 * CNAME viennent de l'hébergeur. L'index n'est écrit qu'après vérification (pas de squat).
 */
export async function connecterDomaine(
  s: ServicesDomaines,
  ctx: ContexteSite,
  saisie: string,
): Promise<void> {
  const nom = normaliserDomaine(saisie);
  if (!nom) throw new ErreurMetier('ENTREE_INVALIDE', 'Adresse de domaine invalide.');
  const ref = s.db.doc(chemins.site(ctx.artisanId));
  const site = await ref.get();
  if (!site.exists) throw new ErreurMetier('INTROUVABLE');
  if (site.get('offre') !== 'site_pro')
    throw new ErreurMetier('PRECONDITION', 'Le domaine personnel est inclus dans Site Pro.');
  if (await indexAilleurs(s, nom, ctx.artisanId))
    throw new ErreurMetier('CONFLIT', 'Ce domaine est déjà relié à un autre site.');
  const config = await s.hebergeur.ajouterDomaine(nom);
  const maintenant = Timestamp.fromMillis(s.horloge());
  const token = (s.jeton ?? jeton24)();
  await s.db.runTransaction(async (t) => {
    await exigerSite(s, t, ctx);
    const actuel = (await t.get(ref)).get('domaine') as DocumentData | undefined;
    if (actuel && actuel.statut === 'actif' && actuel.nom !== nom)
      throw new ErreurMetier('PRECONDITION', 'Retirez d’abord le domaine actuel.');
    t.update(ref, {
      domaine: {
        nom,
        mode: 'connexion',
        statut: 'attente_dns',
        principal: 'www',
        token,
        enregistrements: enregistrementsConnexion(token, config).map((e) => ({
          ...e,
          etat: 'en_attente',
        })),
        prochaineVerifLe: maintenant,
        creeLe: maintenant,
      },
      updatedAt: maintenant,
    });
  });
}

/** État de chaque enregistrement attendu, lu sur un résolveur public (DOM-04). */
export async function resoudreLignes(
  s: Pick<ServicesDomaines, 'dns'>,
  nom: string,
  enregistrements: EnregistrementAttendu[],
  maintenant: number,
) {
  return Promise.all(
    enregistrements.map(async (e) => {
      const trouves = await s.dns.resoudre(e.type, fqdn(nom, e.nom)).catch(() => []);
      const r = etatEnregistrement(e, trouves);
      return {
        type: e.type,
        nom: e.nom,
        valeur: e.valeur,
        etat: r.etat,
        ...(r.trouve ? { trouve: r.trouve.slice(0, 500) } : {}),
        verifieLe: Timestamp.fromMillis(maintenant),
      };
    }),
  );
}

const RAPPEL_ATTENTE = 24 * 3600 * 1000;

/** Email du cycle de vie du domaine au propriétaire de l'entreprise. */
async function notifierDomaine(
  s: ServicesDomaines,
  siteId: string,
  modele: 'site-domaine-actif' | 'site-domaine-echec' | 'site-domaine-attente',
  e: {
    nom: string;
    variante: string;
    manquants: string[];
    lignes?: { type: string; nom: string; valeur: string }[];
  },
) {
  const artisan = await s.db.doc(chemins.artisan(siteId)).get();
  const uid = artisan.get('proprietaireUid') as string | undefined;
  if (!uid) return;
  await s.notifier({
    modele,
    destinataire: { uid, artisanId: siteId },
    refObjet: `sites/${siteId}`,
    variante: e.variante,
    donnees: {
      nomCommercial: (artisan.get('nomCommercial') as string | undefined) ?? '',
      domaine: e.nom,
      manquants: e.manquants,
      ...(e.lignes ? { lignes: e.lignes } : {}),
      lien: '/pro/site?onglet=domaine',
    },
  });
}

/**
 * Vérification (planifiée ou « Vérifier maintenant ») : chaque ligne jugée seule (DOM-04) ; les
 * trois correctes → vérification chez l'hébergeur → index des hôtes écrit, statut `actif`, email.
 * Après 72 h sans succès : `echec`, email avec ce qui manque.
 */
export async function verifierDomaineSite(
  s: ServicesDomaines,
  siteId: string,
  o: { manuel?: boolean } = {},
): Promise<string | null> {
  const ref = s.db.doc(chemins.site(siteId));
  const site = await ref.get();
  const d = site.get('domaine') as DocumentData | undefined;
  if (!d || !['attente_dns', 'verification', 'echec'].includes(d.statut as string)) return null;
  const maintenant = s.horloge();
  const derniere = (d.derniereVerifLe as Timestamp | undefined)?.toMillis() ?? 0;
  if (o.manuel && maintenant - derniere < INTERVALLE_MANUEL)
    throw new ErreurMetier('TROP_DE_REQUETES', 'Patientez 30 secondes entre deux vérifications.');
  const nom = d.nom as string;
  const lignes = await resoudreLignes(s, nom, d.enregistrements, maintenant);
  const toutOk = lignes.every((l) => l.etat === 'ok');
  const servi = toutOk && (await s.hebergeur.verifierDomaine(nom));
  const creeLe = (d.creeLe as Timestamp).toMillis();
  const suite = servi ? null : suiteVerification(creeLe, maintenant);
  let statut: string = servi ? 'actif' : toutOk ? 'verification' : 'attente_dns';
  if (!servi && suite === null && !o.manuel) statut = 'echec';
  await s.db.runTransaction(async (t) => {
    const index = hotesDuDomaine(nom).map((h) => s.db.doc(chemins.domaineSite(h)));
    const existants = servi ? await Promise.all(index.map((r) => t.get(r))) : [];
    if (existants.some((x) => x.exists && x.get('siteId') !== siteId)) statut = 'echec';
    if (statut === 'actif')
      for (const [i, r] of index.entries())
        if (!existants[i]!.exists)
          t.create(r, { schemaVersion: 1, siteId, createdAt: Timestamp.fromMillis(maintenant) });
    t.update(ref, {
      'domaine.enregistrements': lignes,
      'domaine.statut': statut,
      'domaine.derniereVerifLe': Timestamp.fromMillis(maintenant),
      'domaine.prochaineVerifLe':
        statut === 'actif' || statut === 'echec' || suite === null
          ? FieldValue.delete()
          : Timestamp.fromMillis(suite),
      ...(statut === 'actif' ? { 'domaine.activeLe': Timestamp.fromMillis(maintenant) } : {}),
      updatedAt: Timestamp.fromMillis(maintenant),
    });
  });
  const manquants = lignes.filter((l) => l.etat !== 'ok');
  if (statut !== d.statut && (statut === 'actif' || statut === 'echec'))
    await notifierDomaine(
      s,
      siteId,
      statut === 'actif' ? 'site-domaine-actif' : 'site-domaine-echec',
      {
        nom,
        variante: `${nom}:${statut}`,
        manquants: manquants.map((l) => `${l.type} ${l.nom}`),
      },
    );
  // Rappel unique après 24 h sans DNS, avec le tableau des enregistrements (DOMAINES §7).
  if (
    statut === 'attente_dns' &&
    !o.manuel &&
    !d.rappelAttenteLe &&
    maintenant - creeLe >= RAPPEL_ATTENTE
  ) {
    await ref.update({ 'domaine.rappelAttenteLe': Timestamp.fromMillis(maintenant) });
    await notifierDomaine(s, siteId, 'site-domaine-attente', {
      nom,
      variante: `${nom}:attente`,
      manquants: manquants.map((l) => `${l.type} ${l.nom}`),
      lignes: manquants.map((l) => ({ type: l.type, nom: l.nom, valeur: l.valeur })),
    });
  }
  return statut;
}

/** Retrait du domaine par l'artisan : index supprimés, le site repasse sur le sous-domaine. */
export async function retirerDomaine(s: ServicesDomaines, ctx: ContexteSite): Promise<void> {
  const ref = s.db.doc(chemins.site(ctx.artisanId));
  let nom: string | undefined;
  await s.db.runTransaction(async (t) => {
    await exigerSite(s, t, ctx);
    const site = await t.get(ref);
    nom = site.get('domaine.nom') as string | undefined;
    if (!nom) return;
    const index = hotesDuDomaine(nom).map((h) => s.db.doc(chemins.domaineSite(h)));
    const lus = await Promise.all(index.map((r) => t.get(r)));
    for (const x of lus) if (x.get('siteId') === ctx.artisanId) t.delete(x.ref);
    t.update(ref, { domaine: FieldValue.delete(), updatedAt: Timestamp.fromMillis(s.horloge()) });
  });
  if (nom) await s.hebergeur.retirerDomaine(nom).catch(() => undefined);
}

/** Sites dont la vérification planifiée est due (Function `verifierDomaines`). */
export async function domainesAVerifier(s: ServicesSites, limite = 100): Promise<string[]> {
  const r = await s.db
    .collection(collections.sites)
    .where('domaine.prochaineVerifLe', '<=', Timestamp.fromMillis(s.horloge()))
    .limit(limite)
    .get();
  return r.docs.map((d) => d.id);
}
