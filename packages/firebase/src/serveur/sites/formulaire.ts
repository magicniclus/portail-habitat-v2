import { ErreurMetier } from '@ph/core/erreurs';
import { normaliserTel } from '@ph/core/format';
import { FORMULAIRE_GRATUIT, validerEnvoi, type ChampFormulaire } from '@ph/core/sites';
import { chemins } from '../../chemins';
import type { TraceEnvoi } from '../demandes/commun';
import { creerDemandeDirecte, type ServicesDemandeDirecte } from '../demandes/directe';

export type ServicesFormulaireSite = ServicesDemandeDirecte;

/** Libellés des champs standard, pour « Mes demandes ». */
const LIBELLES = new Map(FORMULAIRE_GRATUIT.map((c) => [c.id, c.libelle]));

/**
 * Envoi du formulaire d'un site artisan : anti-robot vérifié avant tout (SITE-12, aucune demande
 * sinon) ; site gratuit limité à ses 4 champs (SITE-13) ; demande créée **attribuée directement**
 * à l'artisan (`acceptee`, coordonnées visibles), hors matching et jamais facturée (SITE-03).
 */
export async function envoyerFormulaireSite(
  s: ServicesFormulaireSite,
  e: {
    siteId: string;
    valeurs: Record<string, unknown>;
    turnstileOk: boolean;
    page: string;
    trace: TraceEnvoi;
  },
): Promise<{ demandeId: string; reference: string }> {
  if (!e.turnstileOk)
    throw new ErreurMetier('PERMISSION_REFUSEE', 'Vérification anti-robot échouée.');
  const site = await s.db.doc(chemins.site(e.siteId)).get();
  if (!site.exists || !site.get('versionPubliee')) throw new ErreurMetier('INTROUVABLE');
  const offre = site.get('offre') as 'gratuit' | 'site_pro';
  const champs = (site.get('formulaire.champs') as ChampFormulaire[] | undefined) ?? [
    ...FORMULAIRE_GRATUIT,
  ];
  const v = validerEnvoi(champs, offre, e.valeurs);
  if (!v.ok) throw new ErreurMetier('ENTREE_INVALIDE', 'Vérifiez les champs du formulaire.');
  const telephone = normaliserTel(v.valeurs.telephone ?? '');
  if (!telephone) throw new ErreurMetier('ENTREE_INVALIDE', 'Numéro de téléphone invalide.');
  const [prenom, ...reste] = (v.valeurs.nom ?? '').split(/\s+/);
  const libelle = (id: string) =>
    LIBELLES.get(id) ?? champs.find((c) => c.id === id)?.libelle ?? id;
  return creerDemandeDirecte(s, {
    artisanId: e.siteId,
    source: 'site_artisan',
    prestationId: 'contact_site',
    contact: {
      prenom: prenom || 'Client',
      nom: reste.join(' '),
      email: (v.valeurs.email ?? '').toLowerCase(),
      telephone,
    },
    ...(v.valeurs.codePostal ? { codePostal: v.valeurs.codePostal } : {}),
    reponses: v.valeurs,
    reponsesLisibles: Object.entries(v.valeurs)
      .filter(([k]) => !['nom', 'telephone', 'email'].includes(k))
      .map(([k, x]) => ({ question: libelle(k), reponse: x })),
    trace: e.trace,
  });
}
