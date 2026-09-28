'use client';

import {
  cibleRecherche,
  creerMoteur,
  requeteJournal,
  type DonneesRecherche,
  type Suggestion,
} from '@ph/core/recherche';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { routes } from '@/lib/routes';
import donnees from '../../../../docs/data/recherche-intentions.json';
import type { Retenue } from './choix';

/** Index compact (≈ 16 Ko compressés), dans ce module chargé au premier focus du champ. */
const moteur = creerMoteur(donnees as unknown as DonneesRecherche);
const MAX = 7;
/** Une requête sans résultat n'est journalisée qu'une fois la frappe arrêtée (pas à chaque lettre). */
const DELAI_JOURNAL_MS = 800;

export interface EtatSuggestions {
  ouvert: boolean;
  actifId: string;
  /** Meilleur résultat de la saisie : retenu à la validation s'il est net (score ≥ 8). */
  meilleur: Retenue | undefined;
  /** « Projets associés » (même métier), qui remplacent les chips après un résultat (RCH-06). */
  associees: Retenue[];
  urgence: boolean;
}

/** Ce que le formulaire appelle : clavier du champ et journal (événements `recherche_*`). */
export interface PontSuggestions {
  clavier: (touche: string) => boolean;
  /** Validation du formulaire : routage (RECHERCHE §3, RCH-04) et événement `recherche_saisie`. */
  valider: (v: { projet: string; cp: string; delai: string; choix?: Retenue }) => void;
}

type Nature = 'saisie' | 'choix' | 'zero' | 'abandon';

let session = '';
function idSession(): string {
  if (session) return session;
  try {
    session = sessionStorage.getItem('ph_rs') ?? '';
    if (!session) {
      session = Math.random().toString(36).slice(2, 12).padEnd(8, '0');
      sessionStorage.setItem('ph_rs', session);
    }
  } catch {
    session ||= Math.random().toString(36).slice(2, 12).padEnd(8, '0');
  }
  return session;
}

/** Événement sans donnée personnelle (requête nettoyée, identifiant d'onglet aléatoire). */
function journal(nature: Nature, q: string, extra: { intention?: string; rang?: number } = {}) {
  const requete = requeteJournal(q);
  if (!requete && nature !== 'choix') return;
  // `keepalive` : l'envoi survit à la navigation qui suit la validation (comme sendBeacon, mais
  // observable et interceptable partout, y compris Safari).
  void fetch('/api/recherche/evenement', {
    method: 'POST',
    keepalive: true,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nature, q: requete, session: idSession(), ...extra }),
  }).catch(() => {
    // Le journal ne doit jamais gêner la recherche.
  });
}

const retenue = (s: Suggestion): Retenue => ({
  id: s.id,
  libelle: s.libelle,
  prestation: s.prestation,
  metierId: s.metierId,
  score: s.score,
});

function Loupe() {
  return (
    <span
      aria-hidden="true"
      className="flex size-[34px] flex-none items-center justify-center rounded-[9px] bg-accent-100"
    >
      <svg
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--accent-700)"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="11" cy="11" r="6.5" />
        <path d="m16 16 4.5 4.5" />
      </svg>
    </span>
  );
}

/**
 * Liste de suggestions du champ « Quel est votre projet ? » (maquette Accueil, RECHERCHE §3) :
 * 2 caractères, 7 suggestions, mots reconnus en gras, métier, badge, correction, urgence, métiers.
 */
