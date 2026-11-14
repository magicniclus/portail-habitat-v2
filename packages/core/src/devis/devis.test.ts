import { describe, expect, it } from 'vitest';
import {
  attestationTvaReduite,
  conditionsDevis,
  conditionsFacture,
  formulaireRetractation,
  tonStatut,
  assainirHtml,
  calculerTotaux,
  estLigneChiffree,
  LIBELLES_NATURE_LIGNE,
  natureLigne,
  numeroDocument,
  verifierMentionsDevis,
  verifierMentionsFacture,
  type DevisAVerifier,
  type FactureAVerifier,
  type LigneDevis,
  type ParametresFacturation,
} from './index';

const ligne = (puHtCentimes: number, quantite: number, tva: 5.5 | 10 | 20, cout?: number) => ({
  designation: 'Ligne',
  quantite,
  unite: 'u',
  puHtCentimes,
  tva,
  ...(cout !== undefined ? { coutHtCentimes: cout } : {}),
});

describe('totaux en centimes', () => {
  it('HT par ligne, TVA par taux, TTC, marge et acompte', () => {
    const t = calculerTotaux({
      lignes: [ligne(38000, 1, 10, 14000), ligne(7800, 12, 10, 4100), ligne(16000, 1, 20, 4000)],
      remisePct: 0,
      acomptePct: 30,
    });
    expect(t.htBrutCentimes).toBe(38000 + 93600 + 16000);
    expect(t.htCentimes).toBe(147600);
    expect(t.tva).toEqual({ '10': 13160, '20': 3200 });
    expect(t.ttcCentimes).toBe(147600 + 13160 + 3200);
    expect(t.margeHtCentimes).toBe(147600 - (14000 + 49200 + 4000));
    expect(t.acompteCentimes).toBe(Math.round(t.ttcCentimes * 0.3));
  });

  it('remise appliquée avant TVA, sur chaque taux ; quantités décimales arrondies au centime', () => {
    const t = calculerTotaux({
      lignes: [ligne(2800, 12.5, 5.5), ligne(10000, 1, 20)],
      remisePct: 10,
      acomptePct: 0,
    });
    expect(t.htBrutCentimes).toBe(35000 + 10000);
    expect(t.remiseCentimes).toBe(4500);
    expect(t.htCentimes).toBe(40500);
    expect(t.tva).toEqual({ '5.5': 1733, '20': 1800 });
    expect(t.ttcCentimes).toBe(40500 + 1733 + 1800);
    for (const v of Object.values(t.tva)) expect(Number.isInteger(v)).toBe(true);
  });

  it('franchise en base de TVA : aucune TVA facturée', () => {
    const t = calculerTotaux(
      { lignes: [ligne(10000, 2, 20)], remisePct: 0, acomptePct: 0 },
      {
        franchiseTva: true,
      },
    );
    expect(t.tva).toEqual({});
    expect(t.ttcCentimes).toBe(20000);
  });

  it('sans ligne : tout à zéro', () => {
    expect(calculerTotaux({ lignes: [], remisePct: 0, acomptePct: 0 })).toMatchObject({
      htCentimes: 0,
      ttcCentimes: 0,
    });
  });
});

describe('numérotation', () => {
  it('D-aaaa-nnnn et F-aaaa-nnnn', () => {
    expect(numeroDocument('devis', 2026, 152)).toBe('D-2026-0152');
    expect(numeroDocument('facture', 2026, 7)).toBe('F-2026-0007');
    expect(numeroDocument('facture', 2027, 12345)).toBe('F-2027-12345');
  });
});

const params: ParametresFacturation = {
  raisonSociale: 'Bertrand Rénovation',
  formeJuridique: 'SARL',
  capitalSocial: '10 000 €',
  adresseSiege: '14 rue des Faures, 33800 Bordeaux',
  siret: '81234567800021',
  rne: '812 345 678',
  tvaIntra: 'FR42812345678',
  franchiseTva: false,
  tvaSurDebits: false,
  assuranceDecennale: { assureur: 'MAAF', contrat: '0045821', zone: 'France métropolitaine' },
  mediateur: { nom: 'CM2C', adresse: '14 rue Saint-Jean, 75017 Paris', site: 'www.cm2c.net' },
  delaiPaiementJours: 30,
};

