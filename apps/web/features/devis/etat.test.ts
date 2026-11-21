import { entreeCreerFacture, entreeEnregistrerDevis } from '@ph/core/schemas';
import { describe, expect, it } from 'vitest';
import { etatInitial, ligneTexte, versEntree, versEntreeFacture, versRapide } from './etat';

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

describe('éditeur A4 : lignes de texte, mode rapide, options', () => {
  const vide = etatInitial({
    acompteDefautPct: 30,
    validiteJours: 30,
    tvaDefaut: 10,
    aujourdHui: Date.UTC(2026, 9, 14),
  });
  const plein = {
    ...vide,
    client: { ...vide.client, nom: 'Claire Martin', adresse: '3 rue des Lilas', ville: 'Mérignac' },
  };

  it('ligne de texte : ni quantité ni prix, type « texte » ; fourniture gardée', () => {
    const e = versEntree({
      ...plein,
      lignes: [
        { ...ligneTexte(10), designation: 'Salle de bain' },
        { ...vide.lignes[0]!, designation: 'Bac', puHt: '100', nature: 'fourniture' },
      ],
    });
    expect(e.lignes[0]).toEqual({
      type: 'texte',
      designation: 'Salle de bain',
      quantite: 0,
      unite: '',
      puHtCentimes: 0,
      tva: 10,
    });
    expect(e.lignes[1]).toMatchObject({ nature: 'fourniture', puHtCentimes: 10000 });
    expect(entreeEnregistrerDevis.safeParse(e).success).toBe(true);
  });

  it('passage en mode rapide : quantité 1, montant = total de la ligne', () => {
    const [l] = versRapide([{ ...vide.lignes[0]!, quantite: '12', puHt: '78,50' }]);
    expect(l).toMatchObject({ quantite: '1', puHt: '942,00' });
    expect(versRapide([ligneTexte(10)])[0]!.type).toBe('texte');
  });

  it('options et adresse détaillée du client passent dans l’entrée ; vides omises', () => {
    const e = versEntree({
      ...plein,
      client: { ...plein.client, codePostal: '33700', pays: 'France' },
      modeSaisie: 'rapide',
      intitule: 'Proposition commerciale',
      livraison: { adresse: ' ', ville: '' },
      champSignature: true,
      champLibre: { titre: 'Garantie', texte: '2 ans' },
    });
    expect(e).toMatchObject({
      modeSaisie: 'rapide',
      intitule: 'Proposition commerciale',
      champSignature: true,
      champLibre: { titre: 'Garantie', texte: '2 ans' },
      client: { codePostal: '33700', ville: 'Mérignac', pays: 'France' },
    });
    expect(e).not.toHaveProperty('adresseChantier');
    expect(e).not.toHaveProperty('livraison');
    expect(
      versEntree({ ...plein, livraison: { adresse: '5 rue Neuve', ville: 'Bordeaux', pays: '' } }),
    ).toMatchObject({
      livraison: { adresse: '5 rue Neuve', ville: 'Bordeaux' },
      adresseChantier: '5 rue Neuve, Bordeaux',
    });
    expect(e.client).not.toHaveProperty('complement');
    expect(entreeEnregistrerDevis.safeParse(e).success).toBe(true);
  });
});

describe('« Nouvelle facture » : saisie → entrée du serveur', () => {
  it('passe le schéma strict ; sans validité, acompte ni options de devis', () => {
    const e = etatInitial({
      acompteDefautPct: 30,
      validiteJours: 30,
      tvaDefaut: 10,
      aujourdHui: Date.UTC(2026, 9, 14),
    });
    const f = versEntreeFacture(
      {
        ...e,
        client: { ...e.client, nom: 'Claire Martin', adresse: '3 rue des Lilas' },
        objet: 'Dépannage',
        lignes: [{ ...e.lignes[0]!, designation: 'Main-d’œuvre', puHt: '80' }],
        datePrestationLe: '2026-10-13',
        conditionsAcceptation: 'ignorée sur une facture',
        intitule: 'ignoré',
      },
      'cle-facture-01',
    );
    expect(f).toMatchObject({ datePrestationLe: '2026-10-13', cleIdempotence: 'cle-facture-01' });
    expect(f).not.toHaveProperty('acomptePct');
    expect(f).not.toHaveProperty('conditionsAcceptation');
    expect(f).not.toHaveProperty('intitule');
    expect(entreeCreerFacture.safeParse(f).success).toBe(true);
  });
});
