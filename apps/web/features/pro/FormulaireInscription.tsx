'use client';

import { evenementLanding, type OutilLanding } from '@ph/core/landings';
import type { SourceAcquisition } from '@ph/core/schemas';
import { Banner, Button, Field, Input } from '@ph/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState, type FormEvent } from 'react';
import { signalerConversion } from '@ph/tracker';
import { pousserEvenement } from '@/lib/dataLayer';
import { posterJson } from '@/lib/posterJson';
import { prechargerValidation } from '@/lib/prechargerValidation';
import { routes } from '@/lib/routes';
import { ChoixMetiers } from './ChoixMetiers';
import type { ChantierMetier, GroupeMetiers } from './metiers';
import { libelleSource, useDemandesEstimees } from './useDemandesEstimees';
import { useMetierCible } from './useMetierCible';

type Champ = 'email' | 'codePostal' | 'metierPrincipal';

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
 * Carte « Créer mon compte gratuit », étape 1 de l'inscription, formulaire court (décision du
 * 17/11/2026) : métier, code postal, email ; chantiers tous acceptés, repliés. Brouillon enregistré
 * et lien de reprise envoyé par email (ONB-04). Sur une landing, la source part avec (LAND-01).
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
    prechargerValidation();
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
      email: t('email'),
      codePostal: t('codePostal'),
      metierPrincipal: t('metierPrincipal'),
      metiers: f.getAll('metiers').map(String),
      intentions: f.getAll('intentions').map(String),
      site: t('site') || undefined,
      acquisition: acquisitionDe(source),
    };
    // Validation chargée à l'envoi : Zod (≈ 50 Ko) hors du premier chargement de la page.
    const { entreeInscriptionEtape1 } = await import('@ph/core/schemas');
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
      className="scroll-mt-[70px] rounded-[16px] border border-trait bg-blanc p-[clamp(14px,2.4vw,28px)] shadow-lg"
    >
      <form
        ref={formulaire}
        onSubmit={envoyer}
        onFocus={commencer}
        noValidate
        data-formulaire-inscription
        className="grid gap-3"
      >
        {/* Sur téléphone, le titre de la page suffit : le formulaire tient dans le premier écran. */}
        <div className="max-md:sr-only">
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
        <ChoixMetiers
          key={cible?.id ?? 'aucun'}
          groupes={groupes}
          chantiers={chantiers}
          principalInitial={cible?.id}
          erreurPrincipal={erreurs.metierPrincipal}
          onPrincipal={setPrincipal}
          aCote={
            <Field label="Code postal" requis erreur={erreurs.codePostal}>
              <Input
                champ="codePostal"
                name="codePostal"
                placeholder="33000"
                enterKeyHint="next"
                onChange={(e) => setCodePostal(e.target.value.replace(/\D/g, '').slice(0, 5))}
              />
            </Field>
          }
          milieu={
            <Field label="Email" requis erreur={erreurs.email}>
              <Input
                champ="email"
                name="email"
                placeholder="contact@entreprise.fr"
                enterKeyHint="go"
              />
            </Field>
          }
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
        <Button
          chargement={enCours}
          type="submit"
          pleineLargeur
          className="min-h-12"
          disabled={enCours}
          data-ph="cta-inscription"
        >
          {enCours ? 'Enregistrement…' : cta}
        </Button>
        <p className="m-0 text-center text-[14px] font-semibold text-neutre-800">
          Gratuit · sans carte bancaire · 2 minutes
        </p>
        {/* Conditions acceptées par l'envoi : la version est enregistrée côté serveur. */}
        <p className="m-0 text-center text-[12.5px] leading-[18px] text-neutre-700">
          En continuant, vous acceptez les{' '}
          <Link href={routes.legal('pro', 'cgv')}>conditions générales</Link>, la{' '}
          <Link href={routes.legal('pro', 'charte')}>charte</Link> et la{' '}
          <Link href={routes.legal('pro', 'confidentialite')}>politique de confidentialité</Link>.
        </p>
      </form>
    </div>
  );
}
