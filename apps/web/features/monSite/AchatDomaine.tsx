'use client';

import { Banner, bouton, Button, Field, Input, Modal, StatusBadge } from '@ph/ui';
import { useState } from 'react';
import { FenetreOffre } from '@/features/offres/FenetreOffre';
import { useAppelSite } from './appelSite';

type Resultat = { nom: string; libre: boolean };
const LIBRE = { libelle: 'Disponible', tone: 'succes' } as const;
const PRIS = { libelle: 'Déjà pris', tone: 'neutre' } as const;

/**
 * Achat d'un domaine (DOMAINES §3) : recherche avec disponibilité, confirmation, puis commande
 * au nom de l'entreprise. Sans Site Pro, le domaine est mis de côté et la fenêtre d'offre s'ouvre :
 * il n'est commandé qu'après le paiement (webhook Stripe).
 */
export function AchatDomaine({ sitePro, voulu }: { sitePro: boolean; voulu?: string }) {
  const [requete, setRequete] = useState('');
  const [resultats, setResultats] = useState<Resultat[] | null>(null);
  const [choix, setChoix] = useState<string | null>(null);
  const [offre, setOffre] = useState(false);
  const [autre, setAutre] = useState(false);
  const recherche = useAppelSite();
  const achat = useAppelSite();
  // Reste montée quand l'écran passe sur « mis de côté » après le choix (rafraîchissement).
  const fenetre = (
    <FenetreOffre
      formule="site_pro"
      raison="Le domaine personnel est inclus dans Site Pro."
      ouverte={offre}
      onOuverte={setOffre}
    />
  );

  if (voulu && !sitePro && !autre)
    return (
      <div className="grid gap-3">
        <p className="m-0 text-[15px] text-neutre-800">
          <strong className="break-all">{voulu}</strong> est mis de côté pour vous. Il sera commandé
          à votre nom dès l’activation de Site Pro, puis mis en ligne automatiquement.
        </p>
        <div className="flex flex-wrap gap-3">
          <FenetreOffre
            formule="site_pro"
            raison={`Le domaine ${voulu} est inclus dans Site Pro.`}
            className={bouton()}
          >
            Activer Site Pro
          </FenetreOffre>
          <Button variant="fantome" onClick={() => setAutre(true)}>
            Choisir un autre domaine
          </Button>
        </div>
        {fenetre}
      </div>
    );

  const chercher = async () => {
    const r = await recherche.appeler<{ resultats: Resultat[] }>('domaine/recherche', {
      ...(requete.trim() ? { requete: requete.trim() } : {}),
    });
    if (r) setResultats(r.resultats);
  };
  const acheter = async (nom: string) => {
    const r = await achat.appeler<{ paiement: boolean }>('domaine/acheter', { domaine: nom });
    if (!r) return;
    setChoix(null);
    setAutre(false);
    if (r.paiement) setOffre(true);
  };

  return (
    <div className="grid gap-3">
      <form
        className="grid gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          void chercher();
        }}
      >
        <Field
          label="Nom de domaine souhaité"
          aide="Laissez vide pour des idées à partir de votre nom."
        >
          <div className="flex gap-2">
            <Input
              value={requete}
              onChange={(e) => setRequete(e.target.value)}
              placeholder="bertrand-renovation"
              inputMode="url"
              autoCapitalize="none"
              autoComplete="off"
              spellCheck={false}
              className="min-w-0 flex-1"
            />
            <Button type="submit" disabled={recherche.enCours}>
              {recherche.enCours ? 'Recherche…' : 'Rechercher'}
            </Button>
          </div>
        </Field>
      </form>
      {recherche.erreur ? <Banner tone="danger">{recherche.erreur}</Banner> : null}
      {resultats ? (
        <ul className="m-0 grid list-none gap-2 p-0" aria-label="Domaines proposés">
          {resultats.map((r) => (
            <li
              key={r.nom}
              className="flex flex-wrap items-center justify-between gap-2 rounded-[12px] border border-trait bg-blanc p-3"
            >
              <span className="flex min-w-0 flex-wrap items-center gap-2">
                <strong className="break-all">{r.nom}</strong>
                <StatusBadge statut={r.libre ? LIBRE : PRIS} />
              </span>
              {r.libre ? (
                <Button taille="sm" onClick={() => setChoix(r.nom)}>
                  Choisir
                </Button>
              ) : null}
            </li>
          ))}
          {resultats.length === 0 ? (
            <li className="text-[15px] text-neutre-700">
              Aucune proposition : essayez un autre nom.
            </li>
          ) : null}
        </ul>
      ) : null}
      <Modal
        open={choix !== null}
        onOpenChange={(o) => (o ? null : setChoix(null))}
        titre={`Acheter ${choix ?? ''} ?`}
        description={
          sitePro
            ? 'Inclus dans votre Site Pro, renouvelé chaque année tant que Site Pro est actif.'
            : 'Inclus dans Site Pro : le domaine est commandé après le paiement.'
        }
        actions={
          <>
            <Button variant="fantome" onClick={() => setChoix(null)}>
              Annuler
            </Button>
            <Button onClick={() => choix && void acheter(choix)} disabled={achat.enCours}>
              {achat.enCours ? 'Un instant…' : sitePro ? 'Acheter et mettre en ligne' : 'Continuer'}
            </Button>
          </>
        }
      >
        <ul className="m-0 grid list-none gap-2 p-0 text-[15px]">
          <li>✓ Déposé au nom de votre entreprise (raison sociale et SIREN de votre fiche).</li>
          <li>✓ Configuration et certificat HTTPS automatiques, en ligne en 15 minutes environ.</li>
          <li>✓ Vos emails ne sont pas touchés. Le domaine reste à vous si vous arrêtez.</li>
        </ul>
        {achat.erreur ? (
          <Banner tone="danger" className="mt-3">
            {achat.erreur}
          </Banner>
        ) : null}
      </Modal>
      {fenetre}
    </div>
  );
}
