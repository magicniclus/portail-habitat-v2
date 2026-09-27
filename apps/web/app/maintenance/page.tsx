import { Button, PageErreur } from '@ph/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { EnteteErreur, PiedErreur } from '@/features/erreurs/Cadre';
import { routes } from '@/lib/routes';

export const metadata: Metadata = { title: 'Maintenance', robots: { index: false } };

export default function Maintenance() {
  return (
    <PageErreur
      surtitre="Maintenance"
      titre="Nous améliorons"
      motCle="Portail Habitat."
      texte="Le site est en maintenance pour quelques minutes. Merci de votre patience."
      visuel="···"
      entete={<EnteteErreur espace="particulier" />}
      pied={<PiedErreur espace="particulier" />}
      complement={
        <div className="flex flex-col gap-1.5 rounded-card bg-neutre-100 px-4 py-3.5">
          <span className="text-[15px] font-bold">Retour prévu dans quelques minutes</span>
          <span className="text-[14.5px] text-neutre-800">
            Vos demandes, messages et devis sont conservés. Aucune action n’est nécessaire de votre
            part.
          </span>
        </div>
      }
      actions={
        <Button asChild taille="lg" variant="secondaire">
          <Link href={routes.etatDuService}>Suivre l’état du service</Link>
        </Button>
      }
    />
  );
}
