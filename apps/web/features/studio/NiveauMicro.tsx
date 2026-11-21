'use client';

import { useEffect, useRef } from 'react';

/** Niveau du micro en direct : vérifier que la voix passe avant d'enregistrer. */
export function NiveauMicro({ flux }: { flux: MediaStream | null }) {
  const barre = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!flux) return;
    const ctx = new AudioContext();
    const analyse = ctx.createAnalyser();
    analyse.fftSize = 512;
    ctx.createMediaStreamSource(flux).connect(analyse);
    const donnees = new Uint8Array(analyse.fftSize);
    let raf = requestAnimationFrame(function pas() {
      analyse.getByteTimeDomainData(donnees);
      let crete = 0;
      for (const v of donnees) crete = Math.max(crete, Math.abs(v - 128) / 128);
      if (barre.current) barre.current.style.width = `${Math.min(100, crete * 140)}%`;
      raf = requestAnimationFrame(pas);
    });
    return () => {
      cancelAnimationFrame(raf);
      void ctx.close();
    };
  }, [flux]);
  return (
    <span
      className="block h-3 w-full overflow-hidden rounded-full bg-neutre-200"
      role="img"
      aria-label="Niveau du micro"
    >
      <span
        ref={barre}
        className="block h-full w-0 rounded-full bg-succes transition-[width] duration-75"
      />
    </span>
  );
}
