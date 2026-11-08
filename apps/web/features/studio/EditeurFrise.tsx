'use client';

import {
  couperClip,
  clipParId,
  nouvelIdFrise,
  poserClip,
  supprimerClip,
  verifierFrise,
  type Frise,
} from '@ph/core/studio';
import { useRef, useState, useTransition } from 'react';
import { enregistrerFrise } from './actions';
import { ApercuFrise } from './ApercuFrise';
import { BarreHautMontage } from './BarreHautMontage';
import { BibliothequeFrise } from './BibliothequeFrise';
import { CommandesLecture } from './CommandesLecture';
import { InspecteurFrise } from './InspecteurFrise';
import type { ClipGlisse } from './PistesFrise';
import type { FichiersProjet } from './sourcesFrise';
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
  etat: string | null;
  onFermer: () => void;
}) {
  const h = useHistorique(p.frise);
  const { brouillon, changer } = h;
  const [enregistre, setEnregistre] = useState(p.frise);
  const [selection, setSelection] = useState<string | null>(null);
  const hauteur = useHauteurFrise(320);
  const [message, setMessage] = useState<{ ton: 'succes' | 'danger'; texte: string } | null>(null);
  const [enCours, demarrer] = useTransition();
  const apercu = useRef<HTMLDivElement>(null);
  const lecture = useLectureFrise(brouillon);
  const tete = lecture.affiche;
  const erreurs = verifierFrise(brouillon).filter((x) => !x.startsWith('La frise est vide'));
  const imports = useImportMedias(p.projetId, brouillon, changer, (texte) =>
    setMessage({ ton: 'danger', texte }),
  );

  const poser = (c: ClipGlisse, pisteId = '', debut = tete) => {
    const id = nouvelIdFrise(
      'c',
      brouillon.pistes.flatMap((x) => x.clips.map((y) => y.id)),
    );
    const f = poserClip(brouillon, pisteId, { id, debut: Math.round(debut), ...c });
    if (f === brouillon)
      return setMessage({ ton: 'danger', texte: 'Plus de place : 16 pistes au plus.' });
    changer(f);
    setSelection(id);
  };
  const scinder = () => {
    const r = selection ? clipParId(brouillon, selection) : null;
    if (r) changer(couperClip(brouillon, r.clip.id, tete));
  };
  const supprimer = selection
    ? () => {
        changer(supprimerClip(brouillon, selection));
        setSelection(null);
      }
    : undefined;
  useRaccourcisMontage({ lecture, onScinder: scinder, onSupprimer: supprimer });

  const enregistrer = () =>
    demarrer(async () => {
      setMessage(null);
      const r = await enregistrerFrise({ projetId: p.projetId, frise: brouillon });
      if (r.ok) setEnregistre(brouillon);
      setMessage(
        r.ok
          ? { ton: 'succes', texte: 'Montage enregistré.' }
          : { ton: 'danger', texte: r.message },
      );
    });

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
        modifie={brouillon !== enregistre}
        onFermer={p.onFermer}
        onAnnuler={h.annuler}
        onRetablir={h.retablir}
        enregistrable={erreurs.length === 0 && !enCours}
        enCours={enCours}
        onEnregistrer={enregistrer}
        libelleEnregistrer="Enregistrer"
      />
      <div className="grid min-h-0 grid-cols-[minmax(0,1fr)] gap-px bg-montage-fond lg:grid-cols-[300px_minmax(0,1fr)_340px]">
        <aside aria-label="Bibliothèque" className="hidden min-h-0 bg-montage-panneau lg:block">
          <BibliothequeFrise
            frise={brouillon}
            envois={imports.envois}
            onPoser={(c) => poser(c)}
            onFichiers={(f) => void imports.importer(f)}
          />
        </aside>
        <section aria-label="Aperçu" className="grid min-h-0 grid-rows-[minmax(0,1fr)_56px]">
          <div ref={apercu} className="min-h-0 p-3">
            <ApercuFrise frise={brouillon} fichiers={p.fichiers} lecture={lecture} />
          </div>
          <CommandesLecture
            lecture={lecture}
            miniature={false}
            onMiniature={() => undefined}
            avecMiniature={false}
            onPleinEcran={() => void apercu.current?.requestFullscreen?.()}
          />
        </section>
        <aside
          aria-label="Réglages"
          className="hidden min-h-0 overflow-y-auto bg-montage-panneau p-3 lg:block"
        >
          <InspecteurFrise
            frise={brouillon}
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
        onDepot={(c, pisteId, debut) => poser(c, pisteId, debut)}
        onFichiers={(f, pisteId, debut) => void imports.importer(f, { pisteId, debut })}
      />
    </div>
  );
}
