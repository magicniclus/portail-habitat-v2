import { signatureDevis } from '@ph/core/devis';
import { ErreurMetier } from '@ph/core/erreurs';
import { formatEuros } from '@ph/core/format';
import { Timestamp } from 'firebase-admin/firestore';
import { chemins } from '../../chemins';
import { empreinteJeton, type Notifier } from '../comptes/services';
import type { ServicesDevis } from './communs';
import { suivreDemande } from './devis';

/** Lien personnel du client : `artisanId.devisId.jeton` (celui de l'email du devis). */
export function lireLienClient(
  lien: string,
): { artisanId: string; devisId: string; jeton: string } | null {
  const [artisanId, devisId, jeton] = lien.split('.');
  if (!artisanId || !devisId || !jeton || jeton.length < 20) return null;
  return { artisanId, devisId, jeton };
}

/**
 * « Accepter ce devis » depuis le lien reçu par email : signature électronique simple (nom, IP,
 * date, empreinte du PDF envoyé), devis accepté, mise en relation suivie, entreprise prévenue.
 */
export async function signerDevis(
  s: ServicesDevis & { notifier: Notifier },
  e: { lien: string; nom: string; ip: string },
): Promise<{ numero: string }> {
  const l = lireLienClient(e.lien);
  if (!l) throw new ErreurMetier('INTROUVABLE', 'Lien invalide ou expiré.');
  const ref = s.db.doc(chemins.unDevis(l.artisanId, l.devisId));
  const maintenant = s.horloge();
  const d = await s.db.runTransaction(async (t) => {
    const x = await t.get(ref);
    if (!x.exists || x.get('jetonHash') !== empreinteJeton(l.jeton))
      throw new ErreurMetier('INTROUVABLE', 'Lien invalide ou expiré.');
    const v = x.get('validiteLe') as Timestamp | undefined;
    const ok = signatureDevis(
      {
        statut: x.get('statut') as string,
        signatureElectronique: x.get('signatureElectronique') === true,
        ...(v ? { validiteLe: v.toDate() } : {}),
      },
      maintenant,
    );
    if (!ok.possible) throw new ErreurMetier('PRECONDITION', ok.raison);
    const suivre = await suivreDemande(t, s, l.artisanId, x.get('demandeId'), 'accepte');
    suivre();
    t.update(ref, {
      statut: 'accepte',
      signature: {
        nom: e.nom,
        ip: e.ip.slice(0, 64),
        le: Timestamp.fromMillis(maintenant),
        hashPdf: x.get('hashPdf') as string,
      },
      updatedAt: Timestamp.fromMillis(maintenant),
    });
    return x;
  });
  const artisan = await s.db.doc(chemins.artisan(l.artisanId)).get();
  const uid = artisan.get('proprietaireUid') as string | undefined;
  if (uid)
    await s.notifier({
      modele: 'devis-accepte',
      destinataire: { uid, artisanId: l.artisanId },
      refObjet: ref.path,
      donnees: {
        numero: d.get('numero'),
        client: e.nom,
        montant: formatEuros(d.get('totaux.ttcCentimes') as number, {
          decimales: 'toujours',
          suffixe: 'TTC',
        }),
        lien: `/pro/devis/${l.devisId}`,
      },
    });
  return { numero: d.get('numero') as string };
}
