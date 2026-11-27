import { notFound } from 'next/navigation';

// Toute adresse inconnue de l'espace affiche sa propre page 404 (ERR-01).
export default function Inconnue() {
  notFound();
}
