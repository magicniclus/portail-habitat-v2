import { ErreurMetier } from '@ph/core/erreurs';
import {
  enregistrementsAchat,
  EXTENSIONS_ACHAT,
  normaliserDomaine,
  suggestionsDomaine,
  titulaireDomaine,
  type EnregistrementAttendu,
  type TitulaireDomaine,
} from '@ph/core/sites';
import { FieldValue, Timestamp, type DocumentData } from 'firebase-admin/firestore';
import { chemins } from '../../chemins';
import { verifierDomaineSite, type ServicesDomaines } from './domaines';
import { exigerSite, type ContexteSite } from './edition';

/**
 * Bureau d'enregistrement (OVHcloud, compte revendeur) : seul le serveur l'appelle (DOMAINES §6).
 * Aucune commande avant le paiement de Site Pro confirmé (DOM-02).
 */
export interface RegistrarDomaines {
  fournisseur: string;
  disponibilite(noms: string[]): Promise<{ nom: string; libre: boolean }[]>;
  /** Commande au nom de l'entreprise de l'artisan (DOM-03) ; renouvellement automatique. */
  commander(nom: string, titulaire: TitulaireDomaine): Promise<{ commandeId: string }>;
  etatCommande(commandeId: string): Promise<'en_cours' | 'livre' | 'echec'>;
  /** Zone DNS : A et CNAME de l'hébergeur ; les MX ne sont jamais touchés (DOM-08). */
  ecrireZone(nom: string, enregistrements: EnregistrementAttendu[]): Promise<void>;
  /** Code de transfert (AuthCode), envoyé à l'artisan à la résiliation (DOM-07). */
  codeTransfert(nom: string): Promise<string>;
}

export interface ServicesAchatDomaine extends ServicesDomaines {
  registrar: RegistrarDomaines;
}

const MINUTE = 60_000;
/** Une commande non livrée après 48 h passe en échec (le support est prévenu par le journal). */
const DELAI_LIVRAISON = 48 * 60 * MINUTE;
const CACHE_DISPO = 10 * MINUTE;
const cacheDispo = new Map<string, { libre: boolean; lu: number }>();

async function journal(s: ServicesAchatDomaine, siteId: string, action: string, resultat: string) {
  await s.db.collection(chemins.journalDomaine(siteId)).add({
    schemaVersion: 1,
    action,
    resultat: resultat.slice(0, 300),
    le: Timestamp.fromMillis(s.horloge()),
  });
}

/** Libre chez le bureau d'enregistrement (cache 10 min) et pas déjà relié chez nous. */
async function disponibles(s: ServicesAchatDomaine, noms: string[]) {
  const maintenant = s.horloge();
  const aLire = noms.filter((n) => {
    const c = cacheDispo.get(n);
    return !c || maintenant - c.lu > CACHE_DISPO;
  });
  if (aLire.length)
    for (const r of await s.registrar.disponibilite(aLire))
      cacheDispo.set(r.nom, { libre: r.libre, lu: maintenant });
  if (cacheDispo.size > 5000) cacheDispo.clear();
  const index = await Promise.all(noms.map((n) => s.db.doc(chemins.domaineSite(n)).get()));
  return noms.map((nom, i) => ({
    nom,
    libre: Boolean(cacheDispo.get(nom)?.libre) && !index[i]!.exists,
  }));
}

/**
 * Recherche (DOMAINES §3.1) : la saisie de l'artisan ou le nom de son entreprise, en .fr, .com,
 * .eu et `nom-ville.fr`, avec leur disponibilité. Réservé à qui gère le site.
 */
export async function rechercherDomaines(
  s: ServicesAchatDomaine,
  ctx: ContexteSite,
  requete?: string,
): Promise<{ nom: string; libre: boolean }[]> {
  await s.db.runTransaction((t) => exigerSite(s, t, ctx));
  const artisan = await s.db.doc(chemins.artisan(ctx.artisanId)).get();
  const ville = artisan.get('adresseSiege.ville') as string | undefined;
  const noms = suggestionsDomaine({
    nomCommercial: (artisan.get('nomCommercial') as string | undefined) ?? '',
    ...(ville ? { ville } : {}),
    ...(requete ? { requete } : {}),
  }).slice(0, 8);
  return noms.length ? disponibles(s, noms) : [];
}

