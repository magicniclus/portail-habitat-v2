import { describe, expect, it } from 'vitest';
import { siteParDefaut } from '../defaut';
import { elementsDe } from '../edition';
import { pageSite } from '../schemas';
import {
  A_COMPLETER,
  appliquerOperations,
  garderFaits,
  lireSortieIa,
  resumeArbre,
  textesACompleter,
} from './operations';

const palette = {
  primaire: 'primaire',
  accent: 'accent',
  clair: 'clair',
  sombre: 'sombre',
} as const;
const site = siteParDefaut(
  {
    nomCommercial: 'Durand Plomberie',
    metier: 'Plombier',
    ville: 'Pessac',
    telephone: '05 56 12 34 56',
    photos: [],
    // Vrais avis : aucune carte « [à compléter] » dans le site de départ.
    avis: Array.from({ length: 4 }, (_, i) => ({ nom: `Client ${i}`, note: 5, texte: 'Parfait.' })),
  },
  palette,
);
const brouillon = { pages: site.pages, navigation: site.navigation, theme: site.theme };
let n = 0;
const id = () => `n${++n}`;
const titre = elementsDe(site.pages.accueil!).find((e) => e.el.type === 'titre')!.el;
const section = site.pages.accueil!.sections[0]!;

describe('opérations de l’IA (IA_SITE §2)', () => {
  it('lit la sortie du modèle : JSON invalide ou hors schéma → refus clair', () => {
    expect(lireSortieIa('{"resume":"x","question":"","operations":"pas du json"}').ok).toBe(false);
    expect(
      lireSortieIa(JSON.stringify({ resume: 'x', question: '', operations: '[{"op":"inconnue"}]' }))
        .ok,
    ).toBe(false);
    const r = lireSortieIa(
      JSON.stringify({
        resume: 'Titre réécrit',
        question: '',
        operations: JSON.stringify([
          { op: 'texte', cible: titre.id, champ: 'texte', valeur: 'Plombier à Pessac' },
        ]),
      }),
    );
    expect(r.ok && r.sortie.operations).toHaveLength(1);
  });

  it('applique texte, props, insertion et suppression ; ids générés côté serveur', () => {
    const r = appliquerOperations(
      brouillon,
      [
        { op: 'texte', cible: titre.id, champ: 'texte', valeur: 'Votre plombier à Pessac' },
        { op: 'props', cible: section.id, patch: { fond: 'sombre' } },
        {
          op: 'insererSection',
          page: 'accueil',
          apres: section.id,
          section: {
            p: { nom: 'FAQ' },
            rows: [
              { cols: [{ w: 12, els: [{ type: 'titre', p: { texte: 'Questions fréquentes' } }] }] },
            ],
          },
        },
      ],
      id,
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const accueil = r.brouillon.pages.accueil!;
    expect(pageSite.safeParse(accueil).success).toBe(true);
    expect(elementsDe(accueil).find((e) => e.el.id === titre.id)?.el.p).toMatchObject({
      texte: 'Votre plombier à Pessac',
    });
    expect(accueil.sections[0]!.p.fond).toBe('sombre');
    expect(accueil.sections[1]!.p.nom).toBe('FAQ');
    expect(accueil.sections[1]!.id).toMatch(/^n\d+$/);
    // Le brouillon d'origine n'est pas modifié (Ctrl Z restaure l'état exact, SITE-IA-06).
    expect(brouillon.pages.accueil!.sections[0]!.p.fond).not.toBe('sombre');
  });

  it('SITE-IA-04 : id inexistant, page protégée ou réglage invalide → tout est refusé', () => {
    expect(appliquerOperations(brouillon, [{ op: 'supprimer', cible: 'fantome' }], id).ok).toBe(
      false,
    );
    expect(appliquerOperations(brouillon, [{ op: 'supprimerPage', cible: 'accueil' }], id).ok).toBe(
      false,
    );
    expect(
      appliquerOperations(
        brouillon,
        [{ op: 'props', cible: section.id, patch: { fond: 'url(evil)' } }],
        id,
      ).ok,
    ).toBe(false);
    const r = appliquerOperations(
      brouillon,
      [
        { op: 'texte', cible: titre.id, champ: 'texte', valeur: 'ok' },
        { op: 'supprimer', cible: 'fantome' },
      ],
      id,
    );
    expect(r.ok).toBe(false);
  });

  it('SITE-IA-05 : chiffre ou certification absents des sources → [à compléter], publication bloquée', () => {
    const sources = 'Durand Plomberie, plombier à Pessac, 05 56 12 34 56, devis sous 48 h';
    expect(garderFaits('Certifié RGE depuis 1998, 4,9/5 sur 120 avis', sources)).toEqual({
      texte: `Certifié ${A_COMPLETER} depuis ${A_COMPLETER}, ${A_COMPLETER} sur ${A_COMPLETER} avis`,
      remplaces: ['RGE', '1998', '4,9/5', '120'],
    });
    expect(garderFaits('Appelez le 05 56 12 34 56, devis sous 48 h', sources).remplaces).toEqual(
      [],
    );
    const r = appliquerOperations(
      brouillon,
      [{ op: 'texte', cible: titre.id, champ: 'texte', valeur: `Artisan ${A_COMPLETER}` }],
      id,
    );
    expect(r.ok && textesACompleter(r.brouillon.pages)).toEqual([
      { pageId: 'accueil', page: 'Accueil', elementId: titre.id },
    ]);
  });

  it('résumé de l’arbre pour le modèle : ids, types, textes tronqués', () => {
    const r = resumeArbre(brouillon);
    expect(r).toContain(titre.id);
    expect(r.length).toBeLessThan(16_000);
  });
});

describe('réglages de l’IA (D48, D50, D51 ⏳)', () => {
  it('crédits : quotas Site Pro doublés en Tout inclus, essai limité aux textes', async () => {
    const { creditIaSite } = await import('./reglages');
    expect(creditIaSite({ iaSite: 'complet', iaMultiplicateur: 1 }, 'composant')).toEqual({
      type: 'mois',
      categorie: 'composants',
      max: 60,
    });
    expect(creditIaSite({ iaSite: 'complet', iaMultiplicateur: 2 }, 'seo')).toMatchObject({
      max: 600,
    });
    expect(creditIaSite({ iaSite: 'essai', iaMultiplicateur: 1 }, 'textes')).toEqual({
      type: 'essai',
      max: 3,
    });
    expect(creditIaSite({ iaSite: 'essai', iaMultiplicateur: 1 }, 'page')).toBeNull();
  });
});

describe('chaque opération, succès et refus', () => {
  const page = site.pages.accueil!;
  const elements = elementsDe(page).map((e) => e.el);
  const premier = (t: string) => elements.find((e) => e.type === t)!;
  const ligne = page.sections[0]!.rows[0]!;
  const sec = { rows: [{ cols: [{ w: 12, els: [{ type: 'texte' as const }] }] }] };
  const ok = (ops: Parameters<typeof appliquerOperations>[1]) =>
    appliquerOperations(brouillon, ops, id);

  it.each([
    [{ op: 'texte', cible: premier('titre').id, champ: 'texteMobile', valeur: 'Court' }],
    [{ op: 'props', cible: ligne.id, patch: { gap: 12 } }],
    [{ op: 'props', cible: ligne.cols[0]!.id, patch: { pad: 8 } }],
    [{ op: 'props', cible: premier('titre').id, patch: { align: 'center', id: 'ignoré' } }],
    [{ op: 'insererSection', page: 'accueil', apres: null, section: sec }],
    [{ op: 'remplacerSection', cible: page.sections[0]!.id, section: sec }],
    [{ op: 'supprimer', cible: premier('titre').id }],
    [{ op: 'supprimer', cible: page.sections[0]!.id }],
    [{ op: 'deplacer', cible: page.sections[0]!.id, index: 99 }],
    [{ op: 'creerPage', page: { nom: 'Contact', sections: [sec], seo: { title: 'Contact' } } }],
    [
      {
        op: 'creerPage',
        page: { nom: 'Pompe à chaleur', slug: 'pac', menu: false, sections: [sec] },
      },
    ],
    [{ op: 'supprimerPage', cible: 'contact' }],
    [{ op: 'theme', patch: { polices: 'barlow' } }],
    [
      {
        op: 'remplacerContenuPage',
        cible: 'accueil',
        sections: [sec],
        seo: { title: 'Plombier à Pessac' },
      },
    ],
    [{ op: 'remplacerContenuPage', cible: 'contact', sections: [sec] }],
    [{ op: 'navigation', patch: { nom: 'Durand' } }],
    [{ op: 'seo', page: 'accueil', patch: { title: 'Plombier à Pessac' } }],
    [
      {
        op: 'lien',
        cible: premier('titre').id,
        lid: 'L1',
        action: { type: 'page', page: 'contact' },
      },
    ],
  ] as const)('%o appliquée', (o) => {
    expect(ok([o as never]).ok).toBe(true);
  });

  it.each([
    [{ op: 'texte', cible: 'x', champ: 'texte', valeur: 'a' }],
    [{ op: 'texte', cible: premier('titre').id, champ: 'legende', valeur: 'a' }],
    [{ op: 'texte', cible: premier('formulaire').id, champ: 'texteMobile', valeur: 'a' }],
    [{ op: 'props', cible: 'x', patch: {} }],
    [{ op: 'insererSection', page: 'x', apres: null, section: sec }],
    [{ op: 'insererSection', page: 'accueil', apres: 'x', section: sec }],
    [{ op: 'remplacerSection', cible: 'x', section: sec }],
    [{ op: 'deplacer', cible: 'x', index: 0 }],
    [{ op: 'supprimerPage', cible: 'mentions' }],
    [{ op: 'supprimerPage', cible: 'x' }],
    [{ op: 'seo', page: 'x', patch: {} }],
    [{ op: 'remplacerContenuPage', cible: 'x', sections: [sec] }],
    [{ op: 'lien', cible: premier('formulaire').id, lid: 'L1', action: { type: 'aucun' } }],
    [{ op: 'theme', patch: { polices: 'comic' } }],
    [{ op: 'navigation', patch: { fixe: 'oui' } }],
  ] as const)('%o refusée', (o) => {
    expect(ok([o as never]).ok).toBe(false);
  });

  it('pages créées : adresse unique ; textes du site comme sources', async () => {
    const r = ok([
      { op: 'creerPage', page: { nom: 'Accueil', sections: [sec] } },
      { op: 'creerPage', page: { nom: 'Accueil', sections: [sec] } },
    ]);
    expect(r.ok && Object.values(r.brouillon.pages).map((p) => p.slug)).toEqual(
      expect.arrayContaining(['accueil', 'accueil-2']),
    );
    const { textesDuSite } = await import('./operations');
    expect(textesDuSite(site.pages)).toContain('Durand Plomberie');
    expect(
      lireSortieIa(JSON.stringify({ resume: '', question: 'Quel délai ?', operations: '' })),
    ).toMatchObject({
      ok: true,
      sortie: { operations: [] },
    });
  });

  it('message au modèle selon la portée', async () => {
    const { messageIaSite } = await import('./prompt');
    const m = (portee: 'selection' | 'page' | 'site', reponse?: string) =>
      messageIaSite({
        mode: 'textes',
        portee,
        pageId: 'accueil',
        cibles: ['e1'],
        demande: 'Plus court',
        ...(reponse ? { reponse } : {}),
      });
    expect(m('selection')).toContain('sélection e1');
    expect(m('page')).toContain('page accueil');
    expect(m('site', '48 h')).toContain('tout le site');
    expect(m('site', '48 h')).toContain('48 h');
  });
});

describe('message de création d’une page', () => {
  it('remplace une page existante ou en crée une, exclusions comprises', async () => {
    const { messageCreationPage } = await import('./prompt');
    const base = { nom: 'Accueil', consigne: 'c', reponses: '{}', exclus: [] };
    expect(messageCreationPage({ ...base, remplace: 'accueil' })).toContain('remplacerContenuPage');
    expect(messageCreationPage(base)).toContain('creerPage');
    expect(messageCreationPage({ ...base, exclus: ['12 avis'] })).toContain('12 avis');
  });
});
