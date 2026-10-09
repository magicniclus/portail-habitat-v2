import { ErreurMetier } from '@ph/core/erreurs';
import { completudeFiche, etapesMiseEnLigne, type EtatDecennale } from '@ph/core/espace-pro';
import type { Membre } from '@ph/core/equipe';
import type { Firestore } from 'firebase-admin/firestore';
import { chemins } from '../../chemins';

export interface ResumeArtisan {
  nomCommercial: string;
  logoUrl?: string;
  enLigne: boolean;
  plan: 'gratuit' | 'visibilite' | 'premium';
  optionVisibilite: boolean;
  ville: string;
  rayonKm: number;
}

export interface EspacePro {
  nomAffiche: string;
  /** Entreprises de la personne, pour le sélecteur (COMPTES §4.5). */
  entreprises: { artisanId: string; nomCommercial: string }[];
  /** Entreprise active, seulement si la personne en est membre actif. */
  active: { artisanId: string; membre: Membre; artisan: ResumeArtisan } | null;
}

const resume = (d: FirebaseFirestore.DocumentData): ResumeArtisan => ({
  nomCommercial: d.nomCommercial ?? '',
  ...(d.logoUrl ? { logoUrl: d.logoUrl as string } : {}),
  enLigne: d.enLigne === true,
  plan: d.plan ?? 'gratuit',
  optionVisibilite: d.optionVisibilite === true,
  ville: d.adresseSiege?.ville ?? '',
  rayonKm: d.zoneIntervention?.rayonKm ?? 0,
});

/** Cadre de l'espace pro : entreprise active, rôle, liste des entreprises (Admin SDK). */
export async function lireEspacePro(db: Firestore, uid: string): Promise<EspacePro> {
  const user = (await db.doc(chemins.user(uid)).get()).data() ?? {};
  const ids = (user.entreprises as string[] | undefined) ?? [];
  const activeId = (user.entrepriseActive as string | undefined) ?? ids[0];
  const [fiches, membre] = await Promise.all([
    ids.length ? db.getAll(...ids.map((id) => db.doc(chemins.artisan(id)))) : [],
    activeId ? db.doc(chemins.membre(activeId, uid)).get() : null,
  ]);
  const actif = membre?.exists && membre.get('statut') === 'actif';
  const ficheActive = fiches.find((f) => f.id === activeId);
  return {
    nomAffiche: (user.nomAffiche as string | undefined) ?? '',
    entreprises: fiches
      .filter((f) => f.exists)
      .map((f) => ({ artisanId: f.id, nomCommercial: f.get('nomCommercial') as string })),
    active:
      actif && activeId && ficheActive?.exists
        ? {
            artisanId: activeId,
            membre: membre!.data() as Membre,
            artisan: resume(ficheActive.data()!),
          }
        : null,
  };
}

/** Bascule d'entreprise (COMPTES §4.5) : l'appartenance active est vérifiée avant l'écriture. */
export async function choisirEntrepriseActive(
  db: Firestore,
  uid: string,
  artisanId: string,
): Promise<void> {
  const m = await db.doc(chemins.membre(artisanId, uid)).get();
  if (!m.exists || m.get('statut') !== 'actif') throw new ErreurMetier('PERMISSION_REFUSEE');
  await db.doc(chemins.user(uid)).update({ entrepriseActive: artisanId });
}

const ETATS: Record<string, EtatDecennale> = {
  en_attente: 'envoyee',
  valide: 'validee',
  refuse: 'refusee',
};

/** Tableau de bord (maquette Espace Artisan Dashboard) : indicateurs, complétude, mise en ligne. */
export async function tableauDeBordPro(db: Firestore, artisanId: string, uid: string) {
  const [artisan, user, decennales, realisations] = await Promise.all([
    db.doc(chemins.artisan(artisanId)).get(),
    db.doc(chemins.user(uid)).get(),
    db.collection(chemins.documents(artisanId)).where('type', '==', 'decennale').get(),
    db.collection(chemins.realisations(artisanId)).where('publie', '==', true).get(),
  ]);
  const a = artisan.data() ?? {};
  const derniere = decennales.docs
    .map((d) => d.data())
    .sort((x, y) => y.createdAt.toMillis() - x.createdAt.toMillis())[0];
  const telephoneVerifie = user.get('telephoneVerifie') === true;
  const completude = completudeFiche({
    metiers: (a.metiers as string[] | undefined) ?? [],
    zoneDefinie: Boolean(a.zoneIntervention?.rayonKm),
    telephoneVerifie,
    description: (a.description as string | undefined) ?? '',
    logo: Boolean(a.logoUrl),
    nbPhotos: realisations.docs.reduce(
      (t, r) => t + ((r.get('photos') as unknown[])?.length ?? 0),
      0,
    ),
    nbCertifications: ((a.labels as string[] | undefined) ?? []).length,
  });
  return {
    enLigne: a.enLigne === true,
    indicateurs: {
      demandesMois: (a.demandesRecuesMois as number | undefined) ?? 0,
      noteMoyenne: (a.noteMoyenne as number | undefined) ?? 0,
      nbAvis: (a.nbAvis as number | undefined) ?? 0,
      ...(typeof a.tauxReponse === 'number' ? { tauxReponse: a.tauxReponse } : {}),
    },
    completude,
    miseEnLigne: etapesMiseEnLigne({
      telephoneVerifie,
      decennale: derniere ? (ETATS[derniere.statut as string] ?? 'absente') : 'absente',
      completude: completude.pourcent,
    }),
  };
}
