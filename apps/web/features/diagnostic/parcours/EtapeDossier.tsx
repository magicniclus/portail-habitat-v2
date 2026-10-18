'use client';

import type { LignePublique } from '@ph/core/diagnostic';
import type { DossierCree } from '@ph/firebase/demandes';
import { entreeDossierDiag } from '@ph/core/schemas';
import { Banner, Button, Checkbox, Field, Input, Select } from '@ph/ui';
import Link from 'next/link';
import { useRef, useState, type FormEvent } from 'react';
import { routes } from '@/lib/routes';
import { envoyerDossier } from './envoi';
import type { Bien } from './types';

export const STATUTS: Record<LignePublique['statut'], { libelle: string; classe: string }> = {
  a_realiser: { libelle: 'À réaliser', classe: 'border-accent-300 bg-accent-100 text-accent-700' },
  a_refaire: {
    libelle: 'À refaire',
    classe: 'border-attention-vif/40 bg-attention-fond text-attention',
  },
  deja_valide: { libelle: 'Déjà valide', classe: 'border-succes/30 bg-succes-fond text-succes' },
  conseille: { libelle: 'Conseillé', classe: 'border-trait bg-neutre-100 text-neutre-800' },
};

const VISITES = [
  ['semaine', 'Cette semaine'],
  ['15jours', 'Sous 15 jours'],
  ['mois', 'Dans le mois'],
  ['renseignement', 'Je me renseigne'],
] as const;

type Champ = 'nom' | 'email' | 'telephone' | 'accepteContact';

