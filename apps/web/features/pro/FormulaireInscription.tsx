'use client';

import { evenementLanding, type OutilLanding } from '@ph/core/landings';
import { entreeInscriptionEtape1, type SourceAcquisition } from '@ph/core/schemas';
import { Banner, Button, Checkbox, Field, Input } from '@ph/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState, type FormEvent } from 'react';
import { signalerConversion } from '@ph/tracker';
import { pousserEvenement } from '@/lib/dataLayer';
import { posterJson } from '@/lib/posterJson';
import { routes } from '@/lib/routes';
import { ChoixMetiers } from './ChoixMetiers';
import type { ChantierMetier, GroupeMetiers } from './metiers';
import { GarantiesInscription } from './GarantiesInscription';
import { RecevoirEstimation } from './RecevoirEstimation';
import { libelleSource, useDemandesEstimees } from './useDemandesEstimees';
import { useMetierCible } from './useMetierCible';

type Champ = 'nom' | 'telephone' | 'email' | 'codePostal' | 'metierPrincipal' | 'cgv';

const UTM = ['utm_source', 'utm_medium', 'utm_campaign'] as const;

/** Source de la landing et paramètres de campagne de l'URL (LANDINGS §1), sans donnée personnelle. */
function acquisitionDe(source: SourceAcquisition) {
  const p = new URLSearchParams(window.location.search);
  const utm = Object.fromEntries(
    UTM.map((k) => [k, (p.get(k) ?? '').replace(/[^\w.\-+ ]/gu, '').slice(0, 100)]).filter(
      ([, v]) => v,
    ),
  );
  return { source, ...utm };
}

/**
 * Carte « Créer mon compte gratuit » (maquettes Acquisition Artisans v2 et Formulaire Espace), étape 1
 * de l'inscription : identité, métiers et chantiers ; brouillon enregistré et lien de reprise envoyé
 * par email (ONB-04). Sur une landing par outil, la source part avec le formulaire (LAND-01).
 */
