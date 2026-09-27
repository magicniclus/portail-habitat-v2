import { Button, Input, PageErreur, classesChip } from '@ph/ui';
import Link from 'next/link';
import { routes } from '@/lib/routes';
import { EnteteErreur, PiedErreur } from './Cadre';
import { ESPACES_ERREUR, type EspacePublic } from './espaces';

/** 404 d'un espace : recherche, retour à l'accueil, pages souvent recherchées (ERR-01). */
export function PageIntrouvable({ espace }: { espace: EspacePublic }) {
  const e = ESPACES_ERREUR[espace];
  return (
    <PageErreur
      surtitre="Erreur 404"
      titre="Cette page a été"
      motCle="déplacée."
      texte="Le lien est peut-être ancien, ou la page n’existe plus. Retrouvez un artisan ou reprenez votre projet depuis l’accueil."
      visuel="404"
      entete={<EnteteErreur espace={espace} />}
      pied={<PiedErreur espace={espace} />}
      complement={
        <form
          action={routes.artisans}
          method="get"
          role="search"
          className="flex flex-wrap items-end gap-2.5"
        >
          <label className="flex min-w-[min(100%,260px)] flex-1 flex-col gap-1.5 text-sm font-semibold">
            Rechercher un artisan ou un métier
            <Input
              type="search"
              name="q"
              placeholder="Ex. plombier Bordeaux"
              enterKeyHint="search"
            />
          </label>
          <Button type="submit" taille="lg">
            Rechercher
          </Button>
        </form>
      }
      actions={
        <>
          <Button asChild taille="lg">
            <Link href={e.accueil}>Retour à l’accueil</Link>
          </Button>
          <Button asChild taille="lg" variant="secondaire">
            <Link href={routes.simulateur}>Simuler mon devis</Link>
          </Button>
        </>
      }
      liens={e.liens.map((l) => (
        <Link key={l.libelle} href={l.href} className={classesChip}>
          {l.libelle}
        </Link>
      ))}
    />
  );
}
