import { describe, expect, it } from 'vitest';
import {
  enregistrementsAchat,
  EXTENSIONS_ACHAT,
  suggestionsDomaine,
  statutDomaineAffiche,
  titulaireDomaine,
} from './achatDomaine';

describe('achat de domaine (DOMAINES §3)', () => {
  it('suggestions : nom de l’entreprise, variante ville, .fr .com .eu, sans doublon', () => {
    expect(EXTENSIONS_ACHAT).toEqual(['fr', 'com', 'eu']);
    expect(suggestionsDomaine({ nomCommercial: 'Bertrand Rénovation', ville: 'Mérignac' })).toEqual(
      [
        'bertrand-renovation.fr',
        'bertrand-renovation.com',
        'bertrand-renovation.eu',
        'bertrand-renovation-merignac.fr',
      ],
    );
    // Saisie de l'artisan : extension respectée si elle est proposée, sinon les trois.
    expect(suggestionsDomaine({ nomCommercial: 'X', requete: 'plombier-pessac.com' })[0]).toBe(
      'plombier-pessac.com',
    );
    expect(
      suggestionsDomaine({ nomCommercial: 'X', requete: 'Plombier Pessac' }).slice(0, 3),
    ).toEqual(['plombier-pessac.fr', 'plombier-pessac.com', 'plombier-pessac.eu']);
    expect(suggestionsDomaine({ nomCommercial: 'X', requete: 'site.org' })).not.toContain(
      'site.org',
    );
    expect(suggestionsDomaine({ nomCommercial: '!!!' })).toEqual([]);
    const long = suggestionsDomaine({ nomCommercial: 'a'.repeat(80) })[0]!;
    expect(long.split('.')[0]!.length).toBeLessThanOrEqual(63);
  });

  it('titulaire : l’entreprise de l’artisan (raison sociale, SIREN, siège), ou ce qui manque', () => {
    const fiche = {
      raisonSociale: 'BERTRAND RENOVATION SARL',
      siren: '732829320',
      adresseSiege: {
        ligne1: '12 rue des Lilas',
        codePostal: '33700',
        ville: 'Mérignac',
        pays: 'FR',
      },
      emailContact: 'contact@bertrand.fr',
      telephonePublic: '+33556123456',
    };
    expect(titulaireDomaine(fiche)).toEqual({
      ok: true,
      titulaire: {
        organisation: 'BERTRAND RENOVATION SARL',
        siren: '732829320',
        adresse: { ligne1: '12 rue des Lilas', codePostal: '33700', ville: 'Mérignac', pays: 'FR' },
        email: 'contact@bertrand.fr',
        telephone: '+33556123456',
      },
    });
    expect(titulaireDomaine({ raisonSociale: '', siren: '123' })).toEqual({
      ok: false,
      manquants: ['raison sociale', 'SIREN', 'adresse du siège', 'email de contact', 'téléphone'],
    });
  });

  it('zone DNS : valeurs de l’hébergeur, jamais de MX ni de TXT', () => {
    const e = enregistrementsAchat({
      apex: ['76.76.21.21'],
      cname: 'cname.vercel-dns.com.',
      verifications: [],
    });
    expect(e).toEqual([
      { type: 'A', nom: '@', valeur: '76.76.21.21' },
      { type: 'CNAME', nom: 'www', valeur: 'cname.vercel-dns.com' },
    ]);
  });

  it('statut affiché : attente DNS d’un domaine acheté = configuration en cours', () => {
    expect(statutDomaineAffiche('attente_dns', 'achat').libelle).toBe('Configuration en cours');
    expect(statutDomaineAffiche('attente_dns', 'connexion').tone).toBe('attention');
    expect(statutDomaineAffiche('actif', 'achat').tone).toBe('succes');
  });
});
