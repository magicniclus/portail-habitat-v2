import { Logo } from '@ph/ui';
import Link from 'next/link';
import { ESPACES_ERREUR, type EspacePublic } from './espaces';

export function EnteteErreur({ espace }: { espace: EspacePublic }) {
  return (
    <Link
      prefetch={false}
      href={ESPACES_ERREUR[espace].accueil}
      className="inline-flex min-h-11 items-center no-underline"
      aria-label="Portail Habitat, accueil"
    >
      <Logo variant={espace} />
    </Link>
  );
}

const lienPied = 'inline-flex min-h-11 items-center text-neutre-700 hover:text-accent';

export function PiedErreur({ espace }: { espace: EspacePublic }) {
  const e = ESPACES_ERREUR[espace];
  return (
    <>
      <span className="inline-flex min-h-11 items-center">
        © {new Date().getFullYear()} Portail Habitat
      </span>
      <Link prefetch={false} href={e.aide} className={lienPied}>
        Aide et contact
      </Link>
      <Link prefetch={false} href={e.mentions} className={lienPied}>
        Mentions légales
      </Link>
    </>
  );
}
