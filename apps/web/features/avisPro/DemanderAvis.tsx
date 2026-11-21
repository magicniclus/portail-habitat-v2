'use client';

import { bouton, Button, Feuille } from '@ph/ui';
import { CheckIcon, CopyIcon, EnvelopeSimpleIcon } from '@phosphor-icons/react';
import { useState, type ReactNode } from 'react';
import { routes } from '@/lib/routes';

/**
 * « Demander un avis » : lien direct vers le formulaire d'avis de l'entreprise (le client n'a
 * pas à la chercher), à copier en un clic ou à envoyer depuis la messagerie de l'artisan
 * (`mailto:` : rien n'est envoyé ni conservé par Portail Travaux).
 */
export function DemanderAvis({
  slug,
  nom,
  declencheur,
}: {
  slug: string;
  nom: string;
  declencheur?: ReactNode;
}) {
  const chemin = routes.avisEntreprise(slug);
  // Contenu rendu seulement fenêtre ouverte (navigateur) : l'origine du site est connue.
  const lien = `${typeof window === 'undefined' ? '' : window.location.origin}${chemin}`;
  const [copie, setCopie] = useState(false);
  const copier = async () => {
    try {
      await navigator.clipboard.writeText(lien);
      setCopie(true);
    } catch {
      setCopie(false);
    }
  };
  const email = `mailto:?${new URLSearchParams({
    subject: `Votre avis sur ${nom}`,
    body: `Bonjour,\n\nMerci de votre confiance. Pourriez-vous prendre une minute pour donner votre avis sur nos travaux ? Il sera vérifié avant publication :\n${lien}\n\nMerci beaucoup,\n${nom}`,
  })
    .toString()
    .replace(/\+/g, '%20')}`;
  return (
    <Feuille
      titre="Demander un avis"
      declencheur={declencheur ?? <Button variant="secondaire">Demander un avis</Button>}
      description={`Envoyez ce lien à votre client : il arrive directement sur le formulaire d’avis de ${nom}. Chaque avis est vérifié avant publication.`}
      actions={
        <a href={email} className={bouton({ variant: 'secondaire' })}>
          <EnvelopeSimpleIcon size={18} aria-hidden="true" />
          Envoyer par email
        </a>
      }
    >
      <div className="flex items-stretch gap-2">
        <p className="m-0 flex min-w-0 flex-1 items-center rounded-md bg-neutre-100 px-3 py-2 text-sm break-all">
          {lien}
        </p>
        <Button onClick={() => void copier()} aria-live="polite">
          {copie ? (
            <CheckIcon size={18} weight="bold" aria-hidden="true" />
          ) : (
            <CopyIcon size={18} aria-hidden="true" />
          )}
          {copie ? 'Copié' : 'Copier'}
        </Button>
      </div>
    </Feuille>
  );
}
