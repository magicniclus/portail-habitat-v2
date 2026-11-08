'use client';

import { lignesFrise, verifierFrise, type Frise, type MotTranscrit } from '@ph/core/studio';
import { useMemo, useRef, useState, type ComponentProps } from 'react';
import { ApercuFrise } from './ApercuFrise';
import { BarreHautMontage } from './BarreHautMontage';
import { BibliothequeFrise } from './BibliothequeFrise';
import { CommandesLecture } from './CommandesLecture';
import { EcransPortail } from './EcransPortail';
import { InspecteurFrise } from './InspecteurFrise';
import { ManipulationApercu } from './ManipulationApercu';
import { MenuProjets } from './MenuProjets';
import { PanneauTournage } from './PanneauTournage';
import { PanneauIA } from './PanneauIA';
import type { FichiersProjet } from './sourcesFrise';
import { useActionsFrise } from './useActionsFrise';
import { useEnregistrementFrise } from './useEnregistrementFrise';
import { useHauteurFrise } from './useHauteurFrise';
import { useHistorique } from './useHistorique';
import { useImportMedias } from './useImportMedias';
import { useLectureFrise } from './useLectureFrise';
import { useRaccourcisMontage } from './useRaccourcisMontage';
import { ZoneFrise } from './ZoneFrise';

/**
 * Éditeur libre multipistes, plein écran, organisé comme les logiciels de montage : on importe
 * ses vidéos, sons et images, on les glisse sur autant de pistes qu'il faut, on règle volumes,
 * muet / solo, fondus, filtres et automations ; l'aperçu mixe le son en direct. Tout se fait sur
 * un brouillon (annuler, rétablir), vérifié en direct et revérifié côté serveur.
 */
