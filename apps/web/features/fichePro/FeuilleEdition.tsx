'use client';

import { Banner, Button, Feuille } from '@ph/ui';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent, type ReactNode } from 'react';
import { posterJson } from '@/lib/posterJson';

/**
 * Modification d'une section dans une feuille (fenêtre sur ordinateur) : envoi à `url`
 * (`/api/pro/fiche` par défaut), page rafraîchie après l'enregistrement.
 */
export function FeuilleEdition({
  titre,
  entree,
  url = '/api/pro/fiche',
  children,
}: {
  titre: string;
  /** Données envoyées (schéma de la route, `entreeModifierFiche` par défaut). */
  entree: () => Record<string, unknown>;
  url?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const id = `form-${titre.replace(/\W+/g, '-').toLowerCase()}`;

  const envoyer = async (ev: FormEvent) => {
    ev.preventDefault();
    setEnCours(true);
    setErreur(null);
    const r = await posterJson<unknown>(url, entree());
    setEnCours(false);
    if (!r.ok) return setErreur(r.message);
    setOuvert(false);
    router.refresh();
  };

  return (
    <Feuille
      open={ouvert}
      onOpenChange={setOuvert}
      titre={titre}
      declencheur={
        <Button variant="secondaire" taille="sm" aria-label={`Modifier : ${titre}`}>
          Modifier
        </Button>
      }
      actions={
        <Button type="submit" form={id} disabled={enCours}>
          {enCours ? 'Enregistrement…' : 'Enregistrer'}
        </Button>
      }
    >
      <form id={id} onSubmit={envoyer} className="grid gap-4">
        {erreur ? <Banner tone="danger">{erreur}</Banner> : null}
        {children}
      </form>
    </Feuille>
  );
}
