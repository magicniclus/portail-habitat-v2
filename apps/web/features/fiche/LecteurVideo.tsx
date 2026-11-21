import { debutYoutube, idYoutube, integrationYoutube } from '@ph/core/sites';

/**
 * Vidéo de présentation d'une fiche : lien YouTube lu sans cookie (youtube-nocookie, suggestions
 * de la même chaîne seulement) ; ancienne vidéo importée lue telle quelle.
 */
export function LecteurVideo({ url, titre }: { url: string; titre: string }) {
  const id = idYoutube(url);
  if (!id) return <video src={url} controls preload="metadata" className="w-full rounded-[12px]" />;
  return (
    <iframe
      src={integrationYoutube(id, debutYoutube(url))}
      title={titre}
      loading="lazy"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      referrerPolicy="strict-origin-when-cross-origin"
      allowFullScreen
      className="aspect-video w-full rounded-[12px] border-0"
    />
  );
}
