import { describe, expect, it } from 'vitest';
import {
  droitsDe,
  formuleDeOffre,
  formuleMigree,
  FORMULES,
  inclut,
  offreProposee,
  PRIX_FORMULES_HT,
  remiseAppelOffres,
  siegesInclus,
} from './droits';

describe('droitsDe (PAIEMENTS §5)', () => {
  it('gratuit : aucun avantage payant, IA du site en essai', () => {
    expect(droitsDe('gratuit')).toEqual({
      formule: 'gratuit',
      ficheMiseEnAvant: false,
      badgeRecommande: false,
      photosIllimitees: false,
      coordonneesVisibles: false,
      statsDetaillees: false,
      sitePro: false,
      iaSite: 'essai',
      iaMultiplicateur: 1,
      remiseAppelsOffres: 0,
      avanceAppelsOffresH: 0,
      supportPrioritaire: false,
    });
  });

  it('Fiche Pro : avantages de la fiche, pas de site', () => {
    const d = droitsDe('fiche_pro');
    expect(d.ficheMiseEnAvant && d.badgeRecommande && d.coordonneesVisibles).toBe(true);
    expect(d.photosIllimitees && d.statsDetaillees).toBe(true);
    expect(d.sitePro).toBe(false);
    expect(d.iaSite).toBe('essai');
  });

  it('Site Pro : site et IA complète, fiche gratuite', () => {
    const d = droitsDe('site_pro');
    expect(d.sitePro).toBe(true);
    expect(d.iaSite).toBe('complet');
    expect(d.ficheMiseEnAvant).toBe(false);
  });

  it('Fiche + Site cumule les deux', () => {
    const d = droitsDe('pack_fiche_site');
    expect(d.sitePro && d.ficheMiseEnAvant && d.statsDetaillees).toBe(true);
    expect(d.iaMultiplicateur).toBe(1);
    expect(d.remiseAppelsOffres).toBe(0);
  });

  it('Tout inclus : quotas IA doublés, −15 %, 12 h d’avance, support prioritaire', () => {
    const d = droitsDe('tout_inclus');
    expect(d).toMatchObject({
      sitePro: true,
      ficheMiseEnAvant: true,
      iaSite: 'complet',
      iaMultiplicateur: 2,
      remiseAppelsOffres: 0.15,
      avanceAppelsOffresH: 12,
      supportPrioritaire: true,
    });
  });
});

describe('prix et offres', () => {
  it('prix HT mensuels en centimes', () => {
    expect(PRIX_FORMULES_HT).toEqual({
      fiche_pro: 2900,
      site_pro: 990,
      pack_fiche_site: 3490,
      tout_inclus: 4900,
    });
    expect(FORMULES).toHaveLength(5);
  });

  it('paramètre ?offre= de l’URL', () => {
    expect(formuleDeOffre('fiche')).toBe('fiche_pro');
    expect(formuleDeOffre('site')).toBe('site_pro');
    expect(formuleDeOffre('pack')).toBe('pack_fiche_site');
    expect(formuleDeOffre('tout')).toBe('tout_inclus');
    expect(formuleDeOffre('premium')).toBeNull();
    expect(formuleDeOffre(undefined)).toBeNull();
  });

  it('inclut : ce qu’une formule couvre déjà', () => {
    expect(inclut('tout_inclus', 'site_pro')).toBe(true);
    expect(inclut('pack_fiche_site', 'fiche_pro')).toBe(true);
    expect(inclut('fiche_pro', 'site_pro')).toBe(false);
    expect(inclut('site_pro', 'site_pro')).toBe(true);
    expect(inclut('pack_fiche_site', 'tout_inclus')).toBe(false);
    expect(inclut('gratuit', 'fiche_pro')).toBe(false);
  });

  it('offreProposee : combinaison au lieu d’un remplacement, rien si déjà inclus', () => {
    expect(offreProposee('gratuit', 'site_pro')).toBe('site_pro');
    expect(offreProposee('fiche_pro', 'site_pro')).toBe('pack_fiche_site');
    expect(offreProposee('site_pro', 'fiche_pro')).toBe('pack_fiche_site');
    expect(offreProposee('tout_inclus', 'site_pro')).toBeNull();
    expect(offreProposee('pack_fiche_site', 'tout_inclus')).toBe('tout_inclus');
  });

  it('migration des anciennes formules (D60)', () => {
    expect(formuleMigree({ plan: 'premium', optionVisibilite: true })).toBe('tout_inclus');
    expect(formuleMigree({ plan: 'gratuit', optionVisibilite: true })).toBe('fiche_pro');
    expect(formuleMigree({ plan: 'gratuit', optionVisibilite: false })).toBe('gratuit');
  });

  it('remise Tout inclus sur un appel d’offres, en centimes entiers', () => {
    expect(remiseAppelOffres(1990, droitsDe('tout_inclus'))).toBe(1692);
    expect(remiseAppelOffres(1990, droitsDe('fiche_pro'))).toBe(1990);
  });

  it('sièges inclus : 3 en Tout inclus, 1 sinon', () => {
    expect(siegesInclus('tout_inclus')).toBe(3);
    expect(siegesInclus('pack_fiche_site')).toBe(1);
    expect(siegesInclus('gratuit')).toBe(1);
  });
});
