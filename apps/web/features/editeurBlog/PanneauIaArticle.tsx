'use client';

import {
  LONGUEURS_ARTICLE,
  TYPES_ARTICLE,
  type ActionIaBlog,
  type LongueurArticle,
  type SortieIaBlog,
} from '@ph/core/blog';
import { Banner, Button, Checkbox, Chip, ChipGroup, Field, Input } from '@ph/ui';
import { useState } from 'react';
import { PlusArticles } from '@/features/blog/PlusArticles';
import { posterJson } from '@/lib/posterJson';
import type { EditeurArticleDonnees } from '@/server/blog';
import { PropositionsIa, type ReponseIaBlog } from './PropositionsIa';
import type { ChampsArticle } from './useArticle';

type Reponse = ReponseIaBlog;

const RETOUCHES: [ActionIaBlog, string][] = [
  ['titres', 'Titres'],
  ['meta', 'Méta-description'],
  ['alt', 'Texte alternatif'],
  ['classement', 'Catégorie et tags'],
  ['reseaux', 'Textes réseaux'],
];

/**
 * Panneau IA de l'article (BLOG §2, §3) : rédaction complète (1 crédit du mois, remplace le texte,
 * Ctrl Z sur le corps), retouches illimitées, idées d'articles. Chaque proposition s'applique d'un
 * clic ; l'article n'est enregistré ni publié par l'IA.
 */
export function PanneauIaArticle({
  c,
  credits,
  appliquer,
}: {
  c: ChampsArticle;
  credits: EditeurArticleDonnees['credits'];
  /** Applique une proposition choisie par l'artisan. */
  appliquer: (r: SortieIaBlog, choix?: string) => void;
}) {
  const [sujet, setSujet] = useState('');
  const [type, setType] = useState<(typeof TYPES_ARTICLE)[number]>('Conseils');
  const [longueur, setLongueur] = useState<LongueurArticle>('moyen');
  const [chantiers, setChantiers] = useState(true);
  const [restant, setRestant] = useState(credits.max - credits.utilises);
  const [reponse, setReponse] = useState<Reponse | null>(null);
  const [enCours, setEnCours] = useState<ActionIaBlog | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const demander = async (action: ActionIaBlog) => {
    setEnCours(action);
    setErreur(null);
    setReponse(null);
    const r = await posterJson<Reponse>('/api/pro/blog/ia', {
      action,
      ...(sujet.trim() ? { sujet: sujet.trim() } : {}),
      ...(action === 'rediger' ? { type, longueur, chantiers } : {}),
      article: {
        titre: c.titre,
        meta: c.meta,
        motCle: c.motCle,
        corps: c.corpsHtml.replace(/<[^>]*>/g, ' ').slice(0, 20_000),
      },
    });
    setEnCours(null);
    if (!r.ok) return setErreur(r.message);
    setRestant(r.data.restant);
    if (r.data.action === 'rediger') appliquer(r.data);
    else setReponse(r.data);
  };

  const epuise = restant <= 0;
  return (
    <div className="grid gap-4">
      <div className="grid gap-1 rounded-[12px] border border-trait p-3">
        <span className="text-sm text-neutre-800">Articles rédigés par l’IA ce mois-ci</span>
        <strong>
          {credits.max - restant} / {credits.max}
        </strong>
        <PlusArticles credits={credits} />
      </div>
      <form
        className="grid gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          void demander('rediger');
        }}
      >
        <Field label="Sujet ou mot-clé">
          <Input
            value={sujet}
            maxLength={300}
            placeholder="ex. prix d’une pompe à chaleur à Bordeaux"
            onChange={(e) => setSujet(e.target.value)}
          />
        </Field>
        <ChipGroup libelle="Type d’article">
          {TYPES_ARTICLE.map((t) => (
            <Chip key={t} selectionne={type === t} onClick={() => setType(t)}>
              {t}
            </Chip>
          ))}
        </ChipGroup>
        <ChipGroup libelle="Longueur">
          {(Object.keys(LONGUEURS_ARTICLE) as LongueurArticle[]).map((l) => (
            <Chip key={l} selectionne={longueur === l} onClick={() => setLongueur(l)}>
              {`≈ ${LONGUEURS_ARTICLE[l]} mots`}
            </Chip>
          ))}
        </ChipGroup>
        <Checkbox checked={chantiers} onChange={(e) => setChantiers(e.target.checked)}>
          Citer mes chantiers et mes avis (repris de « Ma fiche »)
        </Checkbox>
        {epuise ? (
          <p className="m-0 text-[15px]">
            Quota du mois atteint. Vous pouvez toujours écrire vous-même ; titres, descriptions et
            tags restent disponibles.
          </p>
        ) : null}
        <div>
          <Button
            chargement={enCours === 'rediger'}
            type="submit"
            variant="secondaire"
            disabled={Boolean(enCours) || epuise}
          >
            {enCours === 'rediger' ? 'L’IA rédige l’article…' : '✦ Rédiger l’article'}
          </Button>
        </div>
        <p className="m-0 text-sm text-neutre-700">
          Seule la rédaction complète compte dans le quota. Elle remplace le texte actuel.
        </p>
      </form>
      <section aria-labelledby="retouches-ia" className="grid gap-2">
        <h3 id="retouches-ia" className="m-0 text-base">
          Retoucher l’article <span className="font-normal text-neutre-700">(illimité)</span>
        </h3>
        <div className="flex flex-wrap gap-2">
          {RETOUCHES.map(([a, l]) => (
            <Button
              chargement={enCours === a}
              key={a}
              taille="sm"
              variant="secondaire"
              disabled={Boolean(enCours)}
              onClick={() => void demander(a)}
            >
              {l}
            </Button>
          ))}
          <Button
            taille="sm"
            variant="secondaire"
            disabled={Boolean(enCours)}
            onClick={() => void demander('idees')}
          >
            ✦ Idées d’articles
          </Button>
        </div>
      </section>
      {erreur ? <Banner tone="danger">{erreur}</Banner> : null}
      {reponse?.avertissements.length ? (
        <Banner tone="info">{`À vérifier : ${reponse.avertissements.join(', ')} remplacé(s) par « [à compléter] ».`}</Banner>
      ) : null}
      {reponse ? <PropositionsIa r={reponse} appliquer={appliquer} onIdee={setSujet} /> : null}
    </div>
  );
}
