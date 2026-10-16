import type { Metadata } from 'next';
import Link from 'next/link';
import { FormulaireContact } from '@/features/aide/FormulaireContact';
import { ListeFaq } from '@/features/vitrine/Section';
import { routes } from '@/lib/routes';
import { sessionPro } from '@/server/sessionPro';

export const metadata: Metadata = { title: 'Aide & contact', robots: { index: false } };

const FAQ = [
  {
    q: 'Comment recevoir plus de demandes ?',
    r: 'Complétez votre fiche (description, photos de chantier, certifications) et répondez vite : la complétude de la fiche et la rapidité de réponse comptent dans l’attribution des demandes.',
  },
  {
    q: 'Comment changer ou résilier mon abonnement ?',
    r: 'Dans Mon compte › Abonnement. Sans engagement : la résiliation prend effet à la fin de la période payée.',
  },
  {
    q: 'Comment ajouter un collaborateur ?',
    r: 'Dans Mon compte › Équipe : invitez-le par email et choisissez son rôle. Chaque rôle ne voit que ce qui le concerne.',
  },
  {
    q: 'Mes devis et factures sont-ils conformes ?',
    r: 'Les mentions obligatoires sont vérifiées avant chaque envoi. Complétez une fois vos paramètres (SIRET, assurance décennale, médiateur) dans Devis & factures.',
  },
  {
    q: 'Mon site internet et mon blog sont-ils à moi ?',
    r: 'Oui : vos textes, vos photos et vos articles restent les vôtres, et votre domaine est enregistré à votre nom.',
  },
];

/** Maquette Aide et Contact (onglet de Mon compte, NAV-01) : formulaire, email, questions fréquentes. */
export default async function PageAidePro() {
  await sessionPro(routes.proAide);
  return (
    <main className="grid max-w-[1000px] gap-8 px-[clamp(16px,3vw,32px)] pt-[clamp(20px,3vw,32px)] pb-12 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
      <section className="grid content-start gap-3">
        <h1 className="m-0 text-[clamp(26px,3vw,34px)] leading-[1.1]">Aide & contact</h1>
        <p className="m-0 text-base text-neutre-800">
          Notre équipe vous répond sous 24 h ouvrées, du lundi au vendredi, 9 h – 18 h.
        </p>
        <FormulaireContact />
      </section>
      <aside className="grid content-start gap-6">
        <div className="grid gap-1.5">
          <h2 className="m-0 text-[19px]">Par email</h2>
          <p className="m-0 text-[15.5px] text-neutre-800">
            <a
              href="mailto:contact@portail-habitat.fr"
              className="inline-flex min-h-11 items-center"
            >
              contact@portail-habitat.fr
            </a>
          </p>
        </div>
        <div className="grid gap-1.5">
          <h2 className="m-0 text-[19px]">Raccourcis</h2>
          <Link href={routes.proFiche} className="inline-flex min-h-11 items-center">
            Compléter ma fiche pas à pas →
          </Link>
          <Link href={routes.proAbonnement} className="inline-flex min-h-11 items-center">
            Gérer mon abonnement →
          </Link>
        </div>
        <div className="grid gap-2">
          <h2 className="m-0 text-[19px]">Questions fréquentes</h2>
          <ListeFaq faq={FAQ} />
        </div>
      </aside>
    </main>
  );
}
