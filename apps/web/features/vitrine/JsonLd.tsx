/** Données structurées schema.org (SEO, INTEGRATIONS §SEO). `<` échappé contre l'injection. */
export function JsonLd({ donnees }: { donnees: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(donnees).replace(/</g, '\\u003c') }}
    />
  );
}
