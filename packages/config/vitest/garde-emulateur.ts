/**
 * Garde-fou : un test qui touche Firebase ne doit JAMAIS viser un vrai projet.
 * Chargé en `setupFiles` par les paquets dont les tests utilisent l'émulateur.
 */
import { verifierEmulateur } from './verifier-emulateur';

verifierEmulateur(process.env);
