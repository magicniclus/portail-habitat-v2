'use client';

import { adresseArticle, type SortieIaBlog } from '@ph/core/blog';
import { Banner, cn, Field, Textarea } from '@ph/ui';
import { useState } from 'react';
import type { EditeurArticleDonnees } from '@/server/blog';
import { BarreArticle } from './BarreArticle';
import { ClassementArticle } from './ClassementArticle';
import { CorpsRiche } from './CorpsRiche';
import { EnteteArticle } from './EnteteArticle';
import { MentionsArticle } from './MentionsArticle';
import { PanneauDiffusion } from './PanneauDiffusion';
import { PanneauIaArticle } from './PanneauIaArticle';
import { PanneauMotsCles } from './PanneauMotsCles';
import { PanneauSeo } from './PanneauSeo';
import { useArticle } from './useArticle';

const PANNEAUX = [
  ['ia', 'IA'],
  ['mots', 'Mots-clés'],
  ['seo', 'SEO'],
  ['diffusion', 'Diffusion'],
] as const;
type Panneau = (typeof PANNEAUX)[number][0];

/**
 * Éditeur d'article (maquette Editeur de Blog, BLOG §3) : contenu à gauche, panneaux à droite.
 * Publier et Planifier sont refusés tant qu'un point bloquant reste : l'onglet SEO s'ouvre (BLOG-04).
 */
export function EditeurArticle({ d, moi }: { d: EditeurArticleDonnees; moi: string }) {
  const a = useArticle(d, moi);
  const [panneau, setPanneau] = useState<Panneau>('ia');
  const [versionCorps, setVersionCorps] = useState(0);
  const [tagsSuggeres, setTagsSuggeres] = useState<string[]>([]);
  const [posts, setPosts] = useState<Record<string, string> | null>(null);
  /** Proposition choisie par l'artisan (BLOG §2) : jamais enregistrée ni publiée d'office. */
  const appliquerIa = (r: SortieIaBlog, choix?: string) => {
    if (r.action === 'rediger') {
      const { titre, sousTitre, meta, motCle, corpsHtml } = r.sortie;
      a.maj({ titre, sousTitre, meta, motCle, corpsHtml, genereParIA: true });
      setVersionCorps((v) => v + 1);
    } else if (r.action === 'titres') a.maj({ titre: choix ?? '' });
    else if (r.action === 'meta') a.maj({ meta: choix ?? '' });
    else if (r.action === 'alt') a.maj({ image: { ...a.c.image, alt: choix ?? '' } });
    else if (r.action === 'classement') {
      const cat = d.classement.categories.find((x) => x.nom === r.sortie.categorie);
      if (cat) a.maj({ categorieId: cat.id });
      setTagsSuggeres(r.sortie.tags);
    } else if (r.action === 'reseaux') {
      const { hashtags, ...textes } = r.sortie;
      setPosts(
        Object.fromEntries(
          Object.entries(textes).map(([k, v]) => [k, `${v}\n\n${hashtags.join(' ')}`]),
        ),
      );
      setPanneau('diffusion');
    }
  };
  const slug = a.c.slugAuto ? adresseArticle(a.c.titre || 'article', []) : a.c.slug;
  const voirSeo = () => setPanneau('seo');
  return (
    <div className="flex min-h-dvh flex-col bg-blanc">
      <BarreArticle
        titre={a.c.titre}
        statut={a.statut}
        modifie={a.modifie}
        bloquants={a.seo.bloquants.length}
        enCours={a.enCours}
        onVoirSeo={voirSeo}
        onEnregistrer={() => a.enregistrer()}
        onPlanifier={(date) => void a.planifier(date)}
        onPublier={() => a.publier()}
      />
      {a.message ? (
        <Banner tone={a.message.ton} className="m-3">
          {a.message.texte}
        </Banner>
      ) : null}
      <div className="flex flex-1 flex-col min-[1000px]:flex-row">
        <main className="grid min-w-0 flex-1 content-start gap-6 p-[clamp(16px,3vw,32px)]">
          <EnteteArticle c={a.c} maj={a.maj} medias={d.medias} hote={d.hote} />
          <CorpsRiche
            key={versionCorps}
            html={a.c.corpsHtml}
            onChange={(corpsHtml) => a.maj({ corpsHtml })}
            liens={d.liens}
          />
          <Field
            label="Méta-description"
            aide={`${a.c.meta.length} / 160 : ce que Google affiche sous le titre (120 à 160 caractères, avec le mot-clé).`}
          >
            <Textarea
              rows={3}
              value={a.c.meta}
              maxLength={320}
              onChange={(e) => a.maj({ meta: e.target.value })}
            />
          </Field>
          <ClassementArticle c={a.c} maj={a.maj} d={d} suggeres={tagsSuggeres} />
          <MentionsArticle mentions={d.mentions} />
        </main>
        <aside className="grid content-start gap-3 border-trait p-3 min-[1000px]:w-[380px] min-[1000px]:border-l">
          <nav aria-label="Panneaux" className="flex flex-wrap gap-1">
            {PANNEAUX.map(([p, l]) => (
              <button
                key={p}
                type="button"
                onClick={() => setPanneau(p)}
                aria-current={panneau === p ? 'true' : undefined}
                className={cn(
                  'min-h-11 rounded-control px-3 font-semibold',
                  panneau === p ? 'bg-accent-100 text-accent-800' : 'text-neutre-800',
                )}
              >
                {l}
                {p === 'seo' && a.seo.bloquants.length ? ` (${a.seo.bloquants.length})` : ''}
              </button>
            ))}
          </nav>
          {panneau === 'ia' ? (
            <PanneauIaArticle c={a.c} credits={d.credits} appliquer={appliquerIa} />
          ) : null}
          {panneau === 'mots' ? <PanneauMotsCles c={a.c} maj={a.maj} /> : null}
          {panneau === 'seo' ? <PanneauSeo c={a.c} seo={a.seo} hote={d.hote} slug={slug} /> : null}
          {panneau === 'diffusion' ? (
            <PanneauDiffusion
              c={a.c}
              url={`https://${d.hote}/blog/${slug}`}
              {...(posts ? { posts } : {})}
              tags={a.c.tags
                .map((t) => d.classement.tags.find((x) => x.id === t)?.nom ?? '')
                .filter(Boolean)}
            />
          ) : null}
        </aside>
      </div>
    </div>
  );
}
