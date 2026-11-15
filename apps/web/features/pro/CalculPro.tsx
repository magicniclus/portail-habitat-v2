import { formatEuros } from '@ph/core/format';
import { bouton } from '@ph/ui';
import { conteneurPro } from './Sections';

const titre2 = 'm-0 mb-3 text-[clamp(28px,3.4vw,38px)] leading-[1.12]';
const bande = 'py-[clamp(48px,6vw,80px)]';

const CALCUL = [
  {
    titre: 'Ce que ça vous coûte',
    valeur: formatEuros(0),
    texte: 'Pas de carte bancaire à l’inscription, et pas de commission sur vos chantiers.',
  },
  {
    titre: 'Ce que vous risquez',
    valeur: 'Rien',
    texte: 'Sans engagement : vous mettez votre fiche en pause ou vous partez quand vous voulez.',
  },
  {
    titre: 'Ce que vous pouvez y gagner',
    valeur: 'Des chantiers',
    texte:
      'Des particuliers de votre secteur, qui vous écrivent avec leur projet, leur budget et leur délai.',
  },
] as const;

/** « Le calcul est vite fait » : coût nul, risque nul, gain possible. Aucun chiffre inventé. */
export function CalculPro() {
  return (
    <section className={bande}>
      <div className={conteneurPro}>
        <h2 className={`${titre2} text-center`}>Le calcul est vite fait</h2>
        <p className="m-0 mx-auto mb-8 max-w-[52ch] text-center text-[17px] leading-[27px] text-neutre-800">
          Vous ne payez rien pour recevoir des clients. Ne pas s’inscrire, c’est laisser ces
          demandes à un autre artisan de votre secteur.
        </p>
        <ul className="m-0 grid list-none gap-[18px] p-0 md:grid-cols-3">
          {CALCUL.map((c, i) => (
            <li
              key={c.titre}
              className={`grid content-start gap-2 rounded-card border p-6 ${i === 2 ? 'border-accent bg-accent-100' : 'border-trait bg-blanc'}`}
            >
              <span className="text-[14px] font-semibold text-neutre-700">{c.titre}</span>
              <b className="text-[clamp(30px,3.4vw,40px)] leading-none text-accent-700">
                {c.valeur}
              </b>
              <span className="text-[15.5px] leading-[24px] text-neutre-800">{c.texte}</span>
            </li>
          ))}
        </ul>
        <div className="mt-8 flex justify-center">
          <a href="#inscription" className={bouton({ taille: 'lg', className: 'min-h-[50px]' })}>
            Créer ma fiche gratuitement
          </a>
        </div>
      </div>
    </section>
  );
}
