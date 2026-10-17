'use client';

import { controlesSeo, type PageSite } from '@ph/core/sites';
import { Field, Input, Textarea } from '@ph/ui';

/** Référencement de la page (SITE_INTERNET §4.5) : aperçu Google, longueurs, vérifications. */
export function PanneauSeo({
  page,
  ville,
  hote,
  onChange,
}: {
  page: PageSite;
  ville?: string;
  hote: string;
  onChange: (seo: PageSite['seo']) => void;
}) {
  const { controles, score } = controlesSeo(page, page.type === 'mentions' ? undefined : ville);
  const maj = (p: Partial<PageSite['seo']>) => onChange({ ...page.seo, ...p });
  return (
    <div className="grid gap-4">
      <div className="grid gap-1 rounded-[12px] border border-trait p-3">
        <span className="text-sm text-neutre-800">
          {hote}/{page.slug}
        </span>
        <span className="text-lg text-info">{page.seo.title || page.nom}</span>
        <span className="text-sm">{page.seo.meta || 'Ajoutez une description.'}</span>
      </div>
      <Field
        label={`Titre (${page.seo.title.length}/60)`}
        aide="Entre 30 et 60 caractères, avec votre ville."
      >
        <Input
          value={page.seo.title}
          maxLength={120}
          onChange={(e) => maj({ title: e.target.value })}
        />
      </Field>
      <Field
        label={`Description (${page.seo.meta.length}/155)`}
        aide="Entre 110 et 155 caractères."
      >
        <Textarea
          value={page.seo.meta}
          maxLength={320}
          onChange={(e) => maj({ meta: e.target.value })}
        />
      </Field>
      <Field label="Mot-clé principal">
        <Input
          value={page.seo.motCle}
          maxLength={80}
          onChange={(e) => maj({ motCle: e.target.value })}
        />
      </Field>
      <div className="grid gap-2">
        <strong>Score : {score}/100</strong>
        <ul className="m-0 grid list-none gap-1 p-0 text-[15px]">
          {controles.map((c) => (
            <li key={c.cle} className="flex gap-2">
              <span aria-hidden="true">{c.ok ? '✓' : '✗'}</span>
              <span className={c.ok ? '' : 'text-danger'}>
                {c.libelle}
                <span className="sr-only">{c.ok ? ' : correct' : ' : à corriger'}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
