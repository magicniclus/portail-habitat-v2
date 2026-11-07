import { describe, expect, it } from 'vitest';
import { depuisHtml, liensUtilises, nouveauLien, versHtml, type NoeudTexte } from './texteRiche';

/** Petit arbre DOM de test : texte, élément avec attributs et enfants. */
const t = (v: string): NoeudTexte => ({
  nodeType: 3,
  nodeName: '#text',
  nodeValue: v,
  textContent: v,
  childNodes: [],
  previousSibling: null,
});
function e(nom: string, enfants: NoeudTexte[], attrs: Record<string, string> = {}): NoeudTexte {
  enfants.forEach((x, i) => (x.previousSibling = enfants[i - 1] ?? null));
  return {
    nodeType: 1,
    nodeName: nom.toUpperCase(),
    nodeValue: null,
    textContent: enfants.map((x) => x.textContent).join(''),
    childNodes: enfants,
    previousSibling: null,
    getAttribute: (n) => attrs[n] ?? null,
  };
}

describe('texte riche de l’éditeur', () => {
  it('vers HTML : gras, italique, souligné, liens et retours à la ligne ; le reste échappé', () => {
    expect(versHtml('Un <b>gros</b> [devis](#L1)\n<script>x</script> & co')).toBe(
      'Un <b>gros</b> <a href="#L1" data-lid="L1">devis</a><br>&lt;script&gt;x&lt;/script&gt; &amp; co',
    );
  });

  it('depuis HTML : balises de mise en forme, liens connus, lignes ; rien d’autre', () => {
    const racine = e('div', [
      t('Votre '),
      e('strong', [t('plombier')]),
      t(' '),
      e('a', [t('ici')], { 'data-lid': 'L2' }),
      e('br', []),
      e('em', [t('vite')]),
      e('span', [t(' et ')], { style: 'color:red' }),
      e('a', [t('ailleurs')], { href: 'https://exemple.fr' }),
      e('div', [e('u', [t('fin')])]),
      e('b', []),
      e('span', [t(' sans lien')], { 'data-lid': 'L4' }),
    ]);
    expect(depuisHtml(racine)).toBe(
      'Votre <b>plombier</b> [ici](#L2)\n<i>vite</i> et ailleurs\n<u>fin</u>[ sans lien](#L4)',
    );
  });

  it('formats avancés : barré, exposant, surligné, couleur, listes (aller et retour)', () => {
    expect(
      versHtml('<s>a</s> <sup>2</sup> <mark>b</mark> <ka>c</ka>\n• un\n• deux\n3. trois'),
    ).toBe(
      '<s>a</s> <sup>2</sup> <mark>b</mark> <span class="ka">c</span><ul><li>un</li><li>deux</li></ul><ol start="3"><li>trois</li></ol>',
    );
    const racine = e('div', [
      t('Avant'),
      e('ul', [e('li', [e('strike', [t('un')])]), e('li', [t('deux')])]),
      t('Après '),
      e('span', [t('rouge')], { class: 'ka' }),
      e('ol', [e('li', [e('mark', [t('x')])])], { start: '2' }),
    ]);
    expect(depuisHtml(racine)).toBe(
      'Avant\n• <s>un</s>\n• deux\nAprès <ka>rouge</ka>\n2. <mark>x</mark>',
    );
  });

  it('aller-retour sans perte', () => {
    const texte = 'A <b>B</b> [C](#L3)\nD';
    // Le HTML produit, relu par un vrai navigateur, redonne le même texte (vérifié en e2e) ;
    // ici, un lien porte son identifiant et les espaces insécables redeviennent des espaces.
    expect(versHtml(texte)).toContain('data-lid="L3"');
    expect(depuisHtml(e('div', [t('a\u00a0b')]))).toBe('a b');
  });

  it('liens : ceux qui restent dans le texte, et le prochain identifiant libre', () => {
    const liens = { L1: { type: 'tel' as const, tel: '0600' }, L2: { type: 'aucun' as const } };
    expect(Object.keys(liensUtilises('[x](#L1)', liens))).toEqual(['L1']);
    expect(liensUtilises('x', undefined)).toEqual({});
    expect(nouveauLien('[x](#L1)', liens)).toBe('L3');
    expect(nouveauLien('', undefined)).toBe('L1');
  });
});