const devis: DevisAVerifier = {
  typeClient: 'particulier',
  client: { nom: 'Claire Martin', adresse: '3 rue des Lilas, 33700 Mérignac' },
  validiteLe: new Date('2026-11-09'),
  debutTravauxLe: new Date('2026-11-16'),
  dureeEstimee: '5 jours ouvrés',
  fraisDeplacement: 'Inclus',
  horsEtablissement: false,
  lignes: [ligne(69000, 1, 10)],
};

describe('mentions obligatoires du devis (DATABASE §8 ter)', () => {
  it('devis complet : envoi possible', () => {
    const r = verifierMentionsDevis(devis, params);
    expect(r.ok).toBe(true);
    expect(r.manquantes).toEqual([]);
    expect(r.liste.map((m) => m.cle)).toContain('mediateur');
    expect(r.liste.map((m) => m.cle)).toContain('bon_pour_accord');
  });

  it('DEV-01 : client manquant → bloquant ; décennale absente → simple conseil', () => {
    const r = verifierMentionsDevis(
      { ...devis, client: { nom: 'Claire Martin', adresse: '' } },
      { ...params, assuranceDecennale: undefined },
    );
    expect(r.ok).toBe(false);
    expect(r.manquantes).toEqual(['client']);
    expect(r.conseils).toEqual(['assurance_decennale']);
    expect(r.liste.find((m) => m.cle === 'assurance_decennale')).toMatchObject({
      ok: false,
      conseil: true,
    });
  });

  it('DEV-02 : client professionnel sans SIREN valide → conseil, le devis reste validable', () => {
    const pro = { ...devis, typeClient: 'pro' as const };
    const r = verifierMentionsDevis({ ...pro, sirenClient: '1234' }, params);
    expect(r.ok).toBe(true);
    expect(r.conseils).toEqual(['siren_client']);
    expect(verifierMentionsDevis({ ...pro, sirenClient: '552 100 554' }, params).ok).toBe(true);
    // Professionnel : pas de médiateur de la consommation exigé.
    expect(
      verifierMentionsDevis(
        { ...pro, sirenClient: '552100554' },
        { ...params, mediateur: undefined },
      ).ok,
    ).toBe(true);
  });

  it('particulier : médiateur conseillé, jamais bloquant', () => {
    const r = verifierMentionsDevis(devis, { ...params, mediateur: undefined });
    expect(r.ok).toBe(true);
    expect(r.conseils).toEqual(['mediateur']);
  });

  it('DEV-03 : signé au domicile → rétractation 14 j ; DEV-04 : taux réduit → attestation', () => {
    const r = verifierMentionsDevis({ ...devis, horsEtablissement: true }, params);
    expect(r.annexes).toEqual(['retractation', 'attestation_tva_reduite']);
    expect(
      verifierMentionsDevis({ ...devis, lignes: [ligne(100, 1, 20)] }, params).annexes,
    ).toEqual([]);
    // Rétractation : seulement pour un particulier.
    expect(
      verifierMentionsDevis(
        {
          ...devis,
          typeClient: 'pro',
          sirenClient: '552100554',
          horsEtablissement: true,
          lignes: [ligne(100, 1, 20)],
        },
        params,
      ).annexes,
    ).toEqual([]);
  });

  it('lignes incomplètes, dates manquantes ; frais de déplacement facultatifs', () => {
    const r = verifierMentionsDevis(
      {
        ...devis,
        lignes: [{ ...ligne(0, 1, 20), designation: '' }],
        validiteLe: undefined,
        debutTravauxLe: undefined,
        dureeEstimee: '',
        fraisDeplacement: '',
      },
      params,
    );
    expect(r.manquantes).toEqual(['validite', 'lignes']);
    expect(r.conseils).toEqual(['debut_duree']);
  });

  it('particulier : la date de début OU la durée suffit ; client pro : facultatives', () => {
    const sansDate = { ...devis, debutTravauxLe: undefined, dureeEstimee: '5 jours' };
    expect(verifierMentionsDevis(sansDate, params).manquantes).toEqual([]);
    const pro = {
      ...devis,
      typeClient: 'pro' as const,
      sirenClient: '552100554',
      debutTravauxLe: undefined,
      dureeEstimee: '',
    };
    const r = verifierMentionsDevis(pro, params);
    expect(r.liste.map((m) => m.cle)).not.toContain('debut_duree');
    expect(r.manquantes).toEqual([]);
  });

  it('identité incomplète (SIRET absent) → manquante', () => {
    expect(verifierMentionsDevis(devis, { ...params, siret: '' }).manquantes).toEqual(['identite']);
  });
});

