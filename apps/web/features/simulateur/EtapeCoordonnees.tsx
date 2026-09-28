'use client';

import type { DemandeCreee } from '@ph/core/demandes';
import { entreeDemande } from '@ph/core/schemas';
import { Banner, Button, Checkbox, Field, Input, Textarea } from '@ph/ui';
import Link from 'next/link';
import { useRef, useState, type FormEvent } from 'react';
import { routes } from '@/lib/routes';
import { envoyerDemande } from './envoi';
import { Recapitulatif } from './Recapitulatif';
import type { Chantier, PrestationSimulateur, Reponses } from './types';

export interface Contact {
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
}

type Champ = 'prenom' | 'nom' | 'email' | 'telephone' | 'precisions' | 'accepteConfidentialite';

/** « contact.email » (Zod ou serveur) → « email ». */
const cleChamp = (chemin: string) => chemin.replace(/^contact\./, '') as Champ;

/** Étape 5 : coordonnées, puis envoi à `creerDemande` (COMPTES §2). Toujours aucun montant ici. */
export function EtapeCoordonnees({
  prestation: p,
  reponses,
  chantier,
  contexte,
  onEnvoye,
  onLienReprise,
  brouillonId,
  onPrecedent,
  onChanger,
}: {
  prestation: PrestationSimulateur;
  reponses: Reponses;
  chantier: Chantier;
  contexte: {
    source: 'simulateur' | 'hero' | 'fiche_artisan';
    intention?: string;
    delai?: string;
    artisanCibleId?: string;
  };
  onEnvoye: (d: DemandeCreee, contact: Contact, miseEnRelation: boolean) => void;
  /** Lien de reprise par email (consentement explicite) : message d'erreur, ou `null` si envoyé. */
  onLienReprise: (email: string) => Promise<string | null>;
  /** Brouillon serveur créé par le lien de reprise : supprimé avec l'envoi. */
  brouillonId?: string;
  onPrecedent: () => void;
  onChanger: () => void;
}) {
  const [erreurs, setErreurs] = useState<Partial<Record<Champ, string>>>({});
  const [erreurGenerale, setErreurGenerale] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [cle] = useState(() => crypto.randomUUID());
  const [lien, setLien] = useState<{
    etat: 'envoi' | 'envoye' | 'erreur';
    message?: string;
  } | null>(null);

  // Case non cochée par défaut ; cochée : envoi immédiat à l'adresse saisie (REPRISE_PARCOURS §5).
  const demanderLien = async (coche: boolean) => {
    if (!coche) {
      setLien(null);
      return;
    }
    const email = String(new FormData(formulaire.current ?? undefined).get('email') ?? '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setLien({ etat: 'erreur', message: 'Saisissez d’abord votre email ci-dessus.' });
      return;
    }
    setLien({ etat: 'envoi' });
    const erreur = await onLienReprise(email);
    setLien(erreur ? { etat: 'erreur', message: erreur } : { etat: 'envoye', message: email });
  };
  const formulaire = useRef<HTMLFormElement>(null);

  const signaler = (champs: Record<string, string[] | undefined>) => {
    const e: Partial<Record<Champ, string>> = {};
    for (const [k, m] of Object.entries(champs)) if (m?.[0]) e[cleChamp(k)] ??= m[0];
    setErreurs(e);
    // Focus sur le premier champ en erreur (lecteurs d'écran, clavier mobile).
    requestAnimationFrame(() =>
      formulaire.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
    );
  };

  const envoyer = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const texte = (n: string) => String(f.get(n) ?? '').trim();
    const brut = {
      cleIdempotence: cle,
      source: contexte.source,
      prestationId: p.id,
      ...(contexte.intention ? { intention: contexte.intention } : {}),
      ...(contexte.artisanCibleId ? { artisanCibleId: contexte.artisanCibleId } : {}),
      reponses,
      codePostal: chantier.codePostal,
      acces: chantier.acces,
      ...(contexte.delai ? { delaiSouhaite: contexte.delai } : {}),
      contact: {
        prenom: texte('prenom'),
        nom: texte('nom'),
        email: texte('email'),
        telephone: texte('telephone'),
      },
      ...(texte('precisions') ? { precisions: texte('precisions') } : {}),
      miseEnRelation: f.get('miseEnRelation') === 'on',
      ...(brouillonId ? { brouillonId } : {}),
      accepteConfidentialite: f.get('accepteConfidentialite') === 'on',
    };
    const verif = entreeDemande.safeParse(brut);
    if (!verif.success) {
      const champs: Record<string, string[]> = {};
      for (const i of verif.error.issues) (champs[i.path.join('.')] ??= []).push(i.message);
      signaler(champs);
      return;
    }
    setErreurs({});
    setErreurGenerale(null);
    setEnCours(true);
    const r = await envoyerDemande(brut as Parameters<typeof envoyerDemande>[0]);
    setEnCours(false);
    if (r.ok) {
      onEnvoye(r.data, verif.data.contact, verif.data.miseEnRelation);
      return;
    }
    if (r.champs) signaler(r.champs);
    setErreurGenerale(r.message);
  };

  return (
    <div className="grid items-start gap-x-[clamp(22px,3vw,40px)] gap-y-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <div className="rounded-[18px] bg-blanc p-[clamp(20px,3vw,32px)] shadow-md">
        <button
          type="button"
          onClick={onPrecedent}
          className="mb-3.5 inline-flex min-h-11 cursor-pointer items-center border-0 bg-transparent p-0 text-[14.5px] font-semibold text-accent-700"
        >
          ← Modifier mes réponses
        </button>
        <p className="m-0 mb-1.5 text-[13px] tracking-[0.07em] text-accent-700 uppercase">
          Dernière étape · {p.nom}
        </p>
        <h1 className="m-0 mb-2.5 text-[clamp(28px,3.6vw,40px)] leading-[1.08]">
          Votre estimation est prête
        </h1>
        <p className="m-0 mb-5 max-w-[54ch] text-[15.5px] leading-6 text-neutre-800">
          Indiquez où vous l&apos;envoyer : elle s&apos;affiche aussitôt à l&apos;écran et vous la
          recevez par email. Gratuit et sans engagement.
        </p>
        <ul className="m-0 mb-6 grid list-none gap-2.5 p-0 [grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr))]">
          {[
            'Fourchette de prix TTC pour votre projet',
            'Détail poste par poste',
            'Ce qui fait varier le prix chez vous',
            p.id === 'isolation' ? "Aides déduites (MaPrimeRénov', CEE)" : 'Taux de TVA applicable',
          ].map((c) => (
            <li
              key={c}
              className="flex items-start gap-2.5 rounded-[12px] bg-accent-100 px-3.5 py-3 text-[14.5px] leading-[21px]"
            >
              <span aria-hidden="true" className="font-bold text-accent">
                ✓
              </span>
              {c}
            </li>
          ))}
        </ul>

        <form
          ref={formulaire}
          onSubmit={envoyer}
          noValidate
          aria-labelledby="titre-coordonnees"
          className="grid gap-4 border-t border-trait pt-6"
        >
          <div>
            <h2 id="titre-coordonnees" className="m-0 mb-1.5 text-[21px]">
              Où envoyer votre estimation ?
            </h2>
            <p className="m-0 text-[14.5px] leading-[22px] text-neutre-800">
              Vous recevez le détail par email. Les artisans ne voient vos coordonnées que si vous
              validez l&apos;envoi.
            </p>
          </div>
          {erreurGenerale ? <Banner tone="danger">{erreurGenerale}</Banner> : null}
          <div className="grid gap-3.5 sm:grid-cols-2">
            <Field label="Prénom" requis erreur={erreurs.prenom}>
              <Input champ="prenom" name="prenom" placeholder="Camille" enterKeyHint="next" />
            </Field>
            <Field label="Nom" requis erreur={erreurs.nom}>
              <Input champ="nom" name="nom" placeholder="Martin" enterKeyHint="next" />
            </Field>
            <Field label="Email" requis erreur={erreurs.email}>
              <Input
                champ="email"
                name="email"
                placeholder="camille@email.fr"
                enterKeyHint="next"
              />
            </Field>
            <Field label="Téléphone" requis erreur={erreurs.telephone}>
              <Input
                champ="tel"
                name="telephone"
                placeholder="06 12 34 56 78"
                enterKeyHint="next"
              />
            </Field>
          </div>
          <Field label="Précisions pour les artisans (facultatif)" erreur={erreurs.precisions}>
            <Textarea
              name="precisions"
              rows={3}
              maxLength={2000}
              placeholder="Contraintes d'accès, matériaux souhaités, photos disponibles…"
            />
          </Field>
          <Checkbox
            name="miseEnRelation"
            defaultChecked
            className="rounded-[10px] bg-accent-100 px-3.5 text-sm leading-[22px]"
          >
            Je souhaite être mis en relation avec jusqu&apos;à 3 artisans vérifiés de mon secteur.
            Sans cette case, vous recevez uniquement l&apos;estimation par email.
          </Checkbox>
          <div>
            <Checkbox
              name="lienReprise"
              checked={lien !== null && lien.etat !== 'erreur'}
              onChange={(e) => void demanderLien(e.target.checked)}
              aria-describedby={lien ? 'etat-lien-reprise' : undefined}
              className="text-sm leading-[22px]"
            >
              Pas le temps de finir ? M&apos;envoyer un lien pour reprendre plus tard, sur
              n&apos;importe quel appareil (valable 30 jours).
            </Checkbox>
            {lien ? (
              <p
                id="etat-lien-reprise"
                role="status"
                className={`m-0 text-sm ${lien.etat === 'erreur' ? 'font-semibold text-danger' : 'text-neutre-800'}`}
              >
                {lien.etat === 'envoi'
                  ? 'Envoi du lien…'
                  : lien.etat === 'envoye'
                    ? `Lien envoyé à ${lien.message}.`
                    : lien.message}
              </p>
            ) : null}
          </div>
          <div>
            <Checkbox
              name="accepteConfidentialite"
              required
              aria-invalid={erreurs.accepteConfidentialite ? true : undefined}
              aria-describedby={
                erreurs.accepteConfidentialite ? 'erreur-confidentialite' : undefined
              }
              className="text-[13.5px] leading-[21px] text-neutre-800"
            >
              J&apos;accepte que mes données soient utilisées pour traiter ma demande, conformément
              à la{' '}
              <Link href={routes.legal('particuliers', 'confidentialite')}>
                politique de confidentialité
              </Link>
              .
            </Checkbox>
            {erreurs.accepteConfidentialite ? (
              <p id="erreur-confidentialite" className="m-0 text-sm font-semibold text-danger">
                Acceptez la politique de confidentialité pour recevoir votre estimation.
              </p>
            ) : null}
          </div>
          <Button
            type="submit"
            taille="lg"
            pleineLargeur
            disabled={enCours}
            className="min-h-[54px]"
          >
            {enCours ? 'Calcul de votre estimation…' : 'Voir mon estimation'}
          </Button>
        </form>
      </div>
      <aside className="grid gap-3.5 lg:sticky lg:top-24">
        <Recapitulatif
          prestation={p}
          reponses={reponses}
          jusqua={6}
          chantier={chantier}
          onChanger={onChanger}
        />
        <div className="rounded-[16px] bg-accent-900 p-5 text-accent-200">
          <p className="m-0 mb-3.5 text-base font-bold text-blanc">
            Comment l&apos;estimation est calculée
          </p>
          <ul className="m-0 grid list-none gap-2.5 p-0 text-sm leading-[22px]">
            <li>✓ Prix constatés sur des chantiers comparables de votre département.</li>
            <li>✓ Mis à jour chaque mois avec les devis signés sur la plateforme.</li>
            <li>✓ Indicatif : seule la visite de l&apos;artisan fait foi.</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
