'use client';

import {
  calculerTotaux,
  verifierMentionsDevis,
  type ParametresFacturation,
  type TauxTva,
} from '@ph/core/devis';
import type { PrestationBiblio } from '@ph/firebase/devis';
import { Banner, Button, Feuille, StickyActionBar } from '@ph/ui';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { posterJson } from '@/lib/posterJson';
import { routes } from '@/lib/routes';
import { useMediaQuery } from '@/lib/useMediaQuery';
import type { EntrepriseFeuille } from '@/server/pageDevis';
import { lignesCentimes, versEntree, type EtatDevis } from './etat';
import { BarreEditeur } from './feuille/BarreEditeur';
import { FeuilleA4 } from './feuille/FeuilleA4';
import { OptionsConditions } from './feuille/OptionsConditions';
import { OptionsDocument } from './feuille/OptionsDocument';
import { PanneauMentions } from './PanneauMentions';

const date = (j: string) => (j ? new Date(`${j}T12:00:00Z`) : undefined);
const nombre = (s: string) => Number(s.replace(',', '.')) || 0;

/**
 * Éditeur de devis « feuille A4 » (captures du propriétaire, à nos couleurs) : la feuille au
 * centre, le panneau Options à droite (feuille du bas sur mobile), barre d'actions fixe en bas.
 * Totaux et mentions recalculés à chaque saisie avec les fonctions du serveur ; « Envoyer »
 * refusé tant qu'une mention manque (DEV-01). Le PDF est produit à l'envoi (DEV-05).
 */
