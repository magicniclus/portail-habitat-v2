import { describe, expect, it } from 'vitest';
import { A_COMPLETER } from '../sites/ia/operations';
import { controleSeo } from './seo';
import {
  ACTIONS_IA_BLOG,
  garderFaitsHtml,
  lireSortieBlog,
  messageIaBlog,
  MODELE_IA_BLOG,
  SCHEMAS_IA_BLOG,
} from './ia';

describe('IA du blog (BLOG §2, §3)', () => {
  it('un schéma strict par action ; rédaction sur le modèle le plus capable (D50 ⏳)', () => {
    for (const a of ACTIONS_IA_BLOG)
      expect(SCHEMAS_IA_BLOG[a]).toMatchObject({ additionalProperties: false });
    expect(MODELE_IA_BLOG.rediger).toBe('claude-sonnet-5-5');
    expect(MODELE_IA_BLOG.titres).toBe('claude-haiku-5-5');
  });

  it('lit une rédaction : corps assaini, faits non sourcés remplacés', () => {
    const r = lireSortieBlog(
      'rediger',
      JSON.stringify({
        titre: 'Pompe à chaleur : prix',
        sousTitre: '',
        meta: 'Tout savoir.',
        motCle: 'pompe à chaleur',
        corpsHtml:
          '<h2>Prix</h2><p>Nous sommes RGE depuis 2009.</p><script>x</script><a href="/blog/a-2">lien</a>',
      }),
      'Durand, plombier à Pessac',
    );
    expect(r.ok).toBe(true);
    if (!r.ok || r.action !== 'rediger') return;
    expect(r.sortie.corpsHtml).toBe(
      `<h2>Prix</h2><p>Nous sommes ${A_COMPLETER} depuis ${A_COMPLETER}.</p><a href="/blog/a-2">lien</a>`,
    );
    expect(r.avertissements).toEqual(['RGE', '2009']);
  });

  it('propositions courtes (titres, méta, texte alternatif), classement, idées, réseaux', () => {
    const t = lireSortieBlog('titres', JSON.stringify({ propositions: ['A', 'B', 'C'] }), '');
    expect(t).toMatchObject({ ok: true, sortie: { propositions: ['A', 'B', 'C'] } });
    const c = lireSortieBlog(
      'classement',
      JSON.stringify({ categorie: 'Chauffage', tags: ['aides'] }),
      '',
    );
    expect(c.ok).toBe(true);
    const i = lireSortieBlog(
      'idees',
      JSON.stringify({ idees: [{ titre: 'Idée', motCle: 'k' }] }),
      '',
    );
    expect(i.ok).toBe(true);
    const r = lireSortieBlog(
      'reseaux',
      JSON.stringify({
        facebook: 'f',
        instagram: 'i',
        linkedin: 'l',
        google: 'g',
        hashtags: ['#pac'],
      }),
      '',
    );
    expect(r.ok).toBe(true);
  });

  it('sortie illisible ou hors schéma : refus clair', () => {
    expect(lireSortieBlog('titres', 'pas du json', '')).toMatchObject({ ok: false });
    expect(lireSortieBlog('titres', '{"propositions":"x"}', '')).toMatchObject({ ok: false });
  });

  it('garde-fou sur le texte seulement, jamais dans les adresses des liens', () => {
    expect(garderFaitsHtml('<a href="/x-2024">Depuis 2024</a>', '').texte).toBe(
      `<a href="/x-2024">Depuis ${A_COMPLETER}</a>`,
    );
  });

  it('message : action, sujet, type, longueur, chantiers ; jamais le mot « lead »', () => {
    const m = messageIaBlog({
      action: 'rediger',
      sujet: 'prix pompe à chaleur',
      type: 'Guide des prix',
      longueur: 'moyen',
      chantiers: true,
      article: { titre: '', meta: '', motCle: '', corps: '' },
      categories: ['Chauffage'],
    });
    expect(m).toMatch(/900 mots/);
    expect(m).toMatch(/Guide des prix/);
    expect(m).toMatch(/chantiers/);
    expect(m.toLowerCase()).not.toMatch(/\blead\b/);
  });

  it('« [à compléter] » restant : publication bloquée', () => {
    const r = controleSeo(
      {
        titre: `Pompe à chaleur ${A_COMPLETER}`,
        meta: 'x'.repeat(130),
        motCle: 'pompe à chaleur',
        corpsHtml: '<p>ok</p>',
        image: { src: '', alt: 'Une photo de chantier' },
        categorieId: 'c',
      },
      { mentionsCompletes: true },
    );
    expect(r.bloquants.map((b) => b.cle)).toEqual(['aCompleter']);
  });
});
