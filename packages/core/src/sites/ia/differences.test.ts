import { describe, expect, it } from 'vitest';
import { siteParDefaut } from '../defaut';
import { elementsDe } from '../edition';
import { appliquerOperations } from './operations';
import { changementsIa } from './differences';

const site = siteParDefaut(
  { nomCommercial: 'Durand Plomberie', metier: 'Plombier', ville: 'Pessac', photos: [] },
  { primaire: 'primaire', accent: 'accent', clair: 'clair', sombre: 'sombre' },
);
const b = { pages: site.pages, navigation: site.navigation, theme: site.theme };
let n = 0;
const id = () => `n${++n}`;
const titre = elementsDe(site.pages.accueil!).find((e) => e.el.type === 'titre')!.el;

describe('changementsIa (aperçu surligné, IA_SITE §2.3)', () => {
  it('rien de changé : rien à surligner, page ouverte gardée', () => {
    expect(changementsIa(b, b, 'accueil')).toEqual({ pageId: 'accueil', ids: [] });
  });

  it('texte réécrit : seul l’élément est surligné', () => {
    const r = appliquerOperations(
      b,
      [{ op: 'texte', cible: titre.id, champ: 'texte', valeur: 'Nouveau titre' }],
      id,
    );
    if (!r.ok) throw new Error(r.erreurs[0]);
    expect(changementsIa(b, r.brouillon, 'accueil')).toEqual({
      pageId: 'accueil',
      ids: [titre.id],
    });
  });

  it('section insérée : la section entière est surlignée, pas ses éléments un à un', () => {
    const r = appliquerOperations(
      b,
      [
        {
          op: 'insererSection',
          page: 'accueil',
          apres: null,
          section: { rows: [{ cols: [{ w: 12, els: [{ type: 'titre', p: { texte: 'FAQ' } }] }] }] },
        },
      ],
      id,
    );
    if (!r.ok) throw new Error(r.erreurs[0]);
    const c = changementsIa(b, r.brouillon, 'accueil');
    expect(c.ids).toEqual([r.brouillon.pages.accueil!.sections[0]!.id]);
  });

  it('page créée : l’aperçu montre la nouvelle page, sans surlignage (tout est nouveau)', () => {
    const r = appliquerOperations(
      b,
      [
        {
          op: 'creerPage',
          page: {
            nom: 'Pompe à chaleur',
            sections: [
              { rows: [{ cols: [{ w: 12, els: [{ type: 'titre', p: { texte: 'PAC' } }] }] }] },
            ],
          },
        },
      ],
      id,
    );
    if (!r.ok) throw new Error(r.erreurs[0]);
    const c = changementsIa(b, r.brouillon, 'accueil');
    expect(c.pageId).not.toBe('accueil');
    expect(r.brouillon.pages[c.pageId]!.nom).toBe('Pompe à chaleur');
    expect(c.ids).toEqual([]);
  });

  it('page ouverte supprimée par la proposition : retour à l’accueil', () => {
    const autre = Object.keys(b.pages).find(
      (p) => p !== 'accueil' && b.pages[p]!.type !== 'mentions',
    )!;
    const r = appliquerOperations(b, [{ op: 'supprimerPage', cible: autre }], id);
    if (!r.ok) throw new Error(r.erreurs[0]);
    expect(changementsIa(b, r.brouillon, autre).pageId).toBe('accueil');
  });
});