/** Étape 3 : liste des diagnostics obligatoires (gratuite, sans prix, DIA-06), puis envoi. */
export function EtapeDossier({
  bien,
  lignes,
  titre,
  resumeBien,
  existants,
  onEnvoye,
  onPrecedent,
}: {
  bien: Bien;
  lignes: LignePublique[];
  titre: string;
  resumeBien: string;
  existants: { diagId: string; annee: number }[];
  onEnvoye: (d: DossierCree, contact: { nom: string; email: string; telephone: string }) => void;
  onPrecedent: () => void;
}) {
  const [erreurs, setErreurs] = useState<Partial<Record<Champ, string>>>({});
  const [erreurGenerale, setErreurGenerale] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [cle] = useState(() => crypto.randomUUID());
  const formulaire = useRef<HTMLFormElement>(null);

  const signaler = (champs: Record<string, string[] | undefined>) => {
    const e: Partial<Record<Champ, string>> = {};
    for (const [k, m] of Object.entries(champs))
      if (m?.[0]) e[k.replace(/^contact\./, '') as Champ] ??= m[0];
    setErreurs(e);
    requestAnimationFrame(() =>
      formulaire.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
    );
  };

  const envoyer = async (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    const f = new FormData(ev.currentTarget);
    const t = (n: string) => String(f.get(n) ?? '').trim();
    const brut = {
      cleIdempotence: cle,
      bien,
      existants,
      contact: { nom: t('nom'), email: t('email'), telephone: t('telephone') },
      visiteSouhaitee: t('visite'),
      accepteContact: f.get('accepteContact') === 'on',
    };
    const v = entreeDossierDiag.safeParse(brut);
    if (!v.success) {
      const champs: Record<string, string[]> = {};
      for (const i of v.error.issues) (champs[i.path.join('.')] ??= []).push(i.message);
      signaler(champs);
      return;
    }
    setErreurs({});
    setErreurGenerale(null);
    setEnCours(true);
    const r = await envoyerDossier(brut);
    setEnCours(false);
    if (r.ok) onEnvoye(r.data, v.data.contact);
    else {
      if (r.champs) signaler(r.champs);
      setErreurGenerale(r.message);
    }
  };

  return (
    <div className="rounded-[18px] bg-blanc p-[clamp(20px,3vw,32px)] shadow-md">
      <button
        type="button"
        onClick={onPrecedent}
        className="mb-3 inline-flex min-h-11 cursor-pointer items-center border-0 bg-transparent p-0 text-[14.5px] font-semibold text-accent-700"
      >
        ← Modifier mes réponses
      </button>
      <p className="m-0 mb-1.5 text-[13px] tracking-[0.07em] text-accent-700 uppercase">
        Votre dossier · {resumeBien}
      </p>
      <h1 className="m-0 mb-2.5 text-[clamp(28px,3.6vw,42px)] leading-[1.08]">{titre}</h1>
      <p className="m-0 mb-6 max-w-[54ch] text-[15.5px] leading-6 text-neutre-800">
        Voici ce que la loi impose pour votre bien. Indiquez où envoyer le dossier : le budget
        détaillé s&apos;affiche aussitôt et vous le recevez par email.
      </p>
      <ul className="m-0 mb-6 grid list-none gap-2.5 p-0" aria-label="Diagnostics de votre bien">
        {lignes.map((l) => (
          <li
            key={l.diagId}
            className={`rounded-[12px] border px-4 py-3.5 ${STATUTS[l.statut].classe}`}
          >
            <span className="flex flex-wrap items-baseline justify-between gap-3">
              <strong className="text-[15.5px] text-texte">{l.nom}</strong>
              <span className="text-[11.5px] font-bold tracking-[0.05em] uppercase">
                {STATUTS[l.statut].libelle}
              </span>
            </span>
            <span className="mt-1 block text-[13.5px] leading-5 text-neutre-800">{l.raison}</span>
          </li>
        ))}
      </ul>
      <form
        ref={formulaire}
        onSubmit={envoyer}
        noValidate
        aria-labelledby="titre-envoi-diag"
        className="grid gap-4 border-t border-trait pt-6"
      >
        <div>
          <h2 id="titre-envoi-diag" className="m-0 mb-1.5 text-xl">
            Où envoyer votre dossier ?
          </h2>
          <p className="m-0 text-[14.5px] leading-[22px] text-neutre-800">
            Vous recevez la liste par email. Vos coordonnées ne partent qu&apos;aux diagnostiqueurs
            certifiés de votre secteur.
          </p>
        </div>
        {erreurGenerale ? <Banner tone="danger">{erreurGenerale}</Banner> : null}
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field label="Nom et prénom" requis erreur={erreurs.nom}>
            <Input
              name="nom"
              autoComplete="name"
              autoCapitalize="words"
              placeholder="Camille Martin"
            />
          </Field>
          <Field label="Email" requis erreur={erreurs.email}>
            <Input champ="email" name="email" placeholder="camille@email.fr" />
          </Field>
          <Field label="Téléphone" requis erreur={erreurs.telephone}>
            <Input champ="tel" name="telephone" placeholder="06 12 34 56 78" />
          </Field>
          <Field label="Visite souhaitée">
            <Select name="visite" defaultValue="semaine">
              {VISITES.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div>
          <Checkbox
            name="accepteContact"
            aria-invalid={erreurs.accepteContact ? true : undefined}
            aria-describedby={erreurs.accepteContact ? 'erreur-contact-diag' : undefined}
            className="text-[13.5px] leading-[21px] text-neutre-800"
          >
            J&apos;accepte d&apos;être contacté par des diagnostiqueurs certifiés et la{' '}
            <Link href={routes.legal('particuliers', 'confidentialite')}>
              politique de confidentialité
            </Link>
            .
          </Checkbox>
          {erreurs.accepteContact ? (
            <p id="erreur-contact-diag" className="m-0 text-sm font-semibold text-danger">
              Cochez cette case pour recevoir votre dossier.
            </p>
          ) : null}
        </div>
        <Button type="submit" taille="lg" pleineLargeur disabled={enCours} className="min-h-[54px]">
          {enCours ? 'Calcul de votre budget…' : 'Voir mon budget'}
        </Button>
      </form>
    </div>
  );
}
