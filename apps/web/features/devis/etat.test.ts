import { entreeEnregistrerDevis } from '@ph/core/schemas';
import { describe, expect, it } from 'vitest';
import { etatInitial, versEntree } from './etat';

describe('éditeur de devis : saisie → entrée du serveur', () => {
  const vide = etatInitial({
    acompteDefautPct: 30,
    validiteJours: 30,
    tvaDefaut: 10,
    aujourdHui: Date.UTC(2026, 9, 14),
  });

  it('nouveau devis : validité à J+30, acompte par défaut, une ligne', () => {
    expect(vide.validiteLe).toBe('2026-11-13');
    expect(vide.acomptePct).toBe('30');
    expect(vide.lignes).toHaveLength(1);
  });

  it('montants saisis « 78,50 » → centimes ; l’entrée passe le schéma strict', () => {
    const e = versEntree({
      ...vide,
      client: { nom: 'Claire Martin', email: 'claire@test.fr', tel: '', adresse: 'Mérignac' },
      lignes: [
        { ...vide.lignes[0]!, designation: 'Faïence', quantite: '12,5', puHt: '78,50', cout: '' },
      ],
      remisePct: '150',
    });
    expect(e.lignes[0]).toEqual({
      designation: 'Faïence',
      quantite: 12.5,
      unite: 'u',
      puHtCentimes: 7850,
      tva: 10,
    });
    expect(e.remisePct).toBe(100);
    expect(entreeEnregistrerDevis.safeParse(e).success).toBe(true);
  });
});

describe('devis depuis une demande acceptée', () => {
  it('client et objet repris, demande liée dans l’entrée du serveur', () => {
    const e = etatInitial({
      demande: {
        demandeId: 'dem1',
        client: {
          nom: 'Claire Martin',
          email: 'claire@test.fr',
          tel: '+33612345678',
          adresse: '33700 Mérignac',
        },
        objet: 'Rénovation de salle de bain',
        precisions: '',
      },
      acompteDefautPct: 30,
      validiteJours: 30,
      tvaDefaut: 10,
      aujourdHui: Date.UTC(2026, 9, 14),
    });
    expect(e.client.nom).toBe('Claire Martin');
    expect(e.objet).toBe('Rénovation de salle de bain');
    expect(entreeEnregistrerDevis.parse(versEntree(e)).demandeId).toBe('dem1');
  });
});