export function EditeurDevis({
  initial,
  parametres,
  tvaDefaut,
  bibliotheque,
  entreprise,
  aujourdHui,
  bandeau,
}: {
  initial: EtatDevis;
  parametres: ParametresFacturation;
  tvaDefaut: TauxTva;
  bibliotheque: PrestationBiblio[];
  entreprise: EntrepriseFeuille;
  aujourdHui: number;
  /** Bandeau au-dessus de la feuille (« En réponse à la demande… »). */
  bandeau?: ReactNode;
}) {
  const router = useRouter();
  const large = useMediaQuery('(min-width: 1100px)');
  const [e, setE] = useState(initial);
  const [options, setOptions] = useState(false);
  const [avecCout, setAvecCout] = useState(initial.lignes.some((l) => l.cout));
  const [enCours, setEnCours] = useState<null | 'enregistrer' | 'envoyer'>(null);
  const [message, setMessage] = useState<{ ton: 'succes' | 'danger'; texte: string } | null>(null);
  const maj = (patch: Partial<EtatDevis>) => setE((x) => ({ ...x, ...patch }));
  const lignes = lignesCentimes(e.lignes);
  const totaux = calculerTotaux(
    { lignes, remisePct: nombre(e.remisePct), acomptePct: nombre(e.acomptePct) },
    { franchiseTva: parametres.franchiseTva },
  );
  const mentions = verifierMentionsDevis(
    {
      ...e,
      validiteLe: date(e.validiteLe),
      debutTravauxLe: date(e.debutTravauxLe),
      lignes,
    },
    parametres,
  );

  const enregistrer = async (): Promise<string | null> => {
    const r = await posterJson<{ devisId: string; numero: string }>(
      '/api/pro/devis',
      versEntree(e),
    );
    if (!r.ok) {
      setMessage({ ton: 'danger', texte: r.message });
      return null;
    }
    if (!e.devisId) maj({ devisId: r.data.devisId, numero: r.data.numero });
    return r.data.devisId;
  };
  const surEnregistrer = async () => {
    setEnCours('enregistrer');
    setMessage(null);
    const id = await enregistrer();
    setEnCours(null);
    if (!id) return;
    setMessage({ ton: 'succes', texte: 'Devis enregistré.' });
    if (!initial.devisId) router.replace(routes.proUnDevis(id));
  };
  const surEnvoyer = async () => {
    if (!mentions.ok) {
      const manquantes = mentions.liste.filter((m) => !m.ok).map((m) => m.libelle);
      return setMessage({
        ton: 'danger',
        texte: `Envoi impossible, il manque : ${manquantes.join(', ')}.`,
      });
    }
    if (!e.client.email.trim())
      return setMessage({
        ton: 'danger',
        texte: 'Indiquez l’email du client pour lui envoyer le devis.',
      });
    setEnCours('envoyer');
    setMessage(null);
    const id = await enregistrer();
    if (!id) return setEnCours(null);
    const r = await posterJson<null>('/api/pro/devis/envoyer', { devisId: id });
    setEnCours(null);
    if (!r.ok) return setMessage({ ton: 'danger', texte: r.message });
    router.push(routes.proUnDevis(id));
    router.refresh();
  };

  const panneau = (
    <div className="grid gap-6">
      <OptionsDocument e={e} maj={maj} />
      <OptionsConditions e={e} maj={maj} avecCout={avecCout} onAvecCout={setAvecCout} />
      <PanneauMentions totaux={totaux} mentions={mentions} />
    </div>
  );
  const manquantes = mentions.liste.length - mentions.liste.filter((m) => m.ok).length;

  return (
    <div className="grid min-h-[calc(100dvh-90px)] grid-cols-[minmax(0,1fr)] grid-rows-[auto_1fr_auto] bg-neutre-100">
      <BarreEditeur
        titre={e.numero ? `Devis ${e.numero}` : 'Nouveau devis'}
        onOptions={large ? null : () => setOptions(true)}
      />
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 px-[clamp(8px,3vw,32px)] py-6 min-[1100px]:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid min-w-0 gap-4">
          {message ? (
            <div role={message.ton === 'danger' ? 'alert' : 'status'}>
              <Banner tone={message.ton}>{message.texte}</Banner>
            </div>
          ) : null}
          {bandeau}
          <FeuilleA4
            e={e}
            maj={maj}
            totaux={totaux}
            entreprise={entreprise}
            franchiseTva={parametres.franchiseTva}
            tvaDefaut={tvaDefaut}
            bibliotheque={bibliotheque}
            avecCout={avecCout}
            aujourdHui={aujourdHui}
            onMessage={setMessage}
          />
        </div>
        {large ? (
          <aside
            aria-label="Options"
            className="sticky top-24 grid max-h-[calc(100dvh-200px)] gap-4 overflow-y-auto rounded-[14px] border border-trait bg-blanc p-4"
          >
            <h2 className="m-0 text-lg">Options</h2>
            {panneau}
          </aside>
        ) : (
          <Feuille open={options} onOpenChange={setOptions} titre="Options" mode="bas">
            {panneau}
          </Feuille>
        )}
      </div>
      <StickyActionBar className="bottom-[calc(3.5rem+env(safe-area-inset-bottom))] flex-wrap justify-end lg:bottom-0">
        <button
          type="button"
          onClick={() => (large ? undefined : setOptions(true))}
          className={`min-h-11 basis-full text-left text-sm font-semibold sm:mr-auto sm:basis-auto ${mentions.ok ? 'text-succes' : 'text-danger'}`}
        >
          {mentions.ok
            ? 'Mentions obligatoires complètes'
            : `${manquantes} mention${manquantes > 1 ? 's' : ''} à compléter`}
        </button>
        <Button
          variant="secondaire"
          onClick={surEnregistrer}
          disabled={enCours !== null}
          className="flex-1 sm:flex-none"
        >
          {enCours === 'enregistrer' ? (
            'Enregistrement…'
          ) : (
            <>
              <span className="sm:hidden">Enregistrer</span>
              <span className="hidden sm:inline">Enregistrer le brouillon</span>
            </>
          )}
        </Button>
        <Button onClick={surEnvoyer} disabled={enCours !== null} className="flex-1 sm:flex-none">
          {enCours === 'envoyer' ? 'Envoi…' : 'Envoyer au client'}
        </Button>
      </StickyActionBar>
    </div>
  );
}
