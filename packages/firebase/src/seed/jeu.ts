import { claimsUtilisateur, type ClaimsUtilisateur } from '@ph/core/equipe';
import type { Bareme } from '@ph/core/leads';
import { SCHEMAS } from '@ph/core/schemas';
import { calculerStatsPublic } from '@ph/core/stats';
import type { z } from '@ph/core/zod';
import { chemins, collections } from '../chemins';
import { genererAppelsOffres, genererAvis, genererDemandes } from './activite';
import {
  genererAdmin,
  genererCasLimites,
  genererEntreprises,
  type CompteSeed,
  type ContexteSeed,
  type EntrepriseSeed,
} from './entreprises';
import { creerHasard } from './hasard';
import {
  documentsReferentiel,
  referentielPrix,
  type Documents,
  type FichiersSeed,
} from './referentiel';

export interface JeuSeed {
  documents: Documents;
  comptes: CompteSeed[];
  claims: Map<string, ClaimsUtilisateur>;
}

/**
 * Jeu de données complet (COMPTES §6.4), déterministe pour une graine et une date données.
 * Aucun accès réseau ni disque : le script `pnpm seed` écrit le résultat.
 */
export function genererJeu(
  f: FichiersSeed & { bareme: { bareme: Bareme } },
  graine: number,
  maintenant: Date,
): JeuSeed {
  const c: ContexteSeed = {
    h: creerHasard(graine),
    f,
    maintenant,
    docs: documentsReferentiel(f, maintenant),
    comptes: [],
    appartenances: [],
  };
  genererAdmin(c);
  const entreprises = genererEntreprises(c);
  genererCasLimites(c);
  const sources = genererDemandes(c, entreprises, referentielPrix(f));
  genererAppelsOffres(c, sources, f.bareme.bareme);
  const notes = genererAvis(c, entreprises);
  publierFiches(c, entreprises, notes);
  publierStats(c);
  return { documents: c.docs, comptes: c.comptes, claims: calculerClaims(c) };
}

/** `stats/public` tel que le recalcul nocturne le produira (INTEGRATIONS §3). */
function publierStats(c: ContexteSeed) {
  const de = (collection: string) =>
    [...c.docs].filter(([p]) => p.split('/').length === 2 && p.startsWith(`${collection}/`));
  const valeurs = (collection: string) => de(collection).map(([, d]) => d);
  c.docs.set(chemins.statsPublic(), {
    schemaVersion: 1,
    ...calculerStatsPublic({
      maintenant: c.maintenant,
      artisans: valeurs(collections.artisansPublic).map((d) => ({
        enLigne: d.enLigne as boolean,
        ville: d.ville as string,
      })),
      demandes: valeurs(collections.demandes).map((d) => ({ createdAt: d.createdAt as Date })),
      avis: valeurs(collections.avis).map((d) => ({
        statut: d.statut as string,
        note: d.note as number,
      })),
      nbDossiersDiag: de(collections.dossiersDiag).length,
    }),
    updatedAt: c.maintenant,
  });
}

/** Notes recalculées sur les avis publiés, fiche publique pour chaque entreprise en ligne. */
function publierFiches(
  c: ContexteSeed,
  entreprises: EntrepriseSeed[],
  notes: Map<string, number[]>,
) {
  for (const e of entreprises) {
    const doc = c.docs.get(chemins.artisan(e.id))!;
    const liste = notes.get(e.id) ?? [];
    const moyenne = liste.length
      ? Math.round((liste.reduce((a, b) => a + b, 0) / liste.length) * 10) / 10
      : 0;
    doc.noteMoyenne = moyenne;
    doc.nbAvis = liste.length;
    if (!e.enLigne) continue;
    const zone = doc.zoneIntervention as { centre: unknown; geohash: string; rayonKm: number };
    c.docs.set(chemins.artisanPublic(e.id), {
      schemaVersion: 1,
      slug: doc.slug,
      nomCommercial: doc.nomCommercial,
      metiers: doc.metiers,
      metierPrincipal: doc.metierPrincipal,
      intentions: doc.intentions,
      tags: doc.tags,
      pitch: doc.pitch,
      description: doc.description,
      ville: e.ville.nom,
      geo: zone.centre,
      geohash: zone.geohash,
      rayonKm: zone.rayonKm,
      labels: doc.labels,
      noteMoyenne: moyenne,
      nbAvis: liste.length,
      notesCriteres: {},
      budgetCle: doc.budgetCle,
      delaiDispoJours: doc.delaiDispoJours,
      premium: e.plan === 'premium',
      telephone: e.plan === 'gratuit' ? null : doc.telephonePublic,
      scoreClassement: Math.round((moyenne * 12 + liste.length * 0.4) * 100) / 100,
      enLigne: true,
      updatedAt: c.maintenant,
    });
  }
}

function calculerClaims(c: ContexteSeed): Map<string, ClaimsUtilisateur> {
  const claims = new Map<string, ClaimsUtilisateur>();
  for (const compte of c.comptes) {
    const user = c.docs.get(chemins.user(compte.uid))!;
    const admin = c.docs.get(chemins.admin(compte.uid)) as
      { role: string; actif: boolean; permissionsEffectives: string[] } | undefined;
    claims.set(
      compte.uid,
      claimsUtilisateur({
        roles: user.roles as ('particulier' | 'artisan')[],
        membres: c.appartenances.filter((a) => a.uid === compte.uid),
        admin,
      }),
    );
    const entreprises = c.appartenances.filter((a) => a.uid === compte.uid).map((a) => a.artisanId);
    user.entreprises = entreprises;
    if (entreprises[0]) user.entrepriseActive = entreprises[0];
  }
  return claims;
}

/** Schéma Zod d'un chemin de document (motifs de `SCHEMAS`, `{}` = identifiant). */
export function schemaPour(chemin: string): z.ZodType | undefined {
  const segments = chemin.split('/');
  for (const [motif, schema] of Object.entries(SCHEMAS)) {
    const m = motif.split('/');
    if (m.length === segments.length && m.every((s, i) => s === '{}' || s === segments[i]))
      return schema as z.ZodType;
  }
  return undefined;
}

/** Valide chaque document ; renvoie les erreurs (chemin et premier problème). */
export function validerDocuments(docs: Documents): string[] {
  const erreurs: string[] = [];
  for (const [chemin, donnees] of docs) {
    const schema = schemaPour(chemin);
    if (!schema) {
      erreurs.push(`${chemin} : aucun schéma`);
      continue;
    }
    const r = schema.safeParse(donnees);
    if (!r.success)
      erreurs.push(
        `${chemin} : ${r.error.issues[0]!.path.join('.')} ${r.error.issues[0]!.message}`,
      );
  }
  return erreurs;
}
