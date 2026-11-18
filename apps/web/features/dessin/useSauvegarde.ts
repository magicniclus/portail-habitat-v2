'use client';

import type { Scene } from '@ph/core/dessin';
import { useCallback, useEffect, useRef, useState } from 'react';
import { enregistrerPlan, type EspaceDessin } from './api';
import { ecrireBrouillon, effacerBrouillon } from './brouillons';
import { CLE_ESSAI } from './essai';

/** Enregistrement automatique (DES-39) : 2 s après la dernière modification. */
export type EtatSauvegarde =
  | 'enregistre'
  | 'modifie'
  | 'enregistrement'
  | 'hors_ligne'
  | 'conflit'
  | 'erreur'
  /** Essai sans compte (DES-03) : gardé sur cet appareil seulement. */
  | 'local';

const DELAI = 2000;

export function useSauvegarde(e: {
  espace: EspaceDessin;
  planId: string;
  scene: Scene;
  revisionInitiale: number;
  /** Essai sans compte : la scène va dans IndexedDB, jamais au serveur. */
  essai?: boolean;
}) {
  const [etat, setEtat] = useState<EtatSauvegarde>('enregistre');
  const [message, setMessage] = useState<string | null>(null);
  const revision = useRef(e.revisionInitiale);
  const enregistree = useRef<Scene>(e.scene);
  const enCours = useRef(false);
  const derniere = useRef(e.scene);
  useEffect(() => {
    derniere.current = e.scene;
  }, [e.scene]);

  const envoyer = useCallback(
    async (nomVersion?: string) => {
      const scene = derniere.current;
      if (enCours.current || (scene === enregistree.current && !nomVersion)) return;
      if (e.essai) {
        enregistree.current = scene;
        await ecrireBrouillon(CLE_ESSAI, { scene, revision: 0, le: Date.now() });
        setEtat('local');
        return;
      }
      enCours.current = true;
      setEtat('enregistrement');
      const r = await enregistrerPlan(e.espace, {
        planId: e.planId,
        versionAttendue: revision.current,
        scene,
        ...(nomVersion ? { nomVersion } : {}),
      });
      enCours.current = false;
      if (r.ok) {
        revision.current = r.data.versionCourante;
        enregistree.current = scene;
        void effacerBrouillon(e.planId);
        setMessage(null);
        // Modifié pendant l'envoi : un nouvel enregistrement suivra.
        setEtat(derniere.current === scene ? 'enregistre' : 'modifie');
        return;
      }
      setMessage(r.message);
      if (r.code === 'CONFLIT') setEtat('conflit');
      else if (r.code === 'INDISPONIBLE') {
        setEtat('hors_ligne');
        void ecrireBrouillon(e.planId, { scene, revision: revision.current, le: Date.now() });
      } else setEtat('erreur');
    },
    [e.espace, e.planId, e.essai],
  );

  useEffect(() => {
    if (e.scene === enregistree.current || etat === 'conflit') return;
    setEtat((x) => (x === 'enregistrement' ? x : 'modifie'));
    const t = setTimeout(() => void envoyer(), DELAI);
    return () => clearTimeout(t);
  }, [e.scene, envoyer, etat]);

  // Retour du réseau : nouvel essai.
  useEffect(() => {
    const reessayer = () => void envoyer();
    window.addEventListener('online', reessayer);
    return () => window.removeEventListener('online', reessayer);
  }, [envoyer]);

  /** Après un conflit : repartir de la version du serveur, ou garder la mienne par-dessus. */
  const resoudre = useCallback(
    (serveur: { scene: Scene; versionCourante: number }, garderLaMienne: boolean) => {
      revision.current = serveur.versionCourante;
      // Version du serveur = référence ; « garder la mienne » la remplace au prochain envoi.
      enregistree.current = serveur.scene;
      setEtat(garderLaMienne ? 'modifie' : 'enregistre');
      setMessage(null);
    },
    [],
  );

  return { etat, message, enregistrerMaintenant: envoyer, resoudre, revision };
}
