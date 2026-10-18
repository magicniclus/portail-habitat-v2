import type { DemandeEspace, DetailDemande } from '@ph/firebase/espace';
import { posterJson } from '@/lib/posterJson';

export interface ProfilEspace {
  prenom: string | null;
  email: string;
  telephone: string | null;
}

export const chargerEspace = () =>
  posterJson<{ profil: ProfilEspace; demandes: DemandeEspace[] }>('/api/mon-espace/demandes', {});

export const chargerDemande = (demandeId: string) =>
  posterJson<DetailDemande>('/api/mon-espace/demande', { demandeId });

export const envoyerMessage = (e: { demandeId: string; artisanId: string; texte: string }) =>
  posterJson<{ messageId: string; masque: boolean }>('/api/mon-espace/messages', {
    ...e,
    cleIdempotence: crypto.randomUUID(),
  });

export const exporterDonnees = () =>
  posterJson<Record<string, unknown>>('/api/mon-espace/export', {});

export const supprimerCompte = () =>
  posterJson<null>('/api/mon-espace/suppression', { confirmation: 'SUPPRIMER' });

export const seDeconnecter = () => fetch('/api/session', { method: 'DELETE' }).catch(() => null);