export function FormulaireInscription({
  groupes,
  chantiers,
  demandesMois,
  titre = 'Créer mon compte gratuit',
  cta = 'Voir les demandes de ma zone',
  source = 'pro',
  landing,
}: {
  groupes: GroupeMetiers[];
  chantiers: ChantierMetier[];
  /** Demandes déposées ce mois-ci (stats/public), déjà formaté ; masqué sans donnée. */
  demandesMois: string | null;
  titre?: string;
  cta?: string;
  source?: SourceAcquisition;
  /** Landing par outil : événements `hero_form_*` (LANDINGS §5). */
  landing?: OutilLanding;
}) {
  const router = useRouter();
  const cible = useMetierCible(groupes);
  const [erreurs, setErreurs] = useState<Partial<Record<Champ, string>>>({});
  const [erreurGenerale, setErreurGenerale] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [codePostal, setCodePostal] = useState('');
  const [principal, setPrincipal] = useState<string>('');
  const formulaire = useRef<HTMLFormElement>(null);
  const commence = useRef(false);
  const commencer = () => {
    if (commence.current || !landing) return;
    commence.current = true;
    pousserEvenement(evenementLanding('hero_form_started', landing));
  };
  const metierActif = principal || cible?.id || '';
  const estimation = useDemandesEstimees(codePostal, metierActif ? [metierActif] : [], 30);
  const nomActif = groupes.flatMap((g) => g.metiers).find((m) => m.id === metierActif)?.nom;

  const envoyer = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const t = (n: string) => String(f.get(n) ?? '').trim();
    const brut = {
      nom: t('nom'),
      telephone: t('telephone'),
      email: t('email'),
      codePostal: t('codePostal'),
      metierPrincipal: t('metierPrincipal'),
      metiers: f.getAll('metiers').map(String),
      intentions: f.getAll('intentions').map(String),
      cgv: f.get('cgv') === 'on',
      site: t('site') || undefined,
      acquisition: acquisitionDe(source),
    };
    const v = entreeInscriptionEtape1.safeParse(brut);
    if (!v.success) {
      const r: Partial<Record<Champ, string>> = {};
      for (const i of v.error.issues) {
        const cle = (i.path[0] === 'metiers' ? 'metierPrincipal' : i.path[0]) as Champ;
        r[cle] ??= cle === 'metierPrincipal' ? 'Choisissez votre métier dans la liste.' : i.message;
      }
      setErreurs(r);
      requestAnimationFrame(() =>
        formulaire.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
      );
      return;
    }
    setErreurs({});
    setEnCours(true);
    const r = await posterJson<null>('/api/pro/inscription', brut);
    setEnCours(false);
    if (!r.ok) return setErreurGenerale(r.message);
    signalerConversion('inscription');
    if (landing) pousserEvenement(evenementLanding('hero_form_submitted', landing, { source }));
    router.push(`/pro/inscription/zone?source=${source}` as Parameters<typeof router.push>[0]);
  };

  return (
    <div
      id="inscription"
      className="scroll-mt-[70px] rounded-[16px] border border-trait bg-blanc p-[clamp(20px,2.4vw,28px)] shadow-lg"
    >
      <form
        ref={formulaire}
        onSubmit={envoyer}
        onFocus={commencer}
        noValidate
        className="grid gap-3.5"
      >
        <div>
          <h2 className="m-0 mb-1.5 text-[23px]">{titre}</h2>
          {demandesMois ? (
            <p className="m-0 mt-3 flex items-center gap-2 rounded-control bg-accent-100 px-3 py-2 text-sm text-accent-800">
              <span aria-hidden="true" className="size-2 flex-none rounded-full bg-accent" />
              <span>
                <strong>{demandesMois} demandes</strong> déposées en France ce mois-ci
              </span>
            </p>
          ) : null}
        </div>
        {erreurGenerale ? <Banner tone="danger">{erreurGenerale}</Banner> : null}
        <Field label="Nom et prénom" requis erreur={erreurs.nom}>
          <Input
            name="nom"
            autoComplete="name"
            autoCapitalize="words"
            placeholder="Julien Bertrand"
            enterKeyHint="next"
          />
        </Field>
        <Field label="Email" requis erreur={erreurs.email}>
          <Input
            champ="email"
            name="email"
            placeholder="contact@entreprise.fr"
            enterKeyHint="next"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3.5">
          <Field label="Téléphone" requis erreur={erreurs.telephone}>
            <Input champ="tel" name="telephone" placeholder="06 12 34 56 78" enterKeyHint="next" />
          </Field>
          <Field label="Code postal" requis erreur={erreurs.codePostal}>
            <Input
              champ="codePostal"
              name="codePostal"
              placeholder="33000"
              enterKeyHint="next"
              onChange={(e) => setCodePostal(e.target.value.replace(/\D/g, '').slice(0, 5))}
            />
          </Field>
        </div>
        <ChoixMetiers
          key={cible?.id ?? 'aucun'}
          groupes={groupes}
          chantiers={chantiers}
          principalInitial={cible?.id}
          erreurPrincipal={erreurs.metierPrincipal}
          onPrincipal={setPrincipal}
        />
        {estimation?.total && nomActif ? (
          <p
            className="m-0 rounded-control bg-accent-100 px-3 py-2 text-sm text-accent-800"
            aria-live="polite"
          >
            <strong>
              ≈ {estimation.total} demandes {libelleSource(estimation)}
            </strong>{' '}
            ce mois-ci pour un {nomActif.toLowerCase()} dans un rayon de 30 km.
          </p>
        ) : null}
        <input type="text" name="site" tabIndex={-1} autoComplete="off" hidden />
        <Checkbox name="cgv" aria-invalid={erreurs.cgv ? true : undefined}>
          J&apos;accepte les{' '}
          <Link href={routes.legal('pro', 'cgv')}>conditions générales de vente</Link>, la{' '}
          <Link href={routes.legal('pro', 'charte')}>charte de bonne conduite</Link> et la{' '}
          <Link href={routes.legal('pro', 'confidentialite')}>politique de confidentialité</Link>.
        </Checkbox>
        {erreurs.cgv ? (
          <p className="m-0 text-sm font-semibold text-danger">{erreurs.cgv}</p>
        ) : null}
        <Button
          type="submit"
          pleineLargeur
          className="min-h-12"
          disabled={enCours}
          data-ph="cta-inscription"
        >
          {enCours ? 'Enregistrement…' : cta}
        </Button>
        <GarantiesInscription />
      </form>
      {estimation?.total && nomActif ? (
        <div className="mt-4">
          <RecevoirEstimation metier={metierActif} codePostal={codePostal} />
        </div>
      ) : null}
    </div>
  );
}
