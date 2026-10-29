'use client';

import { ETATS_ENREGISTREMENT, statutDomaineAffiche } from '@ph/core/sites';
import type { DomaineEdition } from '@ph/firebase/sites';
import { Banner, Button, ConfirmDialog, StatusBadge } from '@ph/ui';
import { useState } from 'react';
import { useAppelSite } from './appelSite';
import { ChoixDomaine } from './ChoixDomaine';
import { SuiviAchat } from './SuiviAchat';

/** Ligne du tableau : valeur à copier chez le registrar de l'artisan. */
function Copier({ texte }: { texte: string }) {
  const [copie, setCopie] = useState(false);
  return (
    <Button
      variant="fantome"
      taille="sm"
      onClick={() => {
        void navigator.clipboard?.writeText(texte).then(() => setCopie(true));
      }}
      aria-label={`Copier ${texte}`}
    >
      {copie ? 'Copié' : 'Copier'}
    </Button>
  );
}

/**
 * Domaine personnel : acheté (suivi automatique, DOMAINES §3) ou existant (enregistrements à créer
 * chez son registrar, état par ligne DOM-04, vérification toutes les 2 à 30 min pendant 72 h).
 */
export function DomainePerso({
  domaine,
  sitePro,
  voulu,
}: {
  domaine?: DomaineEdition;
  sitePro: boolean;
  voulu?: string;
}) {
  const [retrait, setRetrait] = useState(false);
  const { appeler, erreur, enCours } = useAppelSite();
  if (!domaine) return <ChoixDomaine sitePro={sitePro} {...(voulu ? { voulu } : {})} />;
  const achete = domaine.mode === 'achat';
  const actif = domaine.statut === 'actif';
  return (
    <div className="grid gap-4">
      <p className="m-0 flex flex-wrap items-center gap-2">
        <strong className="break-all">{domaine.nom}</strong>
        <StatusBadge statut={statutDomaineAffiche(domaine.statut, domaine.mode)} />
      </p>
      {achete ? <SuiviAchat domaine={domaine} /> : null}
      {actif || achete ? null : (
        <p className="m-0 text-[15px] text-neutre-800">
          Ajoutez ces enregistrements chez votre hébergeur de domaine actuel (OVH, Gandi, IONOS…).
          La vérification se fait automatiquement pendant 72 h. Vos emails ne sont pas concernés.
        </p>
      )}
      {achete ? null : (
        <ul className="m-0 grid list-none gap-2 p-0" aria-label="Enregistrements DNS">
          {domaine.enregistrements.map((e) => (
            <li
              key={`${e.type}-${e.nom}-${e.valeur}`}
              className="grid gap-1 rounded-[12px] border border-trait bg-blanc p-3 text-[15px]"
            >
              <span className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  <strong>{e.type}</strong> · {e.nom}
                </span>
                <StatusBadge statut={ETATS_ENREGISTREMENT[e.etat]} />
              </span>
              <span className="flex flex-wrap items-center gap-2">
                <code className="break-all">{e.valeur}</code>
                <Copier texte={e.valeur} />
              </span>
              {e.trouve ? (
                <span className="text-sm text-danger">Valeur trouvée : {e.trouve}</span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {erreur ? <Banner tone="danger">{erreur}</Banner> : null}
      <div className="flex flex-wrap gap-3">
        {actif || achete ? null : (
          <Button
            variant="secondaire"
            onClick={() => void appeler('domaine/verifier', {})}
            disabled={enCours}
          >
            Vérifier maintenant
          </Button>
        )}
        <ConfirmDialog
          open={retrait}
          onOpenChange={setRetrait}
          declencheur={<Button variant="fantome">Retirer ce domaine</Button>}
          titre="Retirer ce domaine ?"
          libelleConfirmer="Retirer"
          danger
          onConfirmer={async () => {
            await appeler('domaine/retirer', {});
            setRetrait(false);
          }}
        >
          {achete
            ? 'Votre site repasse sur son adresse gratuite. Le domaine reste à votre nom ; écrivez au support pour obtenir son code de transfert.'
            : 'Votre site repasse sur son adresse gratuite. Le domaine reste à vous.'}
        </ConfirmDialog>
      </div>
    </div>
  );
}
