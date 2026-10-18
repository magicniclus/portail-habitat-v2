'use client';

import { LARGEURS_REFERENCE, type Appareil } from '@ph/core/comportement';
import type { ReplayLu } from '@ph/firebase/admin-serveur';
import { Button, Chip } from '@ph/ui';
import { couleursComportement } from '@ph/ui/tokens';
import { useEffect, useRef, useState } from 'react';
import { ApercuPage } from './ApercuPage';
import { dureeReplay, etatReplay } from './lecture';

/** Lecteur : curseur, clics et défilement rejoués sur la page réelle (pas de DOM enregistré). */
export function LecteurReplay({ chemin, replay }: { chemin: string; replay: ReplayLu }) {
  const largeur = LARGEURS_REFERENCE[replay.appareil as Appareil] ?? LARGEURS_REFERENCE.ordinateur;
  const duree = Math.max(1, dureeReplay(replay.evenements));
  const [t, setT] = useState(0);
  const [lecture, setLecture] = useState(true);
  const [vitesse, setVitesse] = useState(2);
  const defileur = useRef<HTMLDivElement>(null);
  const echelleRef = useRef(1);

  useEffect(() => {
    if (!lecture) return;
    let precedent = performance.now();
    let raf = requestAnimationFrame(function pas(maintenant) {
      const dt = (maintenant - precedent) * vitesse;
      precedent = maintenant;
      setT((v) => {
        const suivant = Math.min(duree, v + dt);
        if (suivant >= duree) setLecture(false);
        return suivant;
      });
      raf = requestAnimationFrame(pas);
    });
    return () => cancelAnimationFrame(raf);
  }, [lecture, vitesse, duree]);

  const etat = etatReplay(replay.evenements, t);
  useEffect(() => {
    if (defileur.current) defileur.current.scrollTop = etat.haut * echelleRef.current;
  }, [etat.haut]);

  return (
    <div className="flex min-w-0 flex-col gap-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => (t >= duree ? (setT(0), setLecture(true)) : setLecture(!lecture))}>
          {lecture ? 'Pause' : 'Lire'}
        </Button>
        <Button variant="secondaire" onClick={() => (setT(0), setLecture(true))}>
          Recommencer
        </Button>
        {[1, 2, 4].map((v) => (
          <Chip key={v} selectionne={vitesse === v} onClick={() => setVitesse(v)}>
            ×{v}
          </Chip>
        ))}
        <progress
          className="h-1.5 min-w-[120px] flex-1"
          max={duree}
          value={t}
          aria-label="Avancement du replay"
        />
      </div>
      <ApercuPage
        chemin={chemin}
        largeur={largeur}
        defileur={defileur}
        calques={(m) => {
          echelleRef.current = m.echelle;
          return (
            <svg
              viewBox={`0 0 ${largeur} ${m.hauteur}`}
              preserveAspectRatio="none"
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 h-full w-full"
            >
              <polyline
                points={etat.trace.map(([x, y]) => `${x},${y}`).join(' ')}
                fill="none"
                stroke={couleursComportement.trajet}
                strokeOpacity={0.55}
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
              />
              {etat.clics.map((c, i) => (
                <circle
                  key={i}
                  cx={c.x}
                  cy={c.y}
                  r={8 + (c.age / 1500) * 14}
                  fill="none"
                  stroke={couleursComportement.rage}
                  strokeWidth={2}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              {etat.curseur ? (
                <circle
                  cx={etat.curseur[0]}
                  cy={etat.curseur[1]}
                  r={7}
                  fill={couleursComportement.curseur}
                  vectorEffect="non-scaling-stroke"
                />
              ) : null}
            </svg>
          );
        }}
      />
    </div>
  );
}
