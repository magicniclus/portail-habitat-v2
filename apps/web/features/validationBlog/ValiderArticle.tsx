'use client';

import { Banner, Button } from '@ph/ui';
import { useActionState } from 'react';
import { validerPublication } from './actions';

/** Bouton du lien `blog-a-valider` : la validation n'a lieu qu'au clic (BLOG-12). */
export function ValiderArticle({ lien, date }: { lien: string; date: string }) {
  const [etat, envoyer, enCours] = useActionState(validerPublication, null);
  if (etat?.statut)
    return (
      <Banner tone="succes" titre="Article validé">
        {etat.statut === 'publie'
          ? 'Il est en ligne sur votre site.'
          : `Il sera publié le ${date} sur votre site.`}
      </Banner>
    );
  return (
    <form action={envoyer} className="grid gap-3">
      <input type="hidden" name="lien" value={lien} />
      {etat?.erreur ? <Banner tone="danger">{etat.erreur}</Banner> : null}
      <div>
        <Button chargement={enCours} type="submit" disabled={enCours}>
          {enCours ? 'Validation…' : 'Valider la publication'}
        </Button>
      </div>
    </form>
  );
}
