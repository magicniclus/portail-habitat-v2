'use client';

import { BLOCS_MAX, DISPOSITIONS, type Ligne, type Section } from '@ph/core/sites';
import { niveauxEditeur } from '@ph/ui/tokens';
import { cn } from '@ph/ui';
import { Action, Curseur, Groupe, Interrupteur, Libelle, Segments } from './controles';
import { Couleurs } from './Couleurs';
import { Identifiant, ReglagesFond, Visibilite } from './Communs';
import { NOMS_APPAREIL, pourAppareil, type ContexteReglages } from './contexte';
import { ALIGN_V } from './ReglagesBloc';
import { Animation } from './Animation';

type Onglet = 'general' | 'avance';

/** Zone (bande pleine largeur de la page) : nom, largeur, marges, fond, contenu. */
export function ReglagesZone(p: {
  zone: Section;
  onglet: Onglet;
  c: ContexteReglages;
  idPris: (v: string) => boolean;
  onEnregistrer: () => void;
}) {
  const { zone: z, c } = p;
  if (p.onglet === 'avance')
    return (
      <>
        <Identifiant valeur={z.p.ancre} cle="ancre" ancre dejaPris={p.idPris(z.p.ancre)} c={c} />
        <Animation anim={z.p.anim} c={c} />
        <Visibilite masque={z.p.masque} appareil={c.appareil} c={c} />
      </>
    );
  return (
    <>
      <Groupe titre="Zone">
        <div className="grid gap-1.5">
          <Libelle texte="Nom dans la structure" htmlFor="zone-nom" />
          <input
            id="zone-nom"
            value={z.p.nom}
            maxLength={80}
            onChange={(e) => c.maj({ nom: e.target.value })}
            className="min-h-11 rounded-[8px] border border-trait px-3 text-base"
          />
        </div>
        <Segments
          libelle="Largeur du contenu"
          valeur={z.p.largeur}
          options={[
            ['boite', 'Centrée'],
            ['plein', 'Pleine largeur'],
          ]}
          onChange={(largeur) => c.maj({ largeur })}
        />
        <Curseur
          libelle="Marge haut et bas"
          valeur={z.p.padY[c.appareil]}
          min={0}
          max={200}
          pas={4}
          suffixe={NOMS_APPAREIL[c.appareil]}
          onChange={(v) => c.maj({ padY: pourAppareil(z.p.padY, c.appareil, v) })}
        />
      </Groupe>
      <ReglagesFond p={z.p} c={c} image />
      <Groupe titre="Contenu">
        <Action onClick={() => c.ouvrirAjout('sections')}>
          + Ajouter une section dans cette zone
        </Action>
        <Action onClick={p.onEnregistrer}>★ Enregistrer comme modèle de zone</Action>
        <Action
          onClick={() =>
            c.demanderIa(
              `Réécris les textes de la zone « ${z.p.nom || 'sans nom'} » : plus clairs et plus engageants, sans inventer de faits.`,
            )
          }
        >
          Réécrire les textes de la zone avec l’IA
        </Action>
      </Groupe>
    </>
  );
}

/** Section (rangée de blocs) : nombre et disposition des blocs, espacement, alignement, fond. */
export function ReglagesLigne(p: {
  ligne: Ligne;
  onglet: Onglet;
  c: ContexteReglages;
  idPris: (v: string) => boolean;
  onBlocs: (n: number) => void;
  onDisposition: (largeurs: readonly number[]) => void;
}) {
  const { ligne: l, c } = p;
  if (p.onglet === 'avance')
    return (
      <>
        <Groupe titre="Affichage mobile">
          <Interrupteur
            libelle="Empiler les blocs sur mobile"
            actif={l.p.empile}
            onChange={(empile) => c.maj({ empile })}
          />
          <Interrupteur
            libelle="Inverser l’ordre sur mobile"
            actif={l.p.inverse}
            onChange={(inverse) => c.maj({ inverse })}
          />
        </Groupe>
        <Identifiant
          valeur={l.p.htmlId ?? ''}
          cle="htmlId"
          dejaPris={p.idPris(l.p.htmlId ?? '')}
          c={c}
        />
        <Visibilite masque={l.p.masque} appareil={c.appareil} c={c} />
      </>
    );
  const cle = l.cols.map((x) => x.w).join('-');
  return (
    <>
      <Groupe titre="Blocs">
        <Segments
          libelle="Nombre de blocs"
          valeur={l.cols.length}
          options={Array.from({ length: BLOCS_MAX }, (_, i) => [i + 1, String(i + 1)] as const)}
          onChange={p.onBlocs}
        />
        <div className="grid gap-1.5">
          <Libelle texte="Disposition" droite={cle.split('-').join(' · ')} />
          <div role="radiogroup" aria-label="Disposition" className="grid grid-cols-4 gap-1.5">
            {DISPOSITIONS.map((d) => (
              <button
                key={d.cle}
                type="button"
                role="radio"
                aria-checked={d.cle === cle}
                aria-label={d.libelle}
                title={d.libelle}
                onClick={() => p.onDisposition(d.largeurs)}
                className={cn(
                  'flex min-h-11 gap-0.5 rounded-[6px] bg-blanc p-1',
                  d.cle === cle ? 'border-2' : 'border border-trait',
                )}
                style={d.cle === cle ? { borderColor: niveauxEditeur.section } : undefined}
              >
                {d.largeurs.map((w, i) => (
                  <span
                    key={i}
                    className="rounded-[2px]"
                    style={{
                      flex: w,
                      background:
                        d.cle === cle ? niveauxEditeur.section : 'var(--color-neutre-300)',
                    }}
                  />
                ))}
              </button>
            ))}
          </div>
        </div>
        <Curseur
          libelle="Espace entre blocs"
          valeur={l.p.gap}
          min={0}
          max={96}
          pas={4}
          onChange={(gap) => c.maj({ gap })}
        />
      </Groupe>
      <Groupe titre="Alignement vertical">
        <Segments
          libelle="Aligner les blocs"
          valeur={l.p.valign}
          options={[...ALIGN_V, ['stretch', 'Étirer']]}
          onChange={(valign) => c.maj({ valign })}
        />
      </Groupe>
      <Groupe titre="Fond">
        <Couleurs
          libelle="Fond de la section"
          valeur={l.p.fond}
          jetons={['aucun', 'blanc', 'clair', 'primaire', 'sombre']}
          palette={c.palette}
          onChange={(fond) => c.maj({ fond })}
        />
      </Groupe>
    </>
  );
}
