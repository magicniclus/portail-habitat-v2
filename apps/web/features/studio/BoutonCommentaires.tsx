'use client';

import { Banner, Button } from '@ph/ui';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { sujetsDepuisCommentaires } from './actions';

/** Les vraies questions de votre public (YouTube, Instagram) deviennent des vidéos « réponse ». */
export function BoutonCommentaires() {
  const router = useRouter();
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();
  return (
    <div className="grid gap-2">
      <div>
        <Button
          variant="secondaire"
          disabled={enCours}
          onClick={() =>
            demarrer(async () => {
              setErreur(null);
              const r = await sujetsDepuisCommentaires();
              if (r.ok) router.push(`/admin/studio/${r.data}` as Route);
              else setErreur(r.message);
            })
          }
        >
          {enCours ? 'Claude lit vos commentaires…' : '💬 Idées tirées de vos commentaires'}
        </Button>
      </div>
      {erreur ? <Banner tone="attention">{erreur}</Banner> : null}
    </div>
  );
}
