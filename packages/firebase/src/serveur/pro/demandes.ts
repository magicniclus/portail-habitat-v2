import { ErreurMetier } from '@ph/core/erreurs';
import { artisanAAccepte, masquerCoordonnees } from '@ph/core/espace';
import {
  etatPro,
  STATUTS_ATTRIBUTION,
  transitionAttribution,
  type ActionAttribution,
  type EtatPro,
  type StatutAttributionPro,
} from '@ph/core/espace-pro';
import { peut, type Membre } from '@ph/core/equipe';
import { DELAI_CONTESTATION_MS } from '@ph/core/leads';
import { texteAides, type NiveauPartenaire } from '@ph/core/partenaires';
import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import { chemins, GROUPE_ATTRIBUTIONS } from '../../chemins';

export interface ServicesDemandesPro {
  db: Firestore;
  horloge: () => number;
  /** Nom lisible d'une prestation ; l'identifiant sinon. */
  nomPrestation: (id: string) => string;
}

/** Demande telle que l'artisan la voit (PRO-02 : coordonnées seulement après acceptation). */
export interface DemandePro {
  demandeId: string;
  reference: string;
  titre: string;
  ville: string;
  codePostal: string;
  precisions: string;
  estimation: { minCentimes: number; maxCentimes: number };
  proposeeLe: number;
  statut: StatutAttributionPro;
  etat: EtatPro;
  /** « Prénom N. » avant acceptation, nom complet ensuite. */
  particulier: string;
  contact?: { email: string; telephone: string };
  assigneA?: { uid: string; nom: string };
  /** Demande d'un site partenaire : niveau de qualification et aides estimées (IMP-06). */
  niveau?: NiveauPartenaire;
  aides?: string;
  /** Appel d'offres débloqué depuis moins de 7 jours : contestable (DATABASE §5). */
  contestable?: { appelOffresId: string };
  /** Texte de recherche (sans coordonnées avant acceptation). */
  recherche: string;
}

/**
 * Attributions de l'entreprise, les plus récentes d'abord. Requête collection group
 * `artisanId ==`, `statut in`, `proposeeLe` décroissant : index existant (DATABASE §9).
 */
export async function lireDemandesPro(
  s: ServicesDemandesPro,
  artisanId: string,
  limite = 100,
): Promise<DemandePro[]> {
  const attributions = await s.db
    .collectionGroup(GROUPE_ATTRIBUTIONS)
    .where('artisanId', '==', artisanId)
    .where('statut', 'in', [...STATUTS_ATTRIBUTION])
    .orderBy('proposeeLe', 'desc')
    .limit(limite)
    .get();
  const docs = attributions.docs.filter((a) => a.ref.parent.parent?.parent.id === 'demandes');
  if (!docs.length) return [];
  const demandes = await s.db.getAll(
    ...docs.map((a) => s.db.doc(chemins.demande(a.get('demandeId')))),
  );
  const uids = [
    ...new Set(docs.map((a) => a.get('assigneA') as string | undefined).filter(Boolean)),
  ];
  const noms = new Map(
    uids.length
      ? (await s.db.getAll(...uids.map((u) => s.db.doc(chemins.user(u!))))).map((u) => [
          u.id,
          (u.get('nomAffiche') as string | undefined) ?? 'Un membre',
        ])
      : [],
  );
  return docs.flatMap((a, i) => {
    const d = demandes[i];
    if (!d?.exists) return [];
    const statut = a.get('statut') as StatutAttributionPro;
    const accepte = artisanAAccepte(statut);
    const c = d.get('contact') as { prenom: string; nom: string; email: string; telephone: string };
    const particulier = accepte
      ? `${c.prenom} ${c.nom}`.trim()
      : `${c.prenom}${c.nom ? ` ${c.nom[0]}.` : ''}`;
    const brut = (d.get('precisions') as string | undefined) ?? '';
    const precisions = accepte ? brut : masquerCoordonnees(brut).texte;
    const titre = s.nomPrestation(d.get('prestationId'));
    const adresse = d.get('adresseChantier') as { ville: string; codePostal: string };
    const assigne = a.get('assigneA') as string | undefined;
    const niveau = d.get('qualification.niveau') as NiveauPartenaire | undefined;
    const aides = d.get('aides') as Parameters<typeof texteAides>[0] | undefined;
    const texte = aides ? texteAides(aides) : null;
    const appelOffresId = a.get('appelOffresId') as string | undefined;
    const reponduLe = (a.get('reponduLe') as Timestamp | undefined)?.toMillis() ?? 0;
    const contestable =
      appelOffresId && s.horloge() - reponduLe <= DELAI_CONTESTATION_MS ? { appelOffresId } : null;
    return [
      {
        demandeId: d.id,
        reference: d.get('reference'),
        titre,
        ville: adresse.ville,
        codePostal: adresse.codePostal,
        precisions,
        estimation: {
          minCentimes: d.get('estimation.minCentimes'),
          maxCentimes: d.get('estimation.maxCentimes'),
        },
        proposeeLe: (a.get('proposeeLe') as Timestamp).toMillis(),
        statut,
        etat: etatPro(statut),
        particulier,
        ...(accepte ? { contact: { email: c.email, telephone: c.telephone } } : {}),
        ...(assigne ? { assigneA: { uid: assigne, nom: noms.get(assigne) ?? 'Un membre' } } : {}),
        ...(niveau ? { niveau } : {}),
        ...(texte ? { aides: texte } : {}),
        ...(contestable ? { contestable } : {}),
        recherche: `${particulier} ${titre} ${adresse.ville} ${adresse.codePostal} ${precisions}`,
      },
    ];
  });
}

