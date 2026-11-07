'use client';

import { SCRIPT_BANDEAU_COOKIES } from './scriptBandeau';

/**
 * Script en ligne du bandeau, écrit dans le HTML du serveur seulement : il s'exécute avant le
 * premier affichage, et le navigateur ne le recrée jamais (React n'exécute pas un script rendu côté
 * client et le signale). À l'hydratation, React 19 ignore ce nœud en trop dans `<head>`.
 */
export function ScriptBandeau() {
  if (typeof window !== 'undefined') return null;
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT_BANDEAU_COOKIES }} />;
}
