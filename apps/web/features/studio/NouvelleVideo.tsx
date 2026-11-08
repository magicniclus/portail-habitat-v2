'use client';

import { FORMAT_DEFAUT, FORMATS_STUDIO, NOMS_FORMATS, type FormatStudio } from '@ph/core/studio';
import { Banner, Button, Checkbox, Feuille, Field, Input, Select, Textarea } from '@ph/ui';
import { PlusIcon } from '@phosphor-icons/react';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useState, useTransition, type ReactNode } from 'react';
import { creerMontageLibre, creerProjet } from './actions';

function Choix(p: { titre: string; texte: string; children: ReactNode }) {
  return (
    <section className="grid gap-3 rounded-card border border-trait p-4">
      <div>
        <h3 className="m-0 text-base">{p.titre}</h3>
        <p className="m-0 text-sm text-neutre-700">{p.texte}</p>
      </div>
      {p.children}
    </section>
  );
}

/**
 * « + Nouvelle vidéo » : trois façons de commencer, dans une fenêtre (format et caméra en
 * commun). Claude cherche une idée, ou part de la vôtre ; ou vous montez vous-même.
 */
export function NouvelleVideo() {
  const router = useRouter();
  const [format, setFormat] = useState<FormatStudio>(FORMAT_DEFAUT);
  const [camera, setCamera] = useState(false);
  const [idee, setIdee] = useState('');
  const [titre, setTitre] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();
  const lancer = (
    f: () => Promise<{ ok: true; data: string } | { ok: false; message: string }>,
    vers: (id: string) => string,
  ) =>
    demarrer(async () => {
      setErreur(null);
      const r = await f();
      if (!r.ok) setErreur(r.message);
      else router.push(vers(r.data) as Route);
    });
  return (
    <Feuille
      titre="Nouvelle vidéo"
      className="sm:w-[min(640px,calc(100vw-32px))]"
      declencheur={
        <Button variant="secondaire">
          <PlusIcon size={18} aria-hidden="true" />
          Nouvelle vidéo
        </Button>
      }
    >
      <div className="grid gap-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[220px] flex-1">
            <Field label="Format">
              <Select value={format} onChange={(e) => setFormat(e.target.value as FormatStudio)}>
                {NOMS_FORMATS.map((f) => (
                  <option key={f} value={f}>
                    {FORMATS_STUDIO[f].libelle}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Checkbox checked={camera} onChange={(e) => setCamera(e.target.checked)}>
            Je peux apparaître à l’image
          </Checkbox>
        </div>
        <Choix
          titre="Trouver une idée avec Claude"
          texte="Claude regarde les vidéos courtes qui marchent en ce moment et propose trois vidéos, avec l’accroche et le script."
        >
          <div>
            <Button
              disabled={enCours}
              onClick={() =>
                lancer(
                  () => creerProjet({ format, camera }),
                  (id) => `/admin/studio/${id}/idees?analyse=1`,
                )
              }
            >
              ✦ Trouver les meilleures vidéos à faire
            </Button>
          </div>
        </Choix>
        <Choix
          titre="Partir de mon idée"
          texte="Claude écrit les propositions à partir de votre idée."
        >
          <Field label="Votre idée, en quelques mots">
            <Textarea
              value={idee}
              rows={2}
              onChange={(e) => setIdee(e.target.value)}
              placeholder="Ex. montrer qu’un artisan reçoit des demandes sans payer de commission"
            />
          </Field>
          <div>
            <Button
              variant="secondaire"
              disabled={enCours || idee.trim().length < 3}
              onClick={() =>
                lancer(
                  () => creerProjet({ format, camera, theme: idee.trim() }),
                  (id) => `/admin/studio/${id}/idees?analyse=1`,
                )
              }
            >
              Partir de mon idée
            </Button>
          </div>
        </Choix>
        <Choix
          titre="Monter moi-même"
          texte="Le Studio s’ouvre vide : importez vos vidéos, sons et images."
        >
          <Field label="Titre du montage">
            <Input value={titre} maxLength={100} onChange={(e) => setTitre(e.target.value)} />
          </Field>
          <div>
            <Button
              variant="secondaire"
              disabled={enCours || !titre.trim()}
              onClick={() =>
                lancer(
                  () => creerMontageLibre({ titre: titre.trim(), format }),
                  (id) => `/admin/studio/${id}/montage`,
                )
              }
            >
              Ouvrir le Studio
            </Button>
          </div>
        </Choix>
        {erreur ? <Banner tone="danger">{erreur}</Banner> : null}
      </div>
    </Feuille>
  );
}
