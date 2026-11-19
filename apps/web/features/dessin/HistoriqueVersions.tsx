'use client';

import type { Scene } from '@ph/core/dessin';
import { formatDate } from '@ph/core/format';
import { Banner, Button, Input, Modal } from '@ph/ui';
import { useEffect, useState } from 'react';
import {
  lirePlan,
  lireVersion,
  listerVersions,
  restaurerVersion,
  type EspaceDessin,
  type VersionListe,
} from './api';
import { Visionneuse } from './Visionneuse';

const TYPES: Record<VersionListe['type'], string> = {
  auto: 'Automatique',
  manuelle: 'Enregistrée',
  restauration: 'Restauration',
};

/**
 * Historique des versions (DES-40) : nommer la version courante, voir une version (aperçu en
 * lecture seule), la restaurer. Restaurer crée une nouvelle version : rien n'est écrasé.
 */
export function HistoriqueVersions({
  ouvert,
  fermer,
  espace,
  planId,
  revision,
  nommer,
  restauree,
}: {
  ouvert: boolean;
  fermer: () => void;
  espace: EspaceDessin;
  planId: string;
  /** Révision du plan connue de l'éditeur (restauration sans conflit). */
  revision: () => number;
  nommer: (nom: string) => Promise<void>;
  restauree: (plan: { scene: Scene; versionCourante: number }) => void;
}) {
  const [versions, setVersions] = useState<VersionListe[] | null>(null);
  const [nom, setNom] = useState('');
  const [apercu, setApercu] = useState<{ numero: number; scene: Scene } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [revisionListe, setRevisionListe] = useState(0);
  useEffect(() => {
    if (!ouvert) return;
    let actif = true;
    void listerVersions(espace, planId).then((r) => {
      if (!actif) return;
      if (r.ok) setVersions(r.data);
      else setMessage(r.message);
    });
    return () => {
      actif = false;
    };
  }, [ouvert, espace, planId, revisionListe]);

  const voir = async (numero: number) => {
    const r = await lireVersion(espace, planId, numero);
    if (r.ok) setApercu({ numero, scene: r.data.scene });
    else setMessage(r.message);
  };
  const restaurer = async (numero: number) => {
    const r = await restaurerVersion(espace, planId, numero, revision());
    if (!r.ok) return setMessage(r.message);
    const plan = await lirePlan(espace, planId);
    if (!plan.ok) return setMessage(plan.message);
    restauree(plan.data);
    setApercu(null);
    fermer();
  };

  if (apercu)
    return (
      <div className="fixed inset-0 z-50 bg-blanc" data-testid="apercu-version">
        <Visionneuse
          titre={`Version ${apercu.numero}`}
          scene={apercu.scene}
          actions={
            <>
              <Button taille="sm" onClick={() => void restaurer(apercu.numero)}>
                Restaurer cette version
              </Button>
              <Button taille="sm" variant="secondaire" onClick={() => setApercu(null)}>
                Fermer l’aperçu
              </Button>
            </>
          }
        />
      </div>
    );
  return (
    <Modal
      open={ouvert}
      onOpenChange={(o) => (o ? undefined : fermer())}
      titre="Historique des versions"
    >
      <form
        className="grid gap-2"
        onSubmit={(ev) => {
          ev.preventDefault();
          if (!nom.trim()) return;
          void nommer(nom.trim()).then(() => {
            setNom('');
            setRevisionListe((v) => v + 1);
          });
        }}
      >
        <label className="grid gap-1 text-[13px] font-semibold">
          Nommer la version actuelle
          <Input
            value={nom}
            maxLength={80}
            onChange={(ev) => setNom(ev.target.value)}
            placeholder="Avant la cuisine"
          />
        </label>
        <Button type="submit" variant="secondaire" disabled={!nom.trim()}>
          Enregistrer cette version
        </Button>
      </form>
      {message ? <Banner tone="attention">{message}</Banner> : null}
      {versions === null ? (
        <p className="m-0 text-sm text-neutre-800">Chargement…</p>
      ) : versions.length === 0 ? (
        <p className="m-0 text-sm text-neutre-800">
          Pas encore de version : une version est gardée toutes les 10 minutes d’édition, ou quand
          vous en nommez une.
        </p>
      ) : (
        <ul
          className="m-0 grid max-h-[50dvh] list-none gap-1 overflow-y-auto p-0"
          aria-label="Versions"
        >
          {versions.map((v) => (
            <li
              key={v.numero}
              className="flex flex-wrap items-center gap-2 border-t border-trait py-2 text-sm"
            >
              <span className="min-w-0 flex-1">
                <strong>{v.nom ?? TYPES[v.type]}</strong>
                <br />
                <span className="text-neutre-800">
                  {formatDate(new Date(v.creeLe), 'dateHeure')}
                </span>
              </span>
              <Button taille="sm" variant="secondaire" onClick={() => void voir(v.numero)}>
                Aperçu
              </Button>
              <Button taille="sm" variant="secondaire" onClick={() => void restaurer(v.numero)}>
                Restaurer
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