const facture: FactureAVerifier = {
  typeClient: 'pro',
  sirenClient: '552100554',
  client: { nom: 'SCI Les Pins', adresse: '8 avenue Thiers, 33000 Bordeaux' },
  lieuExecution: '3 rue des Lilas, 33700 Mérignac',
  emiseLe: new Date('2026-10-14'),
  datePrestationLe: new Date('2026-10-10'),
  echeanceLe: new Date('2026-11-13'),
  lignes: [ligne(69000, 1, 20)],
};

describe('mentions obligatoires de la facture (réforme 2026)', () => {
  it('DEV-07 : SIREN client (pro), lieu d’exécution et nature de l’opération présents', () => {
    const r = verifierMentionsFacture(facture, params);
    expect(r.ok).toBe(true);
    expect(r.liste.map((m) => m.cle)).toEqual(
      expect.arrayContaining(['siren_client', 'lieu_execution', 'nature_operation', 'penalites']),
    );
  });

  it('facture : décennale conseillée seulement', () => {
    const r = verifierMentionsFacture(facture, { ...params, assuranceDecennale: undefined });
    expect(r.ok).toBe(true);
    expect(r.conseils).toEqual(['assurance_decennale']);
  });

  it('pro sans SIREN, échéance absente → refus', () => {
    const r = verifierMentionsFacture(
      { ...facture, sirenClient: undefined, echeanceLe: undefined },
      params,
    );
    expect(r.manquantes).toEqual(['siren_client', 'echeance']);
  });

  it('option TVA sur les débits mentionnée quand elle est choisie', () => {
    const r = verifierMentionsFacture(facture, { ...params, tvaSurDebits: true });
    expect(r.liste.find((m) => m.cle === 'tva_debits')?.ok).toBe(true);
    expect(verifierMentionsFacture(facture, params).liste.some((m) => m.cle === 'tva_debits')).toBe(
      false,
    );
  });
});

