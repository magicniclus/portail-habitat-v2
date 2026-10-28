'use client';

import { changerDisposition, changerNombreBlocs, type PageSite } from '@ph/core/sites';
import { appelSections } from '../MesSections';
import type { InfoSelection, OpSelection } from '../selection';
import type { useActionsEditeur } from '../useActionsEditeur';
import type { useBrouillonSite } from '../useBrouillonSite';
import type { ContexteReglages } from './contexte';
import { PanneauProprietes } from './PanneauProprietes';
import { ReglagesNavigation } from './ReglagesNavigation';

const nouvelId = () => Math.random().toString(36).slice(2, 10);

/** Colonne de droite de l'éditeur : réglages de la sélection, ou de la navigation (globale). */
export function ColonneDroite({
  s,
  page,
  info,
  c,
  selection,
  agir,
  majPage,
  flash,
  executer,
  enCours,
}: {
  s: ReturnType<typeof useBrouillonSite>;
  page: PageSite;
  info: InfoSelection | null;
  c: ContexteReglages;
  selection: string | null;
  agir: (op: OpSelection) => void;
  majPage: (f: (p: PageSite) => PageSite) => void;
  flash: (m: string) => void;
  executer: ReturnType<typeof useActionsEditeur>['executer'];
  enCours: boolean;
}) {
  return (
    <aside
      aria-label="Réglages de la sélection"
      className="min-h-0 min-w-0 overflow-x-hidden overflow-y-auto border-trait bg-blanc min-[900px]:h-full min-[900px]:w-[320px] min-[900px]:border-l"
    >
      <PanneauProprietes
        page={page}
        info={info}
        c={c}
        onAction={(op) => agir(op)}
        onBlocs={(n) => selection && majPage((p) => changerNombreBlocs(p, selection!, n, nouvelId))}
        onDisposition={(l) =>
          selection && majPage((p) => changerDisposition(p, selection!, l, nouvelId))
        }
        onEnregistrerZone={async (z) => {
          const r = await appelSections({
            action: 'enregistrer',
            nom: z.p.nom || 'Zone',
            section: z,
          });
          flash(
            r.ok ? `« ${z.p.nom || 'Zone'} » ajoutée à Mes zones (Ajouter › Zones).` : r.message,
          );
        }}
        navigation={(onglet) => (
          <ReglagesNavigation
            nav={s.b.navigation}
            page={page}
            onglet={onglet}
            c={c}
            onChange={(n) => s.modifier((b) => ({ ...b, navigation: n }))}
            onPage={(r) => majPage((p) => ({ ...p, ...r }))}
            nonEnregistree={s.navModifiee}
            onEnregistrer={() =>
              executer(s.enregistrerNavigation, 'Navigation enregistrée sur toutes les pages.')
            }
            onAnnuler={s.annulerNavigation}
            enCours={enCours}
          />
        )}
      />
    </aside>
  );
}
