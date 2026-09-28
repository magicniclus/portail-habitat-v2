'use client';

import { LIBELLES_NOTE, TYPES_TRAVAUX_AVIS } from '@ph/core/avis';
import { entreeAvis } from '@ph/core/schemas';
import { Banner, Button, Checkbox, Field, Input, Select } from '@ph/ui';
import Link from 'next/link';
import { useRef, useState, type FormEvent } from 'react';
import { posterJson } from '@/lib/posterJson';
import { routes } from '@/lib/routes';
import { DetailAvis, type Critere, type Point } from './DetailAvis';
import { NoteEtoiles } from './NoteEtoiles';
import type { ArtisanAvis } from './types';

type Champ = 'texte' | 'nomAffiche' | 'email' | 'typeTravaux' | 'finChantier' | 'certification';

const moisCourant = () => new Date().toISOString().slice(0, 7);

/**
 * Formulaire « Votre avis » : publication impossible sans note ni certification (AVI-01). Le statut
 * (en attente de modération) est décidé par le serveur.
 */
export function FormulaireAvis({
  artisan,
  onRetour,
  onEnvoye,
}: {
  artisan: ArtisanAvis;
  onRetour: () => void;
  onEnvoye: (note: number) => void;
}) {
  const [note, setNote] = useState(0);
  const [criteres, setCriteres] = useState<Partial<Record<Critere, number>>>({});
  const [points, setPoints] = useState<Point[]>([]);
  const [texte, setTexte] = useState('');
  const [certifie, setCertifie] = useState(false);
  const [erreurs, setErreurs] = useState<Partial<Record<Champ, string>>>({});
  const [erreurGenerale, setErreurGenerale] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [cle] = useState(() => crypto.randomUUID());
  const formulaire = useRef<HTMLFormElement>(null);
  const pret = note > 0 && certifie;

  const signaler = (champs: Record<string, string[] | undefined>) => {
    const e: Partial<Record<Champ, string>> = {};
    for (const [k, m] of Object.entries(champs)) if (m?.[0]) e[k as Champ] ??= m[0];
    setErreurs(e);
    requestAnimationFrame(() =>
      formulaire.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
    );
  };

  const publier = async (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    if (!pret) return;
    const f = new FormData(ev.currentTarget);
    const t = (n: string) => String(f.get(n) ?? '').trim();
    const brut = {
      cleIdempotence: cle,
      artisanId: artisan.id,
      note,
      criteres,
      pointsPositifs: points,
      texte,
      nomAffiche: t('nomAffiche'),
      email: t('email'),
      typeTravaux: t('typeTravaux'),
      finChantier: t('finChantier'),
      certification: certifie,
      site: t('site') || undefined,
    };
    const v = entreeAvis.safeParse(brut);
    if (!v.success) {
      const champs: Record<string, string[]> = {};
      for (const i of v.error.issues) (champs[String(i.path[0])] ??= []).push(i.message);
      signaler(champs);
      return;
    }
    setErreurs({});
    setErreurGenerale(null);
    setEnCours(true);
    const r = await posterJson<{ avisId: string }>('/api/avis', brut);
    setEnCours(false);
    if (r.ok) onEnvoye(note);
    else {
      if (r.champs) signaler(r.champs);
      setErreurGenerale(
        r.code === 'CONFLIT'
          ? 'Vous avez déjà laissé un avis sur cet artisan pour ce chantier. Vous pouvez le modifier depuis votre espace.'
          : r.message,
      );
    }
  };

  return (
    <form
      ref={formulaire}
      onSubmit={publier}
      noValidate
      className="grid gap-6.5 rounded-[18px] bg-blanc p-[clamp(20px,3vw,32px)] shadow-md"
    >
      <div>
        <button
          type="button"
          onClick={onRetour}
          className="mb-2 inline-flex min-h-11 cursor-pointer items-center border-0 bg-transparent p-0 text-[14.5px] font-semibold text-accent-700"
        >
          ← Changer d&apos;artisan
        </button>
        <h1 className="m-0 mb-2 text-[clamp(24px,2.8vw,32px)] leading-[1.14]">
          Votre avis sur {artisan.nom}
        </h1>
        <p className="m-0 text-[15.5px] leading-6 text-neutre-800">
          {artisan.metier} · {artisan.ville}
        </p>
      </div>

      <div>
        <p className="m-0 mb-1 text-[17px] font-bold">Quelle note donneriez-vous ?</p>
        <p className="m-0 mb-3.5 text-sm text-neutre-800">
          Votre impression générale sur le chantier.
        </p>
        <NoteEtoiles
          legende="Note globale"
          valeur={note}
          onChange={setNote}
          libelles={LIBELLES_NOTE}
        />
      </div>

      <DetailAvis
        criteres={criteres}
        onCriteres={setCriteres}
        points={points}
        onPoints={setPoints}
        texte={texte}
        onTexte={setTexte}
        erreurTexte={erreurs.texte}
      />

      <div className="grid gap-3.5">
        <p className="m-0 text-[17px] font-bold">Vous et votre chantier</p>
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field label="Nom affiché" requis erreur={erreurs.nomAffiche}>
            <Input name="nomAffiche" autoComplete="given-name" placeholder="Camille M." />
          </Field>
          <Field label="Email (non publié)" requis erreur={erreurs.email}>
            <Input champ="email" name="email" placeholder="camille@email.fr" />
          </Field>
          <Field label="Type de travaux" requis erreur={erreurs.typeTravaux}>
            <Select name="typeTravaux" defaultValue="">
              <option value="">Sélectionner…</option>
              {TYPES_TRAVAUX_AVIS.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </Field>
          <Field label="Fin du chantier" requis erreur={erreurs.finChantier}>
            <Input name="finChantier" type="month" max={moisCourant()} placeholder="AAAA-MM" />
          </Field>
        </div>
        <input type="text" name="site" tabIndex={-1} autoComplete="off" hidden />
        <div className="rounded-[10px] bg-accent-100 p-3.5">
          <Checkbox
            checked={certifie}
            onChange={(e) => setCertifie(e.currentTarget.checked)}
            className="text-sm leading-[22px]"
          >
            Je certifie avoir fait réaliser ces travaux par cet artisan, n&apos;avoir aucun lien
            personnel ou concurrentiel avec lui, et respecter la{' '}
            <Link href={routes.legal('particuliers', 'avis')}>
              politique d&apos;avis de Portail Habitat
            </Link>
            .
          </Checkbox>
        </div>
      </div>

      <div>
        {erreurGenerale ? (
          <Banner tone="danger" className="mb-3.5">
            {erreurGenerale}
          </Banner>
        ) : null}
        <Button
          type="submit"
          taille="lg"
          pleineLargeur
          disabled={!pret || enCours}
          className="min-h-[54px]"
        >
          {enCours ? 'Envoi…' : 'Publier mon avis'}
        </Button>
        <p className="m-0 mt-2.5 text-center text-[13.5px] leading-[21px] text-neutre-800">
          {pret
            ? 'Publication sous 48 h après vérification. Modifiable depuis votre espace.'
            : note > 0
              ? 'Cochez la certification pour publier votre avis.'
              : 'Attribuez d’abord une note globale pour publier votre avis.'}
        </p>
      </div>
    </form>
  );
}
