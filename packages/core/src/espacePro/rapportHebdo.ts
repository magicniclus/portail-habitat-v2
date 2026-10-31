/**
 * Rapport du lundi (EMAILS `rapport-hebdo`, abonnés Premium) : vues, clics et demandes de la
 * semaine passée (lundi à dimanche), comparés à la semaine d'avant. Aucune activité : rien.
 */
const J = 86_400_000;

export interface JourActivite {
  jour: string;
  vuesFiche: number;
  clicsTelephone: number;
  clicsDevis: number;
  demandesRecues: number;
}
interface Totaux {
  vues: number;
  clics: number;
  demandes: number;
}

const jourParis = (ms: number) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(ms);

export function rapportHebdo(
  jours: readonly JourActivite[],
  maintenant: number,
): { semaine: Totaux; precedente: Totaux } | null {
  const [lundi, debut, avant] = [0, 7, 14].map((n) => jourParis(maintenant - n * J)) as [
    string,
    string,
    string,
  ];
  const somme = (de: string, a: string): Totaux => {
    const t = { vues: 0, clics: 0, demandes: 0 };
    for (const j of jours)
      if (j.jour >= de && j.jour < a) {
        t.vues += j.vuesFiche;
        t.clics += j.clicsTelephone + j.clicsDevis;
        t.demandes += j.demandesRecues;
      }
    return t;
  };
  const semaine = somme(debut, lundi);
  const precedente = somme(avant, debut);
  const total = (t: Totaux) => t.vues + t.clics + t.demandes;
  return total(semaine) + total(precedente) ? { semaine, precedente } : null;
}

const ecart = (a: number, b: number) => (a - b >= 0 ? `+${a - b}` : String(a - b));
const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? 's' : ''}`;

export function messageRapportHebdo(r: { semaine: Totaux; precedente: Totaux }): string {
  const { semaine: s, precedente: p } = r;
  return `Cette semaine : ${pluriel(s.vues, 'vue')} de votre fiche (${ecart(s.vues, p.vues)}), ${pluriel(s.clics, 'clic')} (${ecart(s.clics, p.clics)}), ${s.demandes} demande${s.demandes > 1 ? 's' : ''} reçue${s.demandes > 1 ? 's' : ''} (${ecart(s.demandes, p.demandes)}).`;
}