/** Membre actif relu dans la transaction : un membre retiré perd l'accès immédiatement (EQU-05). */
async function membreActif(
  t: FirebaseFirestore.Transaction,
  db: Firestore,
  artisanId: string,
  uid: string,
) {
  const m = await t.get(db.doc(chemins.membre(artisanId, uid)));
  const membre = m.data() as Membre | undefined;
  if (!peut(membre, 'demandes.repondre')) throw new ErreurMetier('PERMISSION_REFUSEE');
  return membre!;
}

/** Ouvrir, accepter ou refuser une demande (PRO-02) : transaction, transitions de `transitionAttribution`. */
export async function repondreDemande(
  s: { db: Firestore; horloge: () => number },
  ctx: { artisanId: string; uid: string },
  e: { demandeId: string; action: ActionAttribution; motif?: string },
): Promise<{ statut: StatutAttributionPro }> {
  const ref = s.db.doc(chemins.attribution(e.demandeId, ctx.artisanId));
  return s.db.runTransaction(async (t) => {
    await membreActif(t, s.db, ctx.artisanId, ctx.uid);
    const a = await t.get(ref);
    if (!a.exists) throw new ErreurMetier('INTROUVABLE');
    const avant = a.get('statut') as StatutAttributionPro;
    const apres = transitionAttribution(avant, e.action);
    if (!apres)
      throw new ErreurMetier('CONFLIT', 'Cette demande a déjà reçu une réponse ou a expiré.');
    if (apres === avant) return { statut: avant };
    const maintenant = Timestamp.fromMillis(s.horloge());
    const siVue = a.get('expireLeSiVue') as Timestamp | undefined;
    t.update(ref, {
      statut: apres,
      ...(e.action === 'voir'
        ? { vueLe: maintenant, ...(siVue ? { expireLe: siVue } : {}) }
        : { reponduLe: maintenant }),
      ...(apres === 'acceptee' ? { coordonneesDebloquees: true } : {}),
      ...(apres === 'refusee' && e.motif ? { motifRefus: e.motif } : {}),
    });
    return { statut: apres };
  });
}

/**
 * « Je m'en occupe » (PRO-03, COMPTES §4.6) : la demande est assignée au membre ; les autres voient
 * qui la traite. Reprendre une demande déjà assignée à quelqu'un d'autre : propriétaire ou gérant.
 */
export async function prendreEnCharge(
  s: { db: Firestore },
  ctx: { artisanId: string; uid: string },
  demandeId: string,
): Promise<void> {
  const ref = s.db.doc(chemins.attribution(demandeId, ctx.artisanId));
  await s.db.runTransaction(async (t) => {
    const membre = await membreActif(t, s.db, ctx.artisanId, ctx.uid);
    const a = await t.get(ref);
    if (!a.exists) throw new ErreurMetier('INTROUVABLE');
    const actuel = a.get('assigneA') as string | undefined;
    if (actuel && actuel !== ctx.uid && membre.role !== 'proprietaire' && membre.role !== 'gerant')
      throw new ErreurMetier('CONFLIT', 'Un autre membre de l’équipe traite déjà cette demande.');
    t.update(ref, { assigneA: ctx.uid });
  });
}

/**
 * Ouverture de Mes demandes : les propositions affichées passent à « vue » (une demande partenaire
 * retrouve alors son délai normal au lieu des 2 h). Écrit seulement s'il y a du nouveau.
 */
export async function marquerDemandesVues(
  s: { db: Firestore; horloge: () => number },
  artisanId: string,
): Promise<number> {
  const proposees = await s.db
    .collectionGroup(GROUPE_ATTRIBUTIONS)
    .where('artisanId', '==', artisanId)
    .where('statut', '==', 'proposee')
    .limit(50)
    .get();
  if (proposees.empty) return 0;
  const maintenant = Timestamp.fromMillis(s.horloge());
  const lot = s.db.batch();
  for (const a of proposees.docs) {
    const siVue = a.get('expireLeSiVue') as Timestamp | undefined;
    lot.update(a.ref, { statut: 'vue', vueLe: maintenant, ...(siVue ? { expireLe: siVue } : {}) });
  }
  await lot.commit();
  return proposees.size;
}
