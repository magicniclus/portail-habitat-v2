'use client';

import type { SujetStudio } from '@ph/core/studio';
import { formatNombre } from '@ph/core/format';
import { Badge, Button } from '@ph/ui';
import { DetailSujet } from './DetailSujet';

/** Titre de vidéo comparé sans casse ni espaces en trop (lien des inspirations). */
export const cleTitre = (t: string) => t.toLowerCase().replace(/\s+/g, ' ').trim();

/** Mot comparé sans casse ni ponctuation (« RIEN ? » = « rien »). */
const simple = (m: string) => m.toLowerCase().replace(/[^\p{L}\p{N}€]/gu, '');

/**
 * Une vidéo proposée, sur une ligne (miniature à gauche, l'essentiel à droite) : un seul choix (« Choisir cette
 * vidéo »). Le détail (script, accroches, inspirations, versions) est replié.
 */
export function CarteSujet({
  sujet,
  choisi,
  autreChoisi,
  desactive,
  onChoisir,
  onDecliner,
  onGarder,
  gardee,
  liens,
}: {
  sujet: SujetStudio;
  choisi: boolean;
  /** Une autre idée est déjà choisie : celle-ci passe au second plan. */
  autreChoisi: boolean;
  desactive: boolean;
  onChoisir: () => void;
  onDecliner: (nombre: number) => void;
  /** Mettre l'idée de côté pour la tourner plus tard, sans rappeler l'IA. */
  onGarder: () => void;
  gardee: boolean;
  /** Titre d'une vidéo analysée → lien pour la regarder. */
  liens: ReadonlyMap<string, string>;
}) {
  const potentiel = sujet.potentielViral ?? null;
  // Mot(s) mis en avant : « 2 minutes » met en avant « 2 » et « minutes ».
  const motsAccent = new Set(
    (sujet.miniature?.accent ?? '').split(/\s+/).map(simple).filter(Boolean),
  );
  return (
    <li
      className={`grid overflow-hidden rounded-card border bg-blanc transition-opacity md:grid-cols-[240px_minmax(0,1fr)] ${
        choisi ? 'border-accent ring-2 ring-accent' : 'border-trait'
      } ${autreChoisi ? 'opacity-60 hover:opacity-100' : ''}`}
    >
      <div className="relative grid min-h-40 place-items-center bg-neutre-900 px-5 pb-6 pt-12 text-center md:min-h-full">
        <p className="m-0 text-xl font-black uppercase leading-tight text-blanc">
          {(sujet.miniature?.texte ?? sujet.titre).split(/\s+/).map((m, i) => (
            <span key={i}>
              <span
                className={
                  motsAccent.has(simple(m)) ? 'rounded bg-attention-fond px-1 text-texte' : ''
                }
              >
                {m}
              </span>{' '}
            </span>
          ))}
        </p>
        {potentiel !== null ? (
          <Badge
            className="absolute left-3 top-3"
            tone={potentiel >= 7 ? 'succes' : potentiel >= 4 ? 'attention' : 'neutre'}
          >
            Viral {potentiel}/10
          </Badge>
        ) : null}
        <button
          type="button"
          onClick={onGarder}
          disabled={desactive || gardee}
          aria-label={gardee ? 'Idée gardée' : 'Garder cette idée pour plus tard'}
          title={gardee ? 'Idée gardée' : 'Garder pour plus tard'}
          className="absolute right-2 top-2 grid size-11 place-items-center rounded-full text-xl text-blanc hover:bg-blanc/15 disabled:opacity-100"
        >
          {gardee ? '★' : '☆'}
        </button>
      </div>

      <div className="flex flex-col gap-3 p-4 md:p-5">
        <h3 className="m-0 text-lg leading-snug">{sujet.titre}</h3>
        <p className="m-0 text-sm text-neutre-700">
          {sujet.vuesVisees
            ? `${formatNombre(sujet.vuesVisees.min)} à ${formatNombre(sujet.vuesVisees.max)} vues · +${formatNombre(sujet.abonnesVises)} abonnés · `
            : ''}
          {sujet.dureeCibleS} s
        </p>
        <p className="m-0 text-sm">{sujet.angle}</p>
        {sujet.concept ? (
          <div className="rounded-control bg-accent-100 px-3 py-2 text-sm">
            <p className="m-0">
              <strong>Concept repris : {sujet.concept.format}</strong>
              {sujet.concept.source ? (
                <>
                  {' · '}
                  {liens.get(cleTitre(sujet.concept.source)) ? (
                    <a
                      href={liens.get(cleTitre(sujet.concept.source))}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      voir la vidéo source ↗
                    </a>
                  ) : (
                    <span className="text-neutre-700">« {sujet.concept.source} »</span>
                  )}
                </>
              ) : null}
            </p>
            <p className="m-0 mt-0.5 text-neutre-800">{sujet.concept.transposition}</p>
          </div>
        ) : null}
        {sujet.accroches[0] ? (
          <p className="m-0 border-l-4 border-accent pl-3 text-sm font-semibold">
            « {sujet.accroches[0]} »
          </p>
        ) : null}

        <DetailSujet sujet={sujet} liens={liens} desactive={desactive} onDecliner={onDecliner} />

        <Button
          className="mt-auto w-full md:w-auto md:self-end"
          taille="lg"
          variant={choisi ? 'secondaire' : 'primaire'}
          disabled={desactive || choisi}
          onClick={onChoisir}
        >
          {choisi ? '✓ Vidéo choisie' : 'Choisir cette vidéo'}
        </Button>
      </div>
    </li>
  );
}
