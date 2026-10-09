import { Banner } from '@ph/ui';
import { annoncesPour } from '@/server/annonces';

/** Annonces in-app publiées depuis l'admin (ADMIN §2.11), en haut de l'espace. */
export async function BandeauAnnonces({ public_ }: { public_: 'pros' | 'particuliers' }) {
  const annonces = await annoncesPour(public_);
  if (!annonces.length) return null;
  return (
    <div aria-label="Annonces" role="region" className="grid gap-2 px-[clamp(16px,3vw,32px)] pt-4">
      {annonces.map((a) => (
        <Banner key={a.id} tone={a.ton} titre={a.titre}>
          {a.texte}
        </Banner>
      ))}
    </div>
  );
}
