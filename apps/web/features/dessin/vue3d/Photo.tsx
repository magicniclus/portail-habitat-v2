'use client';

import { Banner, Button } from '@ph/ui';
import { CameraIcon } from '@phosphor-icons/react';
import { useCallback, useEffect, useRef, useState, type Dispatch } from 'react';
import { enregistrerPhoto, type EspaceDessin } from '../api';
import type { Action, EtatEditeur, ReglagesRendu } from '../etat';
import { ScenePhoto, type Capturer } from './ScenePhoto';

const RATIOS: Record<ReglagesRendu['cadrage'], number> = {
  paysage: 16 / 9,
  carre: 1,
  portrait: 3 / 4,
};
/** Largeur des photos HD en pixels. */
const LARGEUR: Record<ReglagesRendu['cadrage'], number> = {
  paysage: 2400,
  carre: 2000,
  portrait: 1600,
};
const choix = <T extends string>(valeurs: [T, string][]) => valeurs;
const REGLAGES = {
  cadrage: choix<ReglagesRendu['cadrage']>([
    ['paysage', 'Paysage'],
    ['carre', 'Carré'],
    ['portrait', 'Portrait'],
  ]),
  ambiance: choix<ReglagesRendu['ambiance']>([
    ['jour', 'Jour'],
    ['soiree', 'Soirée'],
  ]),
  format: choix<ReglagesRendu['format']>([
    ['image/jpeg', 'JPEG'],
    ['image/png', 'PNG'],
  ]),
};
const LIBELLES = { cadrage: 'Cadrage', ambiance: 'Ambiance', format: 'Format' } as const;

const enBase64 = (b: Blob) =>
  new Promise<string>((ok, ko) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result).split(',')[1] ?? '');
    r.onerror = () => ko(r.error);
    r.readAsDataURL(b);
  });

function telecharger(b: Blob, type: string) {
  const url = URL.createObjectURL(b);
  const a = document.createElement('a');
  const date = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
  a.href = url;
  a.download = `plan-photo-${date}.${type === 'image/png' ? 'png' : 'jpg'}`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/**
 * Vue photo (DES-37) : cadrage, ambiance, rendu amélioré, export HD téléchargé et ajouté à la
 * galerie « Mes photos » du plan (menu Rendu). Aucun rendu serveur (D85).
 */
export default function Photo(p: {
  etat: EtatEditeur;
  dispatch: Dispatch<Action>;
  espace: EspaceDessin;
  planId: string;
}) {
  const { cadrage, format } = p.etat.rendu;
  const zone = useRef<HTMLDivElement>(null);
  const capturer = useRef<Capturer | null>(null);
  const [taille, setTaille] = useState({ l: 0, h: 0 });
  const [etape, setEtape] = useState<'pret' | 'rendu' | 'fait' | 'erreur'>('pret');
  const [message, setMessage] = useState('');

  // Le cadre garde la proportion choisie et tient dans la zone disponible.
  useEffect(() => {
    const el = zone.current;
    if (!el) return;
    const ajuster = () => {
      const { width, height } = el.getBoundingClientRect();
      const r = RATIOS[cadrage];
      const l = Math.min(width - 24, (height - 96) * r);
      setTaille({ l: Math.max(0, l), h: Math.max(0, l / r) });
    };
    ajuster();
    const obs = new ResizeObserver(ajuster);
    obs.observe(el);
    return () => obs.disconnect();
  }, [cadrage]);

  // Le bandeau de confirmation s'efface seul pour libérer la vue.
  useEffect(() => {
    if (etape !== 'fait') return;
    const t = setTimeout(() => setEtape('pret'), 6_000);
    return () => clearTimeout(t);
  }, [etape]);

  const exposer = useCallback((c: Capturer) => (capturer.current = c), []);
  const prendre = async () => {
    const c = capturer.current;
    if (!c) return;
    setEtape('rendu');
    const image = await c(LARGEUR[cadrage], format);
    const jpeg = format === 'image/jpeg' ? image : await c(LARGEUR[cadrage], 'image/jpeg');
    if (!image || !jpeg) {
      setEtape('erreur');
      setMessage('La photo n’a pas pu être rendue sur cet appareil.');
      return;
    }
    telecharger(image, format);
    const r = await enregistrerPhoto(p.espace, p.planId, await enBase64(jpeg));
    if (r.ok) p.dispatch({ type: 'photoAjoutee' });
    setEtape(r.ok ? 'fait' : 'erreur');
    setMessage(r.ok ? 'Photo téléchargée et ajoutée à « Mes photos » (menu Rendu).' : r.message);
  };

  return (
    <div
      ref={zone}
      className="relative grid h-full w-full place-items-center content-center gap-3 bg-neutre-100 p-3"
      data-testid="photo"
    >
      <div
        className="overflow-hidden rounded-xl shadow-lg ring-1 ring-trait"
        style={{ width: taille.l, height: taille.h }}
      >
        {taille.l > 0 ? <ScenePhoto etat={p.etat} exposer={exposer} /> : null}
      </div>
      <div className="flex max-w-full flex-wrap items-center justify-center gap-2 rounded-xl bg-blanc p-2 shadow-md">
        {(Object.keys(REGLAGES) as (keyof typeof REGLAGES)[]).map((cle) => (
          <label key={cle} className="flex items-center gap-1.5 text-[13px] font-semibold">
            <span className="sr-only sm:not-sr-only">{LIBELLES[cle]}</span>
            <select
              aria-label={LIBELLES[cle]}
              className="min-h-11 rounded-control border border-neutre-300 bg-blanc px-2 text-base"
              value={p.etat.rendu[cle]}
              onChange={(ev) => p.dispatch({ type: 'rendu', reglages: { [cle]: ev.target.value } })}
            >
              {REGLAGES[cle].map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
        ))}
        <Button onClick={() => void prendre()} disabled={etape === 'rendu'}>
          <CameraIcon aria-hidden="true" />{' '}
          {etape === 'rendu' ? 'Rendu en cours…' : 'Prendre la photo'}
        </Button>
      </div>
      {etape === 'fait' || etape === 'erreur' ? (
        <div role="status" className="absolute inset-x-3 top-3">
          <Banner
            tone={etape === 'fait' ? 'succes' : 'danger'}
            titre={etape === 'fait' ? 'Photo prête' : 'Photo non enregistrée'}
          >
            {message}
          </Banner>
        </div>
      ) : null}
    </div>
  );
}
