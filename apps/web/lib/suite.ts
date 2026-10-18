/** Page de retour après connexion : chemin interne seulement (pas de redirection vers un autre site). */
export function suiteSure(suite: string | null | undefined, defaut = '/mon-espace'): string {
  return suite && /^\/(?!\/)[\w\-/?=&%.]*$/.test(suite) && !suite.includes('\\') ? suite : defaut;
}