describe('texte riche assaini (b, i, u, a, ul, ol, li)', () => {
  it('garde les balises permises sans attribut', () => {
    expect(assainirHtml('<b class="x">Gras</b> <i>it</i> <u>s</u>')).toBe(
      '<b>Gras</b> <i>it</i> <u>s</u>',
    );
    expect(assainirHtml('<ul><li>Un</li><li>Deux</li></ul>')).toBe(
      '<ul><li>Un</li><li>Deux</li></ul>',
    );
  });

  it('liens : http, https et mailto seulement, ouverts sans fuite de référent', () => {
    expect(assainirHtml('<a href="https://ex.fr/a?b=1&c=2" onclick="x()">lien</a>')).toBe(
      '<a href="https://ex.fr/a?b=1&amp;c=2" rel="noopener noreferrer nofollow">lien</a>',
    );
    expect(assainirHtml('<a href="javascript:alert(1)">x</a>')).toBe('<a>x</a>');
    expect(assainirHtml('<a href=" JavaScript:alert(1)">x</a>')).toBe('<a>x</a>');
  });

  it('tout le reste est échappé : scripts, styles, images, attributs', () => {
    expect(assainirHtml('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(assainirHtml('<img src=x onerror=alert(1)>')).toBe('&lt;img src=x onerror=alert(1)&gt;');
    expect(assainirHtml('<b onmouseover="x">a</b>')).toBe('<b>a</b>');
    expect(assainirHtml('a < b & c > d "e"')).toBe('a &lt; b &amp; c &gt; d &quot;e&quot;');
  });

  it('entités de l’éditeur gardées telles quelles, sans double échappement', () => {
    expect(assainirHtml('Pose&nbsp;de carrelage &amp; faïence, &#233;t&eacute;')).toBe(
      'Pose&nbsp;de carrelage &amp; faïence, &#233;t&eacute;',
    );
    expect(assainirHtml('&<script>')).toBe('&amp;&lt;script&gt;');
  });

  it('balises non fermées refermées, fermetures orphelines retirées', () => {
    expect(assainirHtml('<b>gras <i>et italique')).toBe('<b>gras <i>et italique</i></b>');
    expect(assainirHtml('texte</b></ul>')).toBe('texte');
  });
});

describe('textes légaux du PDF', () => {
  const base = {
    typeClient: 'particulier' as const,
    horsEtablissement: false,
    tauxReduit: false,
    devisGratuit: true,
    validiteLe: new Date('2026-11-09T12:00:00Z'),
    debutTravauxLe: new Date('2026-11-16T12:00:00Z'),
    dureeEstimee: '5 jours',
    fraisDeplacement: 'Inclus',
    acomptePct: 30,
    acompteCentimes: 53658,
  };

  it('DEV-03 : rétractation 14 j seulement pour un particulier démarché à domicile', () => {
    expect(conditionsDevis({ ...base, horsEtablissement: true }, params).join(' ')).toContain(
      'rétractation de 14 jours',
    );
    expect(conditionsDevis(base, params).join(' ')).not.toContain('rétractation');
    expect(conditionsDevis({ ...base, fraisDeplacement: '' }, params).join(' ')).not.toContain(
      'frais de déplacement',
    );
    const avec = conditionsDevis(
      {
        ...base,
        debutTravauxLe: new Date('2026-11-16T12:00:00Z'),
        dureeEstimee: '3 jours',
        fraisDeplacement: '35 € HT',
        libelleDebut: 'Date d’intervention',
      },
      params,
    ).join(' ');
    expect(avec).toContain(
      'Date d’intervention : 16/11/2026 · durée estimée : 3 jours · frais de déplacement : 35 € HT.',
    );
    expect(
      conditionsDevis({ ...base, typeClient: 'pro', horsEtablissement: true }, params).join(' '),
    ).not.toContain('rétractation');
    expect(formulaireRetractation(params).lignes[1]).toContain('Bertrand Rénovation');
  });

  it('DEV-04 : taux réduit → mention et attestation au nom du client', () => {
    expect(conditionsDevis({ ...base, tauxReduit: true }, params).join(' ')).toContain(
      'attestation simplifiée',
    );
    expect(
      attestationTvaReduite({ nom: 'Claire Martin', adresse: 'Mérignac' }).lignes[0],
    ).toContain('Claire Martin');
  });

  it('acompte, médiateur (particulier), indemnité 40 € (pro)', () => {
    const t = conditionsDevis(base, params).join(' ');
    expect(t).toContain('30 %');
    expect(t).toContain('536,58');
    expect(t).toContain('CM2C');
    expect(t).not.toContain('40 €');
    const pro = conditionsDevis({ ...base, typeClient: 'pro' }, params).join(' ');
    expect(pro).toContain('40 €');
    expect(pro).not.toContain('Médiateur');
  });

  it('facture : nature de l’opération, pas d’escompte, TVA sur les débits, franchise', () => {
    const t = conditionsFacture(
      {
        typeClient: 'pro',
        type: 'facture',
        devisNumero: 'D-2026-0001',
        echeanceLe: new Date('2026-11-13T12:00:00Z'),
      },
      { ...params, tvaSurDebits: true },
    ).join(' ');
    expect(t).toContain('prestation de services');
    expect(t).toContain('Pas d’escompte');
    expect(t).toContain('débits');
    expect(t).toContain('40 €');
    expect(
      conditionsFacture(
        { typeClient: 'particulier', type: 'facture' },
        { ...params, franchiseTva: true },
      ).join(' '),
    ).toContain('293 B');
  });
});

describe('cas complémentaires', () => {
  it('pastilles de statut', () => {
    expect(tonStatut('accepte')).toBe('succes');
    expect(tonStatut('payee')).toBe('succes');
    expect(tonStatut('refuse')).toBe('danger');
    expect(tonStatut('impayee')).toBe('danger');
    expect(tonStatut('envoye')).toBe('info');
    expect(tonStatut('emise')).toBe('info');
    expect(tonStatut('partiellement_payee')).toBe('attention');
    expect(tonStatut('brouillon')).toBe('neutre');
  });

  it('liens entre apostrophes ou sans guillemets ; lien vide', () => {
    expect(assainirHtml("<a href='mailto:a@b.fr'>m</a>")).toBe(
      '<a href="mailto:a@b.fr" rel="noopener noreferrer nofollow">m</a>',
    );
    expect(assainirHtml('<a href=https://x.fr>x</a>')).toBe(
      '<a href="https://x.fr" rel="noopener noreferrer nofollow">x</a>',
    );
    expect(assainirHtml('<a>x</a>')).toBe('<a>x</a>');
  });

  it('conditions sans acompte, sans dates, avec conditions de paiement et franchise', () => {
    const t = conditionsDevis(
      {
        typeClient: 'particulier',
        horsEtablissement: false,
        tauxReduit: true,
        devisGratuit: false,
        dureeEstimee: '',
        fraisDeplacement: '',
        acomptePct: 0,
        acompteCentimes: 0,
      },
      {
        ...params,
        franchiseTva: true,
        conditionsPaiement: 'Virement ou chèque.',
        mediateur: { nom: 'CM2C', adresse: 'Paris', site: 'cm2c.net' },
      },
    ).join(' ');
    expect(t).toContain('payant');
    expect(t).not.toContain('Début des travaux');
    expect(t).not.toContain('déplacement');
    expect(t).toContain('Paiement à réception');
    expect(t).toContain('Virement ou chèque.');
    expect(t).toContain('293 B');
    expect(t).toContain('(cm2c.net)');
    // Franchise : pas de mention de TVA réduite.
    expect(t).not.toContain('attestation simplifiée');
  });

  it('avoir : référence de la facture annulée, ni échéance ni pénalités', () => {
    const t = conditionsFacture(
      { typeClient: 'particulier', type: 'avoir', factureOrigine: 'F-2026-0001' },
      { ...params, conditionsPaiement: 'Virement.' },
    ).join(' ');
    expect(t).toContain('F-2026-0001');
    expect(t).not.toContain('Pas d’escompte');
    expect(
      conditionsFacture(
        { typeClient: 'particulier', type: 'facture' },
        { ...params, conditionsPaiement: 'Virement.' },
      ).join(' '),
    ).toContain('à réception. Virement.');
  });

  it('facture : client ou lignes incomplets, dates absentes', () => {
    const r = verifierMentionsFacture(
      {
        typeClient: 'particulier',
        client: { nom: '', adresse: '' },
        lignes: [],
      },
      { ...params, raisonSociale: '' },
    );
    expect(r.manquantes).toEqual([
      'identite',
      'dates',
      'client',
      'lieu_execution',
      'lignes',
      'echeance',
    ]);
  });
});

describe('lignes de texte et nature (éditeur A4)', () => {
  const texte = {
    type: 'texte' as const,
    designation: 'Salle de bain',
    quantite: 0,
    unite: '',
    puHtCentimes: 0,
    tva: 20 as const,
  };

  it('une ligne de texte ne compte pas dans les totaux ni dans la TVA', () => {
    const t = calculerTotaux({ lignes: [texte, ligne(10000, 2, 10)], remisePct: 0, acomptePct: 0 });
    expect(t.htCentimes).toBe(20000);
    expect(t.tva).toEqual({ '10': 2000 });
  });

  it('la fourniture se chiffre comme la prestation', () => {
    const f = { ...ligne(5000, 3, 20), nature: 'fourniture' as const };
    expect(calculerTotaux({ lignes: [f], remisePct: 0, acomptePct: 0 }).htCentimes).toBe(15000);
  });

  it('mentions : lignes de texte permises, mais au moins une ligne chiffrée', () => {
    expect(verifierMentionsDevis({ ...devis, lignes: [texte, ...devis.lignes] }, params).ok).toBe(
      true,
    );
    expect(verifierMentionsDevis({ ...devis, lignes: [texte] }, params).manquantes).toEqual([
      'lignes',
    ]);
    expect(
      verifierMentionsDevis(
        { ...devis, lignes: [{ ...texte, designation: ' ' }, ...devis.lignes] },
        params,
      ).manquantes,
    ).toEqual(['lignes']);
  });

  it('libellé de la ligne : « Prestation » par défaut, « Fourniture » sinon', () => {
    expect(estLigneChiffree(texte)).toBe(false);
    const chiffree: LigneDevis = ligne(1, 1, 20);
    expect(estLigneChiffree(chiffree)).toBe(true);
    expect(LIBELLES_NATURE_LIGNE[natureLigne(chiffree)]).toBe('Prestation');
    expect(LIBELLES_NATURE_LIGNE[natureLigne({ ...ligne(1, 1, 20), nature: 'fourniture' })]).toBe(
      'Fourniture',
    );
  });
});
