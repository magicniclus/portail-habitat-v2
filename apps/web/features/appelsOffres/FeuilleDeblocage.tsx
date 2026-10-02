'use client';

import { CATALOGUE_STRIPE } from '@ph/core/facturation';
import { formatEuros } from '@ph/core/format';
import { choisirMoyen, type CarteAppelOffres } from '@ph/core/leads';
import { Banner, Button, Feuille, bouton } from '@ph/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { posterJson } from '@/lib/posterJson';
import { routes } from '@/lib/routes';

const PACKS = CATALOGUE_STRIPE.filter((p) => p.produit === 'pack');
const pluriel = (n: number) => `${n} crédit${n > 1 ? 's' : ''}`;

type Reponse =
  | { etat: 'debloque' | 'deja_debloque' }
  | { etat: 'paiement_requis'; soldeCredits: number }
  | { etat: 'redirection'; url: string };

/**
 * Déblocage d'un appel d'offres (MATCHING [8]) : crédits si le solde suffit, sinon carte ou pack
 * (PRO-05). Rien n'est débité tant que le serveur n'a pas confirmé la place (PRO-06).
 */
export function FeuilleDeblocage({
  carte,
  premium,
  portefeuille,
  peutAcheterPack,
  fermer,
}: {
  carte: CarteAppelOffres;
  premium: boolean;
  portefeuille: { soldeCredits: number; creditsInclusRestants: number };
  peutAcheterPack: boolean;
  fermer: () => void;
}) {
  const router = useRouter();
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [debloque, setDebloque] = useState(false);
  const [insuffisant, setInsuffisant] = useState(
    choisirMoyen(carte.prix, portefeuille, premium, 'auto').moyen === null,
  );

  const envoyer = async (url: string, corps: unknown) => {
    setEnCours(true);
    setErreur(null);
    const r = await posterJson<Reponse>(url, corps);
    if (!r.ok) setErreur(r.message);
    else if (r.data.etat === 'redirection') {
      window.location.assign(r.data.url);
      return;
    } else if (r.data.etat === 'paiement_requis') setInsuffisant(true);
    else {
      setDebloque(true);
      router.refresh();
    }
    setEnCours(false);
  };
  const debloquer = (choix: 'auto' | 'carte') =>
    envoyer('/api/pro/appels-offres/debloquer', { appelOffresId: carte.id, choix });

  const credits = portefeuille.soldeCredits + (premium ? portefeuille.creditsInclusRestants : 0);
  return (
    <Feuille
      open
      onOpenChange={(o) => (o ? undefined : fermer())}
      titre="Répondre à cet appel d’offres"
      description={`${carte.titre} · ${carte.lieu}`}
    >
      <div className="grid gap-4">
        {debloque ? (
          <Banner tone="succes" titre="Coordonnées débloquées">
            Le chantier est dans Mes demandes : contactez le particulier rapidement.{' '}
            <Link href={routes.proDemandes} className={bouton({ variant: 'fantome' })}>
              Ouvrir Mes demandes
            </Link>
          </Banner>
        ) : (
          <>
            <p className="m-0 text-base">
              Prix : <strong>{carte.textePrix}</strong>. Vous disposez de{' '}
              <strong>{pluriel(credits)}</strong>.
            </p>
            {erreur ? <Banner tone="danger">{erreur}</Banner> : null}
            {insuffisant ? (
              <Banner tone="attention" titre="Crédits insuffisants">
                Payez ce chantier par carte, ou achetez un pack de crédits.
              </Banner>
            ) : (
              <Button onClick={() => void debloquer('auto')} disabled={enCours}>
                Utiliser {pluriel(carte.prix.credits)}
              </Button>
            )}
            <Button
              variant={insuffisant ? 'primaire' : 'secondaire'}
              onClick={() => void debloquer('carte')}
              disabled={enCours}
            >
              Payer {formatEuros(carte.prix.centimes)} HT par carte
            </Button>
            {insuffisant && peutAcheterPack ? (
              <ul aria-label="Packs de crédits" className="m-0 grid list-none gap-2 p-0">
                {PACKS.map((p) => (
                  <li key={p.cle}>
                    <Button
                      variant="secondaire"
                      className="w-full justify-between"
                      disabled={enCours}
                      onClick={() => void envoyer('/api/pro/credits/checkout', { cle: p.cle })}
                    >
                      <span>{p.nomProduit}</span>
                      <span>{formatEuros(p.montantHt)} HT</span>
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}
            <p className="m-0 text-[13px] text-neutre-700">
              Paiement sécurisé par Stripe. Trois artisans au plus peuvent répondre à ce chantier.
            </p>
          </>
        )}
      </div>
    </Feuille>
  );
}
