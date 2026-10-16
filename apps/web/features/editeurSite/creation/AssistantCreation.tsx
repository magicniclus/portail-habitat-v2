'use client';

import type {
  OperationIa,
  PagePlanifiee,
  QuestionCreation,
  ReponsesCreation,
} from '@ph/core/sites';
import { Banner, Button } from '@ph/ui';
import { useEffect, useRef, useState } from 'react';
import { posterJson } from '@/lib/posterJson';
import { QuestionnaireCreation } from './QuestionnaireCreation';

interface PageGeneree {
  operations: OperationIa[];
  avertissements: string[];
  apercu: boolean;
}

/**
 * Création assistée (IA_SITE §3.1, §4) : questionnaire, puis pages générées une à une (accueil
 * d'abord), chacune appliquée en une étape d'historique. Sans Site Pro, seule l'accueil est
 * générée, en aperçu jamais appliqué au site. Après paiement, reprise sans aucune question.
 */
export function AssistantCreation({
  questionnaire,
  reprise,
  enregistrer,
  appliquer,
  onApercu,
  onFermer,
}: {
  questionnaire?: { questions: QuestionCreation[]; repris: string[] };
  /** Reprise après paiement (SITE-IA-02) : démarre aussitôt, sans questionnaire. */
  reprise: boolean;
  enregistrer: () => Promise<string | null>;
  appliquer: (ops: OperationIa[]) => string | null;
  onApercu: (ops: OperationIa[]) => void;
  onFermer: () => void;
}) {
  const [etat, setEtat] = useState<'questions' | 'generation' | 'fin'>(
    reprise ? 'generation' : 'questions',
  );
  const [progres, setProgres] = useState<{ fait: number; total: number; nom: string } | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [suite, setSuite] = useState<{ plan: PagePlanifiee[]; faites: string[] } | null>(null);
  const [aCompleter, setACompleter] = useState(0);
  const lance = useRef(false);

  const generer = async (plan: PagePlanifiee[], faites: string[]) => {
    setEtat('generation');
    setErreur(null);
    const ok = [...faites];
    for (const p of plan) {
      if (ok.includes(p.cle)) continue;
      setProgres({ fait: ok.length, total: plan.length, nom: p.nom });
      const r = await posterJson<PageGeneree>('/api/pro/site/ia/creation/page', { cle: p.cle });
      const e = !r.ok ? r.message : r.data.apercu ? null : appliquer(r.data.operations);
      if (e) {
        setSuite({ plan, faites: ok });
        return setErreur(e);
      }
      if (r.ok && r.data.apercu) {
        onApercu(r.data.operations);
        return onFermer();
      }
      if (r.ok) setACompleter((n) => n + r.data.avertissements.length);
      ok.push(p.cle);
    }
    setProgres({ fait: plan.length, total: plan.length, nom: '' });
    setEtat('fin');
  };

  const demarrer = async (reponses: ReponsesCreation) => {
    setEtat('generation');
    const e = await enregistrer();
    if (e) return setErreur(e);
    const r = await posterJson<{ plan: PagePlanifiee[] }>('/api/pro/site/ia/creation', {
      reponses,
    });
    if (!r.ok) return setErreur(r.message);
    await generer(r.data.plan, []);
  };

  useEffect(() => {
    if (!reprise || lance.current) return;
    lance.current = true;
    void (async () => {
      const r = await posterJson<{ plan: PagePlanifiee[]; accueil: OperationIa[] }>(
        '/api/pro/site/ia/creation/reprendre',
        {},
      );
      if (!r.ok) return setErreur(r.message);
      const e = r.data.accueil.length ? appliquer(r.data.accueil) : null;
      if (e) return setErreur(e);
      await generer(r.data.plan, ['accueil']);
    })();
    // Une seule reprise par ouverture de l'éditeur.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reprise]);

  if (etat === 'questions' && questionnaire)
    return (
      <QuestionnaireCreation
        {...questionnaire}
        onFini={(r) => void demarrer(r)}
        onAnnuler={onFermer}
      />
    );

  const pct = progres ? Math.round((progres.fait / progres.total) * 100) : 0;
  return (
    <section aria-labelledby="creation-ia" className="grid gap-3">
      <h2 id="creation-ia" className="m-0 text-lg">
        {etat === 'fin' ? 'Votre site est prêt' : 'L’IA crée votre site'}
      </h2>
      <div
        role="progressbar"
        aria-label="Pages créées"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        className="h-2 overflow-hidden rounded-pill bg-neutre-200"
      >
        <div className="h-full bg-accent-action" style={{ width: `${pct}%` }} />
      </div>
      {etat === 'generation' && progres && !erreur ? (
        <p className="m-0 text-[15px]" aria-live="polite">
          Page {progres.fait + 1} sur {progres.total} : {progres.nom}…
        </p>
      ) : null}
      {erreur ? (
        <Banner tone="danger">
          {erreur}
          {suite ? (
            <span className="mt-2 block">
              <Button taille="sm" onClick={() => void generer(suite.plan, suite.faites)}>
                Réessayer
              </Button>
            </span>
          ) : null}
        </Banner>
      ) : null}
      {etat === 'fin' ? (
        <>
          <Banner tone="succes">
            {`${progres?.total ?? 0} pages créées. Relisez-les, puis Enregistrer et Publier. Ctrl Z annule la dernière page ; votre ancien site est dans « Mes modèles ».`}
          </Banner>
          {aCompleter ? (
            <Banner tone="info">
              {`${aCompleter} information(s) à compléter (« [à compléter] ») : la publication reste bloquée tant qu’elles ne sont pas remplies.`}
            </Banner>
          ) : null}
        </>
      ) : null}
      {etat === 'fin' || erreur ? (
        <div>
          <Button variant="secondaire" onClick={onFermer}>
            Fermer
          </Button>
        </div>
      ) : null}
    </section>
  );
}
