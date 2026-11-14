'use client';

import { DEBITS_PRISE, PRISE_MAX_MS } from '@ph/core/studio';
import { useCallback, useEffect, useRef, useState } from 'react';

const nomErreur = (e: unknown) => (e instanceof DOMException ? e.name : '');

/** Ce qui empêche d'ouvrir la caméra, dit simplement, avec la solution. */
function messageCamera(nom: string): string {
  if (nom === 'NotAllowedError' || nom === 'SecurityError')
    return 'Accès à la caméra refusé : cliquez sur le cadenas à gauche de l’adresse › Caméra › Autoriser, puis rechargez la page.';
  if (nom === 'NotReadableError' || nom === 'AbortError')
    return 'Caméra déjà utilisée par une autre application (Teams, Zoom, Appareil photo, un autre onglet…) : fermez-la, puis choisissez à nouveau la caméra.';
  if (nom === 'NotFoundError' || nom === 'OverconstrainedError')
    return 'Aucune caméra trouvée : branchez-la, ou filmez avec votre téléphone (mode « Je filme avec mon téléphone »).';
  return 'La caméra ne s’ouvre pas : rechargez la page, ou filmez avec votre téléphone (mode « Je filme avec mon téléphone »).';
}

/**
 * Enregistrement du Studio dans le navigateur : écran (partage), voix (micro choisi, intégré ou
 * externe) et caméra (facultative), en trois fichiers démarrés ensemble. Rien ne part avant que
 * l'auteur valide la prise.
 */
export interface Peripheriques {
  micros: MediaDeviceInfo[];
  cameras: MediaDeviceInfo[];
}
export interface Prise {
  voix: Blob;
  ecran?: Blob;
  camera?: Blob;
  dureeMs: number;
}
export type EtatEnregistrement = 'pret' | 'decompte' | 'enregistre' | 'termine';

const type = (candidats: string[]) =>
  candidats.find((t) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) ??
  '';

function enregistreur(
  flux: MediaStream,
  mimeType: string,
  debit: { audio?: number; video?: number },
) {
  const morceaux: Blob[] = [];
  const r = new MediaRecorder(flux, {
    ...(mimeType ? { mimeType } : {}),
    ...(debit.audio ? { audioBitsPerSecond: debit.audio } : {}),
    ...(debit.video ? { videoBitsPerSecond: debit.video } : {}),
  });
  r.ondataavailable = (e) => e.data.size && morceaux.push(e.data);
  const fini = new Promise<Blob>((ok) => {
    r.onstop = () => ok(new Blob(morceaux, { type: mimeType || r.mimeType }));
  });
  return { r, fini };
}