export function EditeurFrise(p: {
  projetId: string;
  frise: Frise;
  fichiers: FichiersProjet;
  /** Mots de la voix enregistrée (sous-titres). */
  mots: MotTranscrit[];
  /** Claude peut revoir ce montage (prise et plan existants). */
  retouche: boolean;
  etat: string | null;
  /** Idée et script : tournage « Claude monte » (null : montage libre). */
  tournage: ComponentProps<typeof PanneauTournage>['claude'];
  /** Le robot filme les écrans. */
  filmage: boolean;
  /** Autres projets à ouvrir (menu « Projets »). */
  projets: readonly { id: string; titre: string }[];
  onFermer: () => void;
}) {
  const h = useHistorique(p.frise);
  const { brouillon, changer } = h;
  const [selection, setSelection] = useState<string | null>(null);
  const [miniature, setMiniature] = useState(false);
  const hauteur = useHauteurFrise(320);
  const e = useEnregistrementFrise(p.projetId, p.frise);
  const { message, setMessage, enCours } = e;
  const apercu = useRef<HTMLDivElement>(null);
  const lecture = useLectureFrise(brouillon);
  const tete = lecture.affiche;
  const erreurs = verifierFrise(brouillon).filter((x) => !x.startsWith('La frise est vide'));
  const imports = useImportMedias(p.projetId, brouillon, changer, (texte) =>
    setMessage({ ton: 'danger', texte }),
  );

  const lignes = useMemo(() => lignesFrise(brouillon, p.mots), [brouillon, p.mots]);
  const a = useActionsFrise({
    frise: brouillon,
    changer,
    tete,
    selection,
    setSelection,
    erreur: (texte) => setMessage({ ton: 'danger', texte }),
    filmes: p.fichiers.captures,
  });
  useRaccourcisMontage({ lecture, onScinder: a.scinder, onSupprimer: a.supprimer });

  return (
    <div
      data-ambiance="sombre"
      role="dialog"
      aria-modal="true"
      aria-label={`Éditeur de montage : ${brouillon.titre}`}
      className="fixed inset-0 z-50 grid text-montage-texte"
      style={{ gridTemplateRows: `52px minmax(0,1fr) 6px ${hauteur.hauteur}px` }}
    >
      <BarreHautMontage
        titre={brouillon.titre}
        etat={p.etat}
        message={message}
        erreurs={erreurs}
        rythme={[]}
        modifie={brouillon !== e.enregistre}
        onFermer={p.onFermer}
        onAnnuler={h.annuler}
        onRetablir={h.retablir}
        enregistrable={erreurs.length === 0 && !enCours}
        enCours={enCours}
        onEnregistrer={() => e.fabriquer(brouillon)}
        secondaire={{ libelle: 'Enregistrer', onClick: () => e.enregistrer(brouillon) }}
        menu={
          <MenuProjets
            projets={p.projets}
            actuel={p.projetId}
            modifie={brouillon !== e.enregistre}
          />
        }
      />
      <div className="grid min-h-0 grid-cols-[minmax(0,1fr)] gap-px bg-montage-fond lg:grid-cols-[300px_minmax(0,1fr)_340px]">
        <aside aria-label="Bibliothèque" className="hidden min-h-0 bg-montage-panneau lg:block">
          <BibliothequeFrise
            frise={brouillon}
            envois={imports.envois}
            onPoser={(c) => a.poser(c)}
            onRetouche={(r) => a.retoucher(r)}
            onFichiers={(f) => void imports.importer(f)}
            ecrans={
              <EcransPortail
                frise={brouillon}
                captures={p.fichiers.captures}
                filmage={p.filmage}
                enCours={enCours}
                onEcran={a.ecran}
                onFilmer={() => e.filmer(brouillon)}
                changer={changer}
              />
            }
            tournage={
              <PanneauTournage projetId={p.projetId} claude={p.tournage} onPrise={a.poserPrise} />
            }
            ia={<PanneauIA retouche={p.retouche} enCours={enCours} onRetouche={e.retoucher} />}
          />
        </aside>
        <section aria-label="Aperçu" className="grid min-h-0 grid-rows-[minmax(0,1fr)_56px]">
          <div ref={apercu} className="min-h-0 p-3">
            <ApercuFrise
              frise={brouillon}
              fichiers={p.fichiers}
              lignes={brouillon.sousTitres ? lignes : []}
              lecture={lecture}
              miniature={miniature}
            >
              <ManipulationApercu
                frise={brouillon}
                t={tete === 0 && !lecture.lecture ? 300 : tete}
                lignes={brouillon.sousTitres ? lignes : []}
                selection={selection}
                onSelection={setSelection}
                onDebut={h.memoriser}
                onChange={h.remplacer}
              />
            </ApercuFrise>
          </div>
          <CommandesLecture
            lecture={lecture}
            miniature={miniature}
            onMiniature={setMiniature}
            avecMiniature={Boolean(brouillon.miniature)}
            onPleinEcran={() => void apercu.current?.requestFullscreen?.()}
          />
        </section>
        <aside
          aria-label="Réglages"
          className="hidden min-h-0 overflow-y-auto bg-montage-panneau p-3 lg:block"
        >
          <InspecteurFrise
            frise={brouillon}
            mots={p.mots}
            selection={selection}
            tete={tete}
            changer={changer}
            onSelection={setSelection}
          />
        </aside>
      </div>
      <div
        role="separator"
        aria-orientation="horizontal"
        aria-label="Hauteur de la frise"
        onPointerDown={hauteur.tirer}
        className="cursor-row-resize bg-montage-trait hover:bg-montage-selection"
      />
      <ZoneFrise
        frise={brouillon}
        tete={tete}
        selection={selection}
        onSelection={setSelection}
        onTete={lecture.aller}
        onDebut={h.memoriser}
        onChange={h.remplacer}
        changer={changer}
        lignes={lignes}
        onDepot={(c, pisteId, debut) => a.poser(c, pisteId, debut)}
        onRetouche={(r, clipId) => a.retoucher(r, clipId)}
        onFichiers={(f, pisteId, debut) => void imports.importer(f, { pisteId, debut })}
      />
    </div>
  );
}