const enCours = (d: DocumentData | undefined) =>
  Boolean(d && !['echec', 'resilie'].includes(d.statut as string));

/**
 * « Choisir ce domaine » (un clic) : avec Site Pro, la commande part tout de suite ; sans Site
 * Pro, le domaine est retenu et la commande partira au paiement confirmé (webhook, DOM-02). La
 * fiche doit permettre d'acheter au nom de l'entreprise (DOM-03).
 */
export async function choisirDomaine(
  s: ServicesAchatDomaine,
  ctx: ContexteSite,
  saisie: string,
): Promise<{ paiement: boolean; nom: string }> {
  const nom = normaliserDomaine(saisie);
  const ext = nom?.split('.').at(-1);
  if (
    !nom ||
    nom.split('.').length !== 2 ||
    !(EXTENSIONS_ACHAT as readonly string[]).includes(ext!)
  )
    throw new ErreurMetier('ENTREE_INVALIDE', 'Domaine en .fr, .com ou .eu uniquement.');
  const artisan = await s.db.doc(chemins.artisan(ctx.artisanId)).get();
  const t = titulaireDomaine(artisan.data() ?? {});
  if (!t.ok)
    throw new ErreurMetier(
      'PRECONDITION',
      `Pour acheter le domaine à votre nom, complétez votre fiche : ${t.manquants.join(', ')}.`,
    );
  if (!(await disponibles(s, [nom]))[0]!.libre)
    throw new ErreurMetier('CONFLIT', 'Ce domaine n’est plus disponible.');
  const ref = s.db.doc(chemins.site(ctx.artisanId));
  const maintenant = Timestamp.fromMillis(s.horloge());
  const paiement = await s.db.runTransaction(async (tx) => {
    await exigerSite(s, tx, ctx);
    const site = await tx.get(ref);
    if (!site.exists) throw new ErreurMetier('INTROUVABLE');
    if (enCours(site.get('domaine') as DocumentData | undefined))
      throw new ErreurMetier('PRECONDITION', 'Retirez d’abord le domaine actuel.');
    if (site.get('offre') !== 'site_pro') {
      tx.update(ref, { domaineVoulu: { nom, choisiLe: maintenant }, updatedAt: maintenant });
      return true;
    }
    tx.update(ref, {
      domaine: domaineAchat(nom, maintenant),
      domaineVoulu: FieldValue.delete(),
      updatedAt: maintenant,
    });
    return false;
  });
  await journal(s, ctx.artisanId, 'choix', paiement ? `${nom} : attente du paiement` : nom);
  if (!paiement) await avancerDomaine(s, ctx.artisanId).catch(() => undefined);
  return { paiement, nom };
}

/** Domaine en commande, repris par la vérification planifiée (toutes les 2 min). */
export function domaineAchat(nom: string, le: Timestamp) {
  return {
    nom,
    mode: 'achat',
    statut: 'commande',
    principal: 'www',
    registrar: { etape: 'a_commander' },
    enregistrements: [],
    prochaineVerifLe: le,
    creeLe: le,
  };
}

/**
 * Étape suivante d'un domaine (Function `verifierDomaines` et après chaque action) :
 * commande → livraison → zone DNS et hébergeur → vérification HTTPS (statut `actif`, email) ;
 * à la résiliation d'un domaine acheté, envoi du code de transfert. Sinon, vérification DNS.
 */
