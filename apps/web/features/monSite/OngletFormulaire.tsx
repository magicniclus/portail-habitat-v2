import { FORMULAIRE_GRATUIT, LIBELLES_TYPE_CHAMP, type ChampFormulaire } from '@ph/core/sites';
import { FenetreOffre } from '@/features/offres/FenetreOffre';
import { ConstructeurFormulaire } from './ConstructeurFormulaire';
import { EnTeteOnglet } from './Mise';

const REGLAGES = [
  { libelle: 'Email à chaque demande', valeur: 'Activé' },
  { libelle: 'SMS à chaque demande', valeur: 'Désactivé' },
  { libelle: 'Protection anti-robot', valeur: 'Activée' },
  { libelle: 'Mention RGPD sous le formulaire', valeur: 'Affichée' },
];

/**
 * Onglet Formulaire (SITE-13) : en Gratuit, formulaire standard figé à 4 champs et réglages
 * verrouillés avec un seul encart Site Pro ; avec Site Pro, constructeur de champs.
 */
export function OngletFormulaire({
  sitePro,
  champs,
}: {
  sitePro: boolean;
  champs?: ChampFormulaire[];
}) {
  return (
    <section aria-label="Formulaire de contact" className="grid gap-5">
      <EnTeteOnglet titre="Formulaire de contact">
        Chaque envoi arrive dans « Mes demandes », avec les coordonnées complètes. Il ne vous coûte
        rien.
      </EnTeteOnglet>
      {sitePro ? (
        <ConstructeurFormulaire initial={champs ?? [...FORMULAIRE_GRATUIT]} />
      ) : (
        <>
          <div className="grid gap-3 rounded-2xl border border-accent-300 bg-accent-100 p-5">
            <strong>🔒 Formulaire standard en Gratuit.</strong>
            <p className="m-0 text-[15px]">
              Avec Site Pro, ajoutez vos propres questions (budget, date souhaitée…), réglez les
              notifications et recevez un SMS à chaque demande : vous rappelez avant les autres.
            </p>
            <div>
              <FenetreOffre
                formule="site_pro"
                raison="Le formulaire personnalisé est inclus dans Site Pro."
              >
                Personnaliser le formulaire
              </FenetreOffre>
            </div>
          </div>
          <ol
            className="m-0 grid list-none overflow-hidden rounded-[14px] border border-trait bg-blanc p-0"
            aria-label="Champs du formulaire"
          >
            {FORMULAIRE_GRATUIT.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap justify-between gap-2 border-t border-trait px-4 py-3 first:border-t-0"
              >
                <span>
                  <strong>{c.libelle}</strong> · {LIBELLES_TYPE_CHAMP[c.type]}
                </span>
                <span className="text-sm text-neutre-800">Obligatoire · 🔒</span>
              </li>
            ))}
          </ol>
          <dl className="m-0 grid overflow-hidden rounded-[14px] border border-trait bg-neutre-100">
            {REGLAGES.map((r) => (
              <div
                key={r.libelle}
                className="flex flex-wrap justify-between gap-2 border-t border-trait px-4 py-3 first:border-t-0"
              >
                <dt>{r.libelle}</dt>
                <dd className="m-0 font-semibold">{r.valeur} · 🔒</dd>
              </div>
            ))}
          </dl>
        </>
      )}
    </section>
  );
}
