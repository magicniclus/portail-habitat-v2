'use client';

import { Banner, Button, Field, Input, RadioCard, RadioCardGroup } from '@ph/ui';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { posterJson } from '@/lib/posterJson';
import { routes } from '@/lib/routes';

/**
 * « ✦ Article en un clic » (BLOG §2 bis, D70) : sujet facultatif ; « Je relis » laisse un brouillon,
 * « Planifier seul » le programme à la date conseillée. Jamais publié directement. Un article
 * compte dans le quota du mois.
 */
export function ArticleEnUnClic({ restant }: { restant: number }) {
  const router = useRouter();
  const [sujet, setSujet] = useState('');
  const [fin, setFin] = useState<'relire' | 'planifier'>('relire');
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const lancer = async () => {
    setEnCours(true);
    setErreur(null);
    const r = await posterJson<{ articleId: string }>('/api/pro/blog/en-un-clic', {
      fin,
      ...(sujet.trim() ? { sujet: sujet.trim() } : {}),
    });
    setEnCours(false);
    if (!r.ok) return setErreur(r.message);
    router.push(routes.proBlogArticle(r.data.articleId));
  };
  return (
    <section
      aria-labelledby="un-clic"
      className="grid gap-3 rounded-[12px] border border-trait p-4"
    >
      <h3 id="un-clic" className="m-0 text-lg">
        ✦ Article en un clic
      </h3>
      <p className="m-0 text-[15px] text-neutre-800">
        L’IA choisit le mot-clé, rédige, classe, ajoute une photo de vos réalisations, des liens
        vers vos pages et corrige le référencement. Vous gardez la main : rien n’est publié sans
        vous.
      </p>
      <Field
        label="Sujet (facultatif)"
        aide="Vide : l’IA choisit un sujet que vous n’avez pas encore traité."
      >
        <Input value={sujet} onChange={(e) => setSujet(e.target.value)} maxLength={300} />
      </Field>
      <RadioCardGroup legende="Une fois l’article prêt">
        <RadioCard
          name="fin-un-clic"
          titre="Je relis"
          description="Il reste un brouillon."
          checked={fin === 'relire'}
          onChange={() => setFin('relire')}
        />
        <RadioCard
          name="fin-un-clic"
          titre="Planifier seul"
          description="Programmé à la meilleure date."
          checked={fin === 'planifier'}
          onChange={() => setFin('planifier')}
        />
      </RadioCardGroup>
      <div>
        <Button chargement={enCours} onClick={lancer} disabled={enCours || restant <= 0}>
          {enCours ? 'Rédaction en cours…' : 'Tout faire en un clic'}
        </Button>
      </div>
      {restant <= 0 ? (
        <Banner tone="attention">Vos articles rédigés par l’IA sont épuisés ce mois-ci.</Banner>
      ) : null}
      {erreur ? <Banner tone="danger">{erreur}</Banner> : null}
    </section>
  );
}
