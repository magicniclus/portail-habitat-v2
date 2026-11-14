import { formatEuros } from '../format';
import type { EntreeDemandePartenaire } from '../schemas/partenaires';
import { FINALITES_OBLIGATOIRES } from '../schemas/partenaires';

/**
 * Demandes importées d'un site partenaire (IMPORT_LEADS, DATABASE §4 bis, MATCHING « Demandes
 * partenaires ») : contrôles et qualification, fonctions pures.
 */

export type MotifRejet =
  'schema_invalide' | 'consentement_absent' | 'telephone_invalide' | 'hors_zone_couverte';

export type NiveauPartenaire = 'A' | 'B' | 'C';
type Qualification = EntreeDemandePartenaire['qualification'];
type Aides = EntreeDemandePartenaire['aides'];

/** Espaces et points retirés, puis E.164 : mobile ou fixe français seulement. */
export function telephonePartenaireValide(brut: string): string | null {
  const t = brut.replace(/[\s.-]/g, '');
  return /^\+33[1-9]\d{8}$/.test(t) ? t : null;
}

/** Consentement complet et conforme à la version convenue (IMP-02), sinon le champ en cause. */
export function controlerConsentement(
  c: EntreeDemandePartenaire['consentement'],
  attendu: { versionTexte: string; texte: string },
): { ok: true } | { ok: false; details: string } {
  if (!c.coche) return { ok: false, details: 'consentement.coche' };
  if (c.versionTexte !== attendu.versionTexte)
    return { ok: false, details: `consentement.versionTexte ≠ ${attendu.versionTexte}` };
  const norme = (t: string) => t.replace(/\s+/g, ' ').trim();
  if (norme(c.texteAffiche) !== norme(attendu.texte))
    return {
      ok: false,
      details: `consentement.texteAffiche ne correspond pas à ${attendu.versionTexte}`,
    };
  const manquantes = FINALITES_OBLIGATOIRES.filter((f) => !c.finalites.includes(f));
  if (manquantes.length)
    return { ok: false, details: `consentement.finalites sans ${manquantes.join(', ')}` };
  return { ok: true };
}

/** Département d'un code postal : « 33 », « 2A »/« 2B » (Corse), « 971 » (outre-mer). */
export function departementDe(codePostal: string): string {
  if (codePostal.startsWith('97') || codePostal.startsWith('98')) return codePostal.slice(0, 3);
  if (codePostal.startsWith('20')) return Number(codePostal) < 20200 ? '2A' : '2B';
  return codePostal.slice(0, 2);
}

export const dansZoneCouverte = (codePostal: string, departements: readonly string[]) =>
  departements.length === 0 || departements.includes(departementDe(codePostal));

/** Clé de doublon (même téléphone + même prestation sur 30 jours), à hacher côté serveur. */
export const cleDoublon = (telephone: string, prestationId: string) =>
  `${telephone}|${prestationId}`;

const PROPRIETAIRES = ['proprietaire_occupant', 'bailleur'];

/**
 * Niveau A/B/C (MATCHING) : A = téléphone vérifié, propriétaire, projet à moins de 3 mois ;
 * B = un critère manquant ; C = « je me renseigne », locataire, ou plus d'un critère manquant.
 * Score 0–100 (proposition) : sert de qualité de la demande pour le matching.
 */
export function qualifierPartenaire(
  q: Qualification & { telephoneVerifie: boolean },
  aides: Pick<Aides, 'eligibilite'>,
): { niveau: NiveauPartenaire; score: number } {
  const score = Math.min(
    100,
    (q.telephoneVerifie ? 35 : 0) +
      (q.statutOccupation === 'proprietaire_occupant'
        ? 25
        : q.statutOccupation === 'bailleur'
          ? 20
          : 0) +
      { moins_3_mois: 25, '3_6_mois': 15, plus_6_mois: 5, renseignement: 0 }[q.horizon] +
      { eligible: 15, ampleur_seulement: 10, non_eligible: 0 }[aides.eligibilite],
  );
  if (q.horizon === 'renseignement' || q.statutOccupation === 'locataire')
    return { niveau: 'C', score };
  const manquants = [
    q.telephoneVerifie,
    PROPRIETAIRES.includes(q.statutOccupation),
    q.horizon === 'moins_3_mois',
  ].filter((ok) => !ok).length;
  return { niveau: manquants === 0 ? 'A' : manquants === 1 ? 'B' : 'C', score };
}

/** Délai souhaité de la demande à partir de l'horizon du partenaire. */
export const delaiDepuisHorizon = (h: Qualification['horizon']): '3mois' | 'renseignement' =>
  h === 'moins_3_mois' || h === '3_6_mois' ? '3mois' : 'renseignement';

/** Travaux éligibles aux aides : seuls des artisans RGE vérifiés les reçoivent. */
export const rgeRequisPartenaire = (aides: Pick<Aides, 'eligibilite'>) =>
  aides.eligibilite !== 'non_eligible';

/** Bloc « Aides estimées du client (indicatif) » montré à l'artisan (IMP-06). */
export function texteAides(a: {
  eligibilite: Aides['eligibilite'];
  montantEstimeCentimes: number;
  dispositifs: readonly string[];
}): string | null {
  if (a.eligibilite === 'non_eligible') return null;
  const montant = a.montantEstimeCentimes
    ? `${formatEuros(a.montantEstimeCentimes, { decimales: 'jamais' })} d’aides estimées`
    : 'Éligible aux aides';
  const liste = a.dispositifs.length ? ` (${a.dispositifs.join(', ')})` : '';
  return `${montant}${liste}, montant indicatif`;
}

export const LIBELLES_NIVEAU: Record<NiveauPartenaire, string> = {
  A: 'Niveau A · projet confirmé',
  B: 'Niveau B · à qualifier',
  C: 'Niveau C · se renseigne',
};
