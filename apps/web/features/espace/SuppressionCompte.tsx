'use client';

import { Banner, Button, Field, FermerFeuille, Input, Modal } from '@ph/ui';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { supprimerCompte } from './api';

/**
 * Suppression du compte en deux temps (ESP-04) : le bouton ouvre une fenêtre d'explication, puis
 * il faut taper SUPPRIMER pour confirmer. Le serveur exige aussi ce mot.
 */
export function SuppressionCompte({
  description = 'Vos demandes en cours seront annulées et les artisans prévenus. Vos avis publiés restent visibles sous votre nom affiché. Cette action est définitive.',
}: {
  description?: string;
}) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [mot, setMot] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const pret = mot.trim() === 'SUPPRIMER';

  const confirmer = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!pret) return;
    setEnCours(true);
    const r = await supprimerCompte();
    setEnCours(false);
    if (!r.ok) return setErreur(r.message);
    setOuvert(false);
    router.replace('/?compte=supprime');
  };

  return (
    <Modal
      open={ouvert}
      onOpenChange={(o) => {
        setOuvert(o);
        if (!o) setMot('');
      }}
      declencheur={
        <Button variant="secondaire" className="text-danger">
          Supprimer
        </Button>
      }
      titre="Supprimer mon compte ?"
      description={description}
      actions={
        <>
          <FermerFeuille asChild>
            <Button variant="secondaire">Annuler</Button>
          </FermerFeuille>
          <Button
            type="submit"
            form="form-suppression"
            variant="danger"
            disabled={!pret || enCours}
          >
            {enCours ? 'Suppression…' : 'Supprimer définitivement'}
          </Button>
        </>
      }
    >
      <form id="form-suppression" onSubmit={confirmer} className="grid gap-3">
        <Field label="Pour confirmer, tapez SUPPRIMER">
          <Input
            value={mot}
            onChange={(e) => setMot(e.target.value)}
            autoComplete="off"
            autoCapitalize="characters"
          />
        </Field>
        {erreur ? <Banner tone="danger">{erreur}</Banner> : null}
      </form>
    </Modal>
  );
}