export function useEnregistrement(o: {
  micro: string;
  camera: string | null;
  reductionBruit: boolean;
}) {
  const [peripheriques, setPeripheriques] = useState<Peripheriques>({ micros: [], cameras: [] });
  const [fluxMicro, setFluxMicro] = useState<MediaStream | null>(null);
  const [fluxCamera, setFluxCamera] = useState<MediaStream | null>(null);
  const [etat, setEtat] = useState<EtatEnregistrement>('pret');
  const [decompte, setDecompte] = useState(0);
  const [ecoule, setEcoule] = useState(0);
  const [prise, setPrise] = useState<Prise | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const encours = useRef<{ arreter: () => void } | null>(null);

  const lister = useCallback(async () => {
    const tous = await navigator.mediaDevices.enumerateDevices();
    setPeripheriques({
      micros: tous.filter((d) => d.kind === 'audioinput'),
      cameras: tous.filter((d) => d.kind === 'videoinput'),
    });
  }, []);

  // Micro choisi (autorisation demandée une fois, puis les noms des appareils sont lisibles).
  useEffect(() => {
    let flux: MediaStream | null = null;
    let actif = true;
    void navigator.mediaDevices
      .getUserMedia({
        audio: {
          ...(o.micro ? { deviceId: { exact: o.micro } } : {}),
          echoCancellation: o.reductionBruit,
          noiseSuppression: o.reductionBruit,
          autoGainControl: o.reductionBruit,
          channelCount: 1,
        },
      })
      .then(async (f) => {
        if (!actif) return f.getTracks().forEach((t) => t.stop());
        flux = f;
        setFluxMicro(f);
        await lister();
      })
      .catch((e: unknown) =>
        setErreur(
          nomErreur(e) === 'NotReadableError'
            ? 'Micro déjà utilisé par une autre application (Teams, Zoom, un autre onglet…) : fermez-la puis rechargez la page.'
            : 'Micro inaccessible : cliquez sur le cadenas à gauche de l’adresse › Micro › Autoriser, puis rechargez la page.',
        ),
      );
    return () => {
      actif = false;
      flux?.getTracks().forEach((t) => t.stop());
    };
  }, [o.micro, o.reductionBruit, lister]);

  useEffect(() => {
    if (o.camera === null) return;
    let flux: MediaStream | null = null;
    let actif = true;
    const md = navigator.mediaDevices;
    // Réglages souhaités d'abord ; si la caméra les refuse, on la prend telle qu'elle est.
    void md
      .getUserMedia({
        video: {
          ...(o.camera ? { deviceId: { exact: o.camera } } : { facingMode: 'user' }),
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
      })
      .catch((e: unknown) =>
        nomErreur(e) === 'NotAllowedError' || nomErreur(e) === 'SecurityError'
          ? Promise.reject(e)
          : md.getUserMedia({ video: o.camera ? { deviceId: o.camera } : true }),
      )
      .then(async (f) => {
        setErreur(null);
        if (!actif) return f.getTracks().forEach((t) => t.stop());
        flux = f;
        setFluxCamera(f);
        await lister();
      })
      .catch((e: unknown) => setErreur(messageCamera(nomErreur(e))));
    return () => {
      actif = false;
      flux?.getTracks().forEach((t) => t.stop());
      setFluxCamera(null);
    };
  }, [o.camera, lister]);

  const demarrer = useCallback(
    async (avecEcran: boolean) => {
      if (!fluxMicro) return;
      setErreur(null);
      let ecran: MediaStream | null = null;
      if (avecEcran) {
        try {
          ecran = await navigator.mediaDevices.getDisplayMedia({
            video: { frameRate: 30, width: { ideal: 1920 }, height: { ideal: 1080 } },
            audio: false,
          });
        } catch {
          return setErreur('Partage d’écran annulé.');
        }
      }
      setEtat('decompte');
      for (const n of [3, 2, 1]) {
        setDecompte(n);
        await new Promise((ok) => setTimeout(ok, 1000));
      }
      const video = type(['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']);
      const voix = enregistreur(fluxMicro, type(['audio/webm;codecs=opus', 'audio/webm']), {
        audio: DEBITS_PRISE.voix,
      });
      const e = ecran ? enregistreur(ecran, video, { video: DEBITS_PRISE.ecran }) : null;
      const c = fluxCamera
        ? enregistreur(new MediaStream(fluxCamera.getVideoTracks()), video, {
            video: DEBITS_PRISE.camera,
          })
        : null;
      const t0 = performance.now();
      [voix, e, c].forEach((x) => x?.r.start(1000));
      setEtat('enregistre');
      const horloge = setInterval(() => setEcoule(performance.now() - t0), 250);
      const limite = setTimeout(() => arreter(), PRISE_MAX_MS);
      let arrete = false;
      const arreter = () => {
        if (arrete) return;
        arrete = true;
        clearInterval(horloge);
        clearTimeout(limite);
        const dureeMs = Math.round(performance.now() - t0);
        [voix, e, c].forEach((x) => x?.r.state !== 'inactive' && x?.r.stop());
        ecran?.getTracks().forEach((t) => t.stop());
        void Promise.all([voix.fini, e?.fini, c?.fini]).then(([v, ec, ca]) => {
          setPrise({
            voix: v,
            ...(ec ? { ecran: ec } : {}),
            ...(ca ? { camera: ca } : {}),
            dureeMs,
          });
          setEtat('termine');
        });
      };
      // Partage arrêté depuis le navigateur : la prise s'arrête aussi.
      ecran?.getVideoTracks()[0]?.addEventListener('ended', arreter);
      encours.current = { arreter };
    },
    [fluxMicro, fluxCamera],
  );

  const arreter = useCallback(() => encours.current?.arreter(), []);
  const recommencer = useCallback(() => {
    setPrise(null);
    setEcoule(0);
    setEtat('pret');
  }, []);

  return {
    peripheriques,
    fluxMicro,
    fluxCamera,
    etat,
    decompte,
    ecoule,
    prise,
    erreur,
    demarrer,
    arreter,
    recommencer,
  };
}