export async function avancerDomaine(
  s: ServicesAchatDomaine,
  siteId: string,
): Promise<string | null> {
  const ref = s.db.doc(chemins.site(siteId));
  const site = await ref.get();
  const d = site.get('domaine') as DocumentData | undefined;
  if (!d) return null;
  const maintenant = s.horloge();
  const plusTard = (min: number) => Timestamp.fromMillis(maintenant + min * MINUTE);
  const nom = d.nom as string;
  if (d.mode === 'achat' && d.statut === 'resilie' && !d.registrar?.authCodeEnvoyeLe)
    return envoyerCodeTransfert(s, siteId, nom);
  if (d.mode !== 'achat' || d.statut !== 'commande') return verifierDomaineSite(s, siteId);
  const echec = async (raison: string) => {
    await ref.update({
      'domaine.statut': 'echec',
      'domaine.prochaineVerifLe': FieldValue.delete(),
      updatedAt: Timestamp.fromMillis(maintenant),
    });
    await journal(s, siteId, 'echec', raison);
    return 'echec';
  };
  if (d.registrar?.etape === 'a_commander') {
    if (site.get('offre') !== 'site_pro') return echec('Site Pro inactif : aucune commande');
    const artisan = await s.db.doc(chemins.artisan(siteId)).get();
    const t = titulaireDomaine(artisan.data() ?? {});
    if (!t.ok) return echec(`Fiche incomplète : ${t.manquants.join(', ')}`);
    const { commandeId } = await s.registrar.commander(nom, t.titulaire);
    await ref.update({
      'domaine.registrar': {
        fournisseur: s.registrar.fournisseur,
        etape: 'commandee',
        commandeId,
        commandeLe: Timestamp.fromMillis(maintenant),
      },
      'domaine.prochaineVerifLe': plusTard(2),
    });
    await journal(s, siteId, 'commande', `${nom} : commande ${commandeId}`);
    return 'commande';
  }
  const etat = await s.registrar.etatCommande(d.registrar.commandeId as string);
  if (etat === 'echec') return echec(`Commande ${d.registrar.commandeId} refusée`);
  if (etat === 'en_cours') {
    if (maintenant - (d.creeLe as Timestamp).toMillis() > DELAI_LIVRAISON)
      return echec('Commande non livrée après 48 h');
    await ref.update({ 'domaine.prochaineVerifLe': plusTard(2) });
    return 'commande';
  }
  // Livré : hébergeur d'abord (il donne les valeurs), puis la zone DNS, puis la vérification.
  const lignes = enregistrementsAchat(await s.hebergeur.ajouterDomaine(nom));
  await s.registrar.ecrireZone(nom, lignes);
  await ref.update({
    'domaine.statut': 'verification',
    'domaine.registrar.etape': 'livre',
    'domaine.enregistrements': lignes.map((e) => ({ ...e, etat: 'en_attente' })),
    'domaine.prochaineVerifLe': Timestamp.fromMillis(maintenant),
    'domaine.creeLe': Timestamp.fromMillis(maintenant),
  });
  await journal(
    s,
    siteId,
    'zone',
    `${nom} : ${lignes.map((l) => `${l.type} ${l.nom}`).join(', ')}`,
  );
  return verifierDomaineSite(s, siteId);
}

/** DOM-07 : Site Pro résilié, le domaine reste à l'artisan ; son code de transfert lui est envoyé. */
async function envoyerCodeTransfert(s: ServicesAchatDomaine, siteId: string, nom: string) {
  const ref = s.db.doc(chemins.site(siteId));
  const authCode = await s.registrar.codeTransfert(nom);
  const artisan = await s.db.doc(chemins.artisan(siteId)).get();
  const uid = artisan.get('proprietaireUid') as string | undefined;
  if (uid)
    await s.notifier({
      modele: 'site-domaine-transfert',
      destinataire: { uid, artisanId: siteId },
      refObjet: `sites/${siteId}`,
      variante: `${nom}:transfert`,
      donnees: {
        nomCommercial: (artisan.get('nomCommercial') as string | undefined) ?? '',
        domaine: nom,
        authCode,
        lien: '/pro/site?onglet=domaine',
      },
    });
  // Le code n'est jamais gardé : seule la date d'envoi l'est.
  await ref.update({
    'domaine.registrar.authCodeEnvoyeLe': Timestamp.fromMillis(s.horloge()),
    'domaine.prochaineVerifLe': FieldValue.delete(),
  });
  await journal(s, siteId, 'transfert', `${nom} : code de transfert envoyé`);
  return 'resilie';
}