export default function SuggestionsProjet({
  q,
  focus,
  choisie,
  idListe,
  enregistrer,
  onChoisir,
  onEtat,
}: {
  q: string;
  focus: boolean;
  choisie: Retenue | null;
  idListe: string;
  /** Reçoit les commandes (clavier, journal) que le formulaire appelle. */
  enregistrer: (p: PontSuggestions) => void;
  onChoisir: (r: Retenue) => void;
  onEtat: (e: EtatSuggestions) => void;
}) {
  // Moteur local et instantané : la liste suit la frappe sans délai. Un délai laissait la liste
  // précédente à l'écran, et Entrée pouvait choisir une suggestion périmée.
  const qDiffere = q;
  const router = useRouter();
  const [actif, setActif] = useState(-1);
  const [ferme, setFerme] = useState(false);
  const [vu, setVu] = useState(q);
  const journalises = useRef(new Set<string>());

  // Nouvelle saisie : on rouvre la liste et on repart du haut (ajustement pendant le rendu).
  if (vu !== q) {
    setVu(q);
    setFerme(false);
    setActif(-1);
  }

  const res = useMemo(
    () => (qDiffere.trim().length >= 2 ? moteur.rechercher(qDiffere, { max: MAX }) : null),
    [qDiffere],
  );
  const liste: Suggestion[] = useMemo(
    () =>
      res
        ? res.resultats
        : moteur
            .populaires()
            .slice(0, 6)
            .map((p) => ({
              id: p.id,
              libelle: p.libelle,
              segments: [{ t: p.libelle, b: false }],
              metier: p.metier,
              metierId: '',
              prestation: p.prestation,
              score: 99,
            })),
    [res],
  );
  const aucun = Boolean(res && res.resultats.length === 0);
  const ouvert =
    focus && !ferme && !choisie && (liste.length > 0 || (aucun && qDiffere.trim().length >= 3));
  const actifId = ouvert && actif >= 0 ? `${idListe}-${actif}` : '';
  // « Aucun résultat » reste affiché hors focus : sinon il disparaît au clic sur « Lancer mon
  // estimation », le bouton remonte et le clic tombe à côté (RCH-05).
  const affiche = ouvert || (aucun && !choisie && qDiffere.trim().length >= 3);

  const choisir = (s: Suggestion, rang: number) => {
    journal('choix', qDiffere, { intention: s.id, rang });
    onChoisir(retenue(s));
    setActif(-1);
  };

  // État remonté au formulaire (ARIA du champ, validation, chips).
  const premier = res?.resultats[0];
  useEffect(() => {
    onEtat({
      ouvert,
      actifId,
      meilleur: premier ? retenue(premier) : undefined,
      associees: (res?.associees ?? []).map((a) => ({
        ...a,
        metierId: premier?.metierId ?? '',
        score: 99,
      })),
      urgence: Boolean(res?.urgence),
    });
    // onEtat vient du parent et change à chaque rendu : seules les données comptent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ouvert, actifId, res, premier]);

  // Requête sans résultat : journalisée une fois (RCH-05).
  useEffect(() => {
    if (!aucun || journalises.current.has(`zero:${qDiffere}`)) return;
    const t = setTimeout(() => {
      journalises.current.add(`zero:${qDiffere}`);
      journal('zero', qDiffere);
    }, DELAI_JOURNAL_MS);
    return () => clearTimeout(t);
  }, [aucun, qDiffere]);

  // Champ quitté avec une saisie et sans choix : abandon, journalisé une fois par requête.
  useEffect(() => {
    if (!focus && q.trim().length >= 2 && !choisie && !journalises.current.has(`abandon:${q}`)) {
      journalises.current.add(`abandon:${q}`);
      journal('abandon', q);
    }
  }, [focus, q, choisie]);

  useEffect(() => {
    enregistrer({
      clavier: (touche) => {
        if (!ouvert) {
          if (touche === 'ArrowDown') {
            setFerme(false);
            return true;
          }
          return false;
        }
        if (touche === 'ArrowDown') setActif((a) => (a + 1) % liste.length);
        else if (touche === 'ArrowUp') setActif((a) => (a <= 0 ? liste.length - 1 : a - 1));
        else if (touche === 'Enter' && actif >= 0 && liste[actif]) choisir(liste[actif], actif + 1);
        else if (touche === 'Escape') {
          setFerme(true);
          setActif(-1);
        } else return false;
        return true;
      },
      valider: (v) => {
        journal('saisie', q);
        router.push(
          cibleRecherche({ ...v, meilleur: premier ? retenue(premier) : undefined }) as Route,
        );
      },
    });
  });

  return (
    <>
      <p aria-live="polite" className="sr-only">
        {ouvert
          ? aucun
            ? 'Aucune suggestion'
            : `${liste.length} suggestion${liste.length > 1 ? 's' : ''}${res?.correction ? `, résultats pour ${res.correction}` : ''}`
          : ''}
      </p>
      {affiche ? (
        <div
          id={idListe}
          role="listbox"
          aria-label="Suggestions de projets"
          // Aucun résultat : le message s'affiche dans le flux, sans recouvrir le bouton de validation (RCH-05).
          className={`${aucun && liste.length === 0 ? 'relative mt-2' : 'absolute inset-x-0 top-[calc(100%+6px)] z-50'} max-h-[min(460px,70vh)] overflow-auto rounded-card border border-accent-200 bg-blanc p-1.5 shadow-lg max-sm:static max-sm:mt-2 max-sm:max-h-none max-sm:border-0 max-sm:p-0 max-sm:shadow-none`}
          onMouseDown={(e) => e.preventDefault()}
        >
          {res?.correction ? (
            <p className="m-0 px-3 pt-2 pb-1.5 text-[13.5px] text-neutre-700">
              Résultats pour <strong className="text-texte">{res.correction}</strong>
            </p>
          ) : null}
          {res?.urgence ? (
            <p
              role="alert"
              className="m-0 mb-1 rounded-control bg-attention-fond px-3 py-[9px] text-sm font-semibold text-attention"
            >
              Urgence ? Indiquez « Dès que possible » : les artisans disponibles sous 24 h sont
              prioritaires.
            </p>
          ) : null}
          {!res ? (
            <p className="m-0 px-3 pt-2 pb-1 text-[12.5px] tracking-[0.07em] text-neutre-700 uppercase">
              Projets les plus demandés
            </p>
          ) : null}
          {liste.map((s, i) => (
            <div
              key={s.id}
              id={`${idListe}-${i}`}
              role="option"
              aria-selected={i === actif}
              onClick={() => choisir(s, i + 1)}
              onMouseEnter={() => setActif(i)}
              className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-control px-3 py-2.5 ${i === actif ? 'bg-accent-100' : ''}`}
            >
              <Loupe />
              <span className="flex min-w-0 flex-1 flex-col gap-px">
                <span className="text-[15.5px] leading-[21px] text-texte">
                  {s.segments.map((g, j) =>
                    g.b ? <strong key={j}>{g.t}</strong> : <span key={j}>{g.t}</span>,
                  )}
                </span>
                {s.metier ? <span className="text-[13px] text-neutre-700">{s.metier}</span> : null}
              </span>
              {s.prestation ? (
                <span className="flex-none rounded-pill bg-accent-100 px-2 py-[3px] text-xs font-bold whitespace-nowrap text-accent-800 max-[359px]:hidden">
                  Estimation en ligne
                </span>
              ) : null}
            </div>
          ))}
          {aucun ? (
            <div className="grid gap-1.5 p-3">
              <p className="m-0 text-[15px] font-bold">
                Nous n&apos;avons pas trouvé « {qDiffere.trim()} »
              </p>
              <p className="m-0 text-sm leading-[21px] text-neutre-800">
                Décrivez-le avec vos mots et continuez : un conseiller oriente votre demande vers le
                bon artisan. Essayez aussi un métier (plombier, électricien…) ou un mot plus court.
              </p>
            </div>
          ) : null}
          {res && res.metiers.length > 0 ? (
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1.5 border-t border-trait px-3 pt-2.5 pb-1.5">
              <span className="text-[13px] text-neutre-700">Métiers :</span>
              {res.metiers.map((m) => (
                <a
                  key={m.id}
                  href={routes.artisansFiltres({ metier: m.id })}
                  className="inline-flex min-h-11 items-center rounded-pill border border-accent-200 px-2.5 text-[13.5px] font-semibold text-accent-700 no-underline"
                >
                  {m.nom}
                </a>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
