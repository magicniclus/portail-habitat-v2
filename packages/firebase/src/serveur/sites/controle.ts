import { hotesDuDomaine } from '@ph/core/sites';
import { FieldValue, Timestamp, type DocumentData } from 'firebase-admin/firestore';
import { chemins, collections } from '../../chemins';
import { resoudreLignes, type ServicesDomaines } from './domaines';

/** DOM-06 : 3 jours sans DNS correct → `casse`. */
const DELAI_CASSE = 3 * 86_400_000;

/**
 * Contrôle quotidien d'un domaine actif ou cassé (DOMAINES §4) : enregistrements relus ; incorrects
 * depuis 3 jours → `casse`, index retirés (le sous-domaine reprend le relais), email ; corrects à
 * nouveau → domaine réactivé.
 */
export async function controlerDomaineActif(
  s: ServicesDomaines,
  siteId: string,
): Promise<'ok' | 'surveille' | 'casse' | 'reactive' | null> {
  const ref = s.db.doc(chemins.site(siteId));
  const d = (await ref.get()).get('domaine') as DocumentData | undefined;
  if (!d || !['actif', 'casse'].includes(d.statut as string)) return null;
  const maintenant = s.horloge();
  const nom = d.nom as string;
  const lignes = await resoudreLignes(s, nom, d.enregistrements, maintenant);
  const ok = lignes.every((l) => l.etat === 'ok');
  const depuis = (d.incorrectDepuis as Timestamp | undefined)?.toMillis() ?? maintenant;
  const resultat = ok
    ? d.statut === 'casse'
      ? 'reactive'
      : 'ok'
    : maintenant - depuis >= DELAI_CASSE
      ? 'casse'
      : 'surveille';
  await s.db.runTransaction(async (t) => {
    const index = hotesDuDomaine(nom).map((h) => s.db.doc(chemins.domaineSite(h)));
    const lus = await Promise.all(index.map((r) => t.get(r)));
    if (resultat === 'casse') for (const x of lus) if (x.get('siteId') === siteId) t.delete(x.ref);
    if (resultat === 'reactive')
      for (const [i, x] of lus.entries())
        if (!x.exists)
          t.create(index[i]!, {
            schemaVersion: 1,
            siteId,
            createdAt: Timestamp.fromMillis(maintenant),
          });
    t.update(ref, {
      'domaine.enregistrements': lignes,
      'domaine.statut':
        resultat === 'casse' ? 'casse' : resultat === 'reactive' ? 'actif' : d.statut,
      'domaine.incorrectDepuis': ok ? FieldValue.delete() : Timestamp.fromMillis(depuis),
      'domaine.derniereVerifLe': Timestamp.fromMillis(maintenant),
      updatedAt: Timestamp.fromMillis(maintenant),
    });
  });
  if (resultat === 'casse' && d.statut !== 'casse') {
    const artisan = await s.db.doc(chemins.artisan(siteId)).get();
    const uid = artisan.get('proprietaireUid') as string | undefined;
    if (uid)
      await s.notifier({
        modele: 'site-domaine-casse',
        destinataire: { uid, artisanId: siteId },
        refObjet: `sites/${siteId}`,
        variante: `${nom}:casse:${Math.floor(maintenant / 86_400_000)}`,
        donnees: {
          nomCommercial: (artisan.get('nomCommercial') as string | undefined) ?? '',
          domaine: nom,
          manquants: lignes.filter((l) => l.etat !== 'ok').map((l) => `${l.type} ${l.nom}`),
          lien: '/pro/site?onglet=domaine',
        },
      });
  }
  return resultat;
}

/** Sites dont le domaine est actif ou cassé (contrôle quotidien). */
export async function domainesAControler(s: Pick<ServicesDomaines, 'db'>, limite = 500) {
  const r = await s.db
    .collection(collections.sites)
    .where('domaine.statut', 'in', ['actif', 'casse'])
    .limit(limite)
    .get();
  return r.docs.map((x) => x.id);
}
