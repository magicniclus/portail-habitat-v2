'use client';

import { Banner, Button, Modal } from '@ph/ui';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { routes } from '@/lib/routes';

/** Quitter l'éditeur avec des modifications non enregistrées : enregistrer, quitter ou rester. */
export function ConfirmerQuitter({
  ouverte,
  onFermer,
  enregistrer,
}: {
  ouverte: boolean;
  onFermer: () => void;
  enregistrer: () => Promise<string | null>;
}) {
  const router = useRouter();
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const sortir = () => router.push(routes.proSite);
  const enregistrerEtSortir = async () => {
    setEnCours(true);
    const e = await enregistrer();
    setEnCours(false);
    setErreur(e);
    if (!e) sortir();
  };
  return (
    <Modal
      open={ouverte}
      onOpenChange={(o) => (o ? undefined : onFermer())}
      titre="Enregistrer vos modifications ?"
      description="Vos dernières modifications ne sont pas encore enregistrées. Rien n’est mis en ligne avant « Publier »."
      actions={
        <>
          <Button variant="fantome" onClick={sortir} disabled={enCours}>
            Quitter sans enregistrer
          </Button>
          <Button chargement={enCours} onClick={() => void enregistrerEtSortir()}>
            Enregistrer et quitter
          </Button>
        </>
      }
    >
      {erreur ? <Banner tone="danger">{erreur}</Banner> : null}
    </Modal>
  );
}
