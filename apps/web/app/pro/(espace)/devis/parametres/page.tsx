import { appAdmin } from '@ph/firebase/admin';
import { lireParametresFacturation } from '@ph/firebase/devis';
import { getFirestore } from 'firebase-admin/firestore';
import type { Metadata } from 'next';
import { FormulaireParametres } from '@/features/devis/FormulaireParametres';
import { Tampon } from '@/features/devis/Tampon';
import { ConfigFirebase } from '@/features/firebase/ConfigFirebase';
import { routes } from '@/lib/routes';
import { accesDevis } from '@/server/pageDevis';

export const metadata: Metadata = { title: 'Paramètres de facturation', robots: { index: false } };

export default async function PageParametresFacturation() {
  const acces = await accesDevis(routes.proDevisParametres);
  const valeurs =
    (await lireParametresFacturation(getFirestore(appAdmin()), acces.artisanId)) ?? {};
  return (
    <main className="grid gap-6 px-[clamp(16px,3vw,32px)] pt-[clamp(20px,3vw,32px)] pb-12">
      <div>
        <h1 className="m-0 mb-1.5 text-[clamp(26px,3vw,34px)] leading-[1.1]">
          Paramètres de facturation
        </h1>
        <p className="m-0 max-w-[70ch] text-base text-neutre-800">
          Saisis une fois, repris sur chaque devis et chaque facture. Les mentions obligatoires en
          dépendent.
        </p>
      </div>
      <FormulaireParametres valeurs={valeurs} modifiable={acces.facturer} />
      {acces.facturer && Object.keys(valeurs).length ? (
        <>
          <ConfigFirebase />
          <Tampon artisanId={acces.artisanId} present={Boolean(valeurs.tamponChemin)} />
        </>
      ) : null}
    </main>
  );
}
