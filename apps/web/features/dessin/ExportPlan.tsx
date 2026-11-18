'use client';

import {
  cadreImpression,
  echelleConseillee,
  type Echelle,
  type FormatPapier,
} from '@ph/core/dessin';
import { Banner, Button, Select } from '@ph/ui';
import { FilePdfIcon, ImageIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { exporterPdf, type EspaceDessin } from './api';
import { niveauDe, sceneDe, type EtatEditeur } from './etat';
import { horodatage, svgEnPng, telechargerFichier } from './telecharger';

/** Exporter (DES-41) : PDF à l'échelle du niveau courant (fait par le serveur), PNG du plan. */
export function ExportPlan({
  etat,
  espace,
  planId,
}: {
  etat: EtatEditeur;
  espace: EspaceDessin;
  planId: string;
}) {
  const n = niveauDe(etat);
  const cadre = cadreImpression(n);
  const conseil = (cadre && echelleConseillee(cadre)) ?? { echelle: 100, format: 'A3' };
  const [echelle, setEchelle] = useState<Echelle>(conseil.echelle);
  const [format, setFormat] = useState<FormatPapier>(conseil.format);
  const [attente, setAttente] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  if (!cadre) return null;

  const pdf = async () => {
    setErreur(null);
    setAttente(true);
    const r = await exporterPdf(espace, {
      planId,
      niveauId: n.id,
      echelle,
      format,
      exclus: etat.metreExclus,
      scene: sceneDe(etat),
    });
    setAttente(false);
    if (!r.ok) return setErreur(r.message);
    const octets = Uint8Array.from(atob(r.data.base64), (c) => c.charCodeAt(0));
    telechargerFichier(`plan-${horodatage()}.pdf`, new Blob([octets], { type: 'application/pdf' }));
  };
  const png = async () => {
    const svg = document.querySelector<SVGSVGElement>('[data-testid="plan-2d"] svg');
    if (!svg) return setErreur('Passez en vue Plan pour exporter l’image.');
    setErreur(null);
    telechargerFichier(`plan-${horodatage()}.png`, await svgEnPng(svg));
  };
  return (
    <section className="grid gap-2.5 border-t border-trait pt-3.5" aria-labelledby="exporter">
      <h3 id="exporter" className="m-0 text-xs font-bold tracking-wide text-neutre-700 uppercase">
        Exporter le niveau « {n.nom} »
      </h3>
      <div className="grid grid-cols-2 gap-2.5">
        <label className="grid gap-1 text-[13px] font-semibold">
          Échelle
          <Select value={echelle} onChange={(ev) => setEchelle(Number(ev.target.value) as Echelle)}>
            <option value={50}>1/50</option>
            <option value={100}>1/100</option>
          </Select>
        </label>
        <label className="grid gap-1 text-[13px] font-semibold">
          Format
          <Select value={format} onChange={(ev) => setFormat(ev.target.value as FormatPapier)}>
            <option value="A4">A4 paysage</option>
            <option value="A3">A3 paysage</option>
          </Select>
        </label>
      </div>
      {erreur ? <Banner tone="attention">{erreur}</Banner> : null}
      <Button onClick={() => void pdf()} disabled={attente}>
        <FilePdfIcon aria-hidden="true" /> {attente ? 'Préparation…' : 'PDF à l’échelle'}
      </Button>
      <Button variant="secondaire" onClick={() => void png()}>
        <ImageIcon aria-hidden="true" /> Image PNG du plan
      </Button>
    </section>
  );
}
