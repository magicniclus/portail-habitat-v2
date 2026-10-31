'use client';

import { routes } from '@/lib/routes';
import {
  RAISONS_RESILIATION,
  type AlternativeResiliation,
  type RaisonResiliation,
} from '@ph/core/conversion';
import { NOMS_FORMULE, type FormulePayante } from '@ph/core/paiements';
import { formatDate } from '@ph/core/format';
import { Banner, BoutonAction, RadioCard, RadioCardGroup } from '@ph/ui';
import { useState } from 'react';
import { posterJson } from '@/lib/posterJson';

type Abonnement = { id: string; formule: FormulePayante; finPeriode: number };

const OFFRES: Record<
  AlternativeResiliation['type'],
  { titre: string; texte: string; bouton: string }
> = {
  descendre: {
    titre: 'Passez à Fiche Pro plutôt que de tout arrêter',
    texte: 'Votre fiche reste en tête de liste dans votre secteur, pour beaucoup moins cher.',
    bouton: 'Passer à Fiche Pro',
  },
  remise: {
    titre: '−50 % pendant 2 mois',
    texte:
      'Gardez votre abonnement à moitié prix pendant 2 mois, le temps de recevoir vos demandes.',
    bouton: 'Garder mon abonnement à −50 %',
  },
  suspendre: {
    titre: 'Suspendez 2 mois, sans rien payer',
    texte: 'Votre abonnement reprend tout seul dans 2 mois. Vous gardez votre fiche et vos avis.',
    bouton: 'Suspendre 2 mois',
  },
  appel: {
    titre: 'Parlons-en',
    texte: 'Un conseiller vous rappelle pour trouver une solution adaptée à votre activité.',
    bouton: 'Être rappelé',
  },
};

/** Raison obligatoire, une alternative, puis la résiliation si l'artisan la confirme (S8). */
export function ParcoursResiliation({ abonnements }: { abonnements: Abonnement[] }) {
  const [abonnementId, setAbonnementId] = useState(abonnements[0]!.id);
  const [raison, setRaison] = useState<RaisonResiliation | null>(null);
  const [alternative, setAlternative] = useState<AlternativeResiliation | null>(null);
  const [fin, setFin] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const abo = abonnements.find((a) => a.id === abonnementId)!;

  const appeler = async <R,>(etape: 'proposer' | 'accepter' | 'confirmer') => {
    setEnCours(true);
    setErreur(null);
    const r = await posterJson<R>('/api/pro/abonnement/resiliation', {
      etape,
      abonnementId,
      raison,
    });
    setEnCours(false);
    if (!r.ok) {
      setErreur(r.message);
      return null;
    }
    return r.data;
  };
  const accepter = async () => {
    if (alternative?.type === 'descendre') {
      // Descente à l'échéance par la fenêtre de paiement (PAIEMENTS §4, PAY-04).
      return window.location.assign(routes.proOffre('fiche'));
    }
    const r = await appeler<{ alternative: AlternativeResiliation }>('accepter');
    if (r) setFin('alternative');
  };

  if (fin === 'alternative')
    return (
      <Banner tone="succes" titre="C’est noté, merci de rester avec nous">
        {alternative?.type === 'appel'
          ? 'Un conseiller vous rappelle très vite.'
          : 'Votre abonnement est mis à jour. Vous le retrouvez dans la page Facturation.'}
      </Banner>
    );
  if (fin)
    return (
      <Banner tone="info" titre="Résiliation enregistrée">
        Votre {NOMS_FORMULE[abo.formule]} reste actif jusqu’au {fin}, puis votre fiche repasse en
        formule gratuite. Vous recevez une confirmation par email.
      </Banner>
    );
  return (
    <div className="grid gap-5">
      {abonnements.length > 1 ? (
        <RadioCardGroup legende="Abonnement à résilier">
          {abonnements.map((a) => (
            <RadioCard
              key={a.id}
              name="abonnement"
              value={a.id}
              checked={a.id === abonnementId}
              onChange={() => (setAbonnementId(a.id), setAlternative(null))}
              titre={NOMS_FORMULE[a.formule]}
              description={`Période en cours jusqu’au ${formatDate(a.finPeriode, 'long')}`}
            />
          ))}
        </RadioCardGroup>
      ) : null}
      <RadioCardGroup legende="Pourquoi souhaitez-vous résilier ?">
        {(Object.keys(RAISONS_RESILIATION) as RaisonResiliation[]).map((r) => (
          <RadioCard
            key={r}
            name="raison"
            value={r}
            checked={raison === r}
            onChange={() => (setRaison(r), setAlternative(null))}
            titre={RAISONS_RESILIATION[r]}
          />
        ))}
      </RadioCardGroup>
      {erreur ? <Banner tone="danger">{erreur}</Banner> : null}
      {alternative ? (
        <section
          aria-label="Notre proposition"
          className="grid gap-3 rounded-card border border-trait p-5"
        >
          <h2 className="m-0 text-xl">{OFFRES[alternative.type].titre}</h2>
          <p className="m-0 text-base text-neutre-800">{OFFRES[alternative.type].texte}</p>
          <BoutonAction onClick={() => accepter()} disabled={enCours}>
            {OFFRES[alternative.type].bouton}
          </BoutonAction>
          <BoutonAction
            variant="secondaire"
            disabled={enCours}
            onClick={async () => {
              const r = await appeler<{ finPeriode: number }>('confirmer');
              if (r) setFin(formatDate(r.finPeriode, 'long'));
            }}
          >
            Non merci, résilier en fin de période
          </BoutonAction>
        </section>
      ) : (
        <BoutonAction
          disabled={!raison || enCours}
          onClick={async () => {
            const r = await appeler<{ alternative: AlternativeResiliation }>('proposer');
            if (r) setAlternative(r.alternative);
          }}
        >
          Continuer
        </BoutonAction>
      )}
    </div>
  );
}
