import { FORMULAIRE_GRATUIT, siteParDefaut } from '@ph/core/sites';
import { describe, expect, it } from 'vitest';
import { lienAction, texteRiche } from './actions';
import { rendreDocument } from './document';

const PALETTE = {
  primaire: 'primaire',
  accent: 'accent',
  clair: 'clair',
  sombre: 'sombre',
} as const;
const s = siteParDefaut(
  {
    nomCommercial: 'Bertrand <Rénovation>',
    metier: 'Plombier',
    ville: 'Bordeaux',
    telephone: '05 56 12 34 56',
    photos: ['lib:r1/0'],
  },
  PALETTE,
);
const ctx = {
  pages: s.pages,
  media: (src: string) => (src === 'lib:r1/0' ? 'https://storage.googleapis.com/x.webp' : null),
  champs: FORMULAIRE_GRATUIT,
};
const doc = (offre: 'gratuit' | 'site_pro' = 'gratuit') =>
  rendreDocument(
    {
      hote: 'bertrand.portailtravaux.fr',
      offre,
      theme: s.theme,
      navigation: s.navigation,
      page: s.pages.accueil!,
      pages: s.pages,
      nomEntreprise: 'Bertrand',
    },
    ctx,
  );

describe('rendu des sites publiés', () => {
  it('HTML complet, canonique, menu mobile et formulaire ; textes de l’artisan échappés', () => {
    const h = doc();
    expect(h.startsWith('<!doctype html>')).toBe(true);
    expect(h).toContain('<link rel="canonical" href="https://bertrand.portailtravaux.fr/">');
    expect(h).toContain('aria-label="Ouvrir le menu"');
    expect(h).toContain('aria-label="Fermer le menu"');
    expect(h).toContain('data-formulaire');
    expect(h).toContain('Bertrand &lt;Rénovation&gt;');
    expect(h).not.toContain('Bertrand <Rénovation>');
    expect(h).toContain('src="https://storage.googleapis.com/x.webp"');
  });

  it('surlignage des changements de l’IA : éditeur seulement, jamais sur le site publié', () => {
    expect(doc()).not.toContain('ia-modifie');
    const section = s.pages.accueil!.sections[0]!;
    const el = section.rows[0]!.cols[0]!.els[0]!;
    const h = rendreDocument(
      {
        hote: 'bertrand.portailtravaux.fr',
        offre: 'gratuit',
        theme: s.theme,
        navigation: s.navigation,
        page: s.pages.accueil!,
        pages: s.pages,
        nomEntreprise: 'Bertrand',
      },
      { ...ctx, surligner: new Set([section.id, el.id]) },
    );
    expect(h).toContain('.ia-modifie{');
    expect(h.match(/ia-modifie"/g)?.length ?? 0).toBeGreaterThanOrEqual(1);
    expect(h).toMatch(/<section class="[^"]*ia-modifie/);
  });

  it('mention Portail Travaux seulement sur un site gratuit', () => {
    expect(doc('gratuit')).toContain('Site créé avec');
    expect(doc('site_pro')).not.toContain('Site créé avec');
  });

  it('SITE-07 : aucun cookie ni script tiers (hors Turnstile configuré)', () => {
    const h = doc();
    expect(h).not.toMatch(/document\.cookie|googletagmanager|gtag\(/);
    expect(h.match(/<script src=/g)).toBeNull();
  });

  it('liens : page, téléphone, url externe en nouvel onglet et nofollow', () => {
    expect(lienAction({ type: 'page', page: 'contact', ancre: 'contact' }, s.pages)).toEqual({
      href: '/contact-devis#contact',
      externe: false,
      nofollow: false,
    });
    expect(lienAction({ type: 'tel', tel: '05 56 12 34 56' }, s.pages)?.href).toBe(
      'tel:0556123456',
    );
    expect(lienAction({ type: 'url', url: 'https://www.service-public.fr' }, s.pages)).toEqual({
      href: 'https://www.service-public.fr',
      externe: true,
      nofollow: true,
    });
    expect(lienAction({ type: 'url', url: 'javascript:alert(1)' }, s.pages)).toBeNull();
    expect(
      lienAction({ type: 'whatsapp', tel: '06 12 34 56 78', message: 'Bonjour' }, s.pages)?.href,
    ).toBe('https://wa.me/33612345678?text=Bonjour');
  });

  it('texte riche : gras et mots liés ; balises inconnues échappées', () => {
    const h = texteRiche(
      '<b>Fort</b> <script>x</script> [devis](#L1)',
      { L1: { type: 'page', page: 'contact' } },
      s.pages,
    );
    expect(h).toBe(
      '<b>Fort</b> &lt;script&gt;x&lt;/script&gt; <a class="lien" href="/contact-devis">devis</a>',
    );
    expect(texteRiche('<b>non fermé', undefined, s.pages)).toBe('<b>non fermé</b>');
  });

  it('SITE-02 : texte mobile distinct, sans effet sur l’ordinateur', () => {
    const page = structuredClone(s.pages.accueil!);
    const titre = page.sections[0]!.rows[0]!.cols[0]!.els.find((e) => e.type === 'titre')!;
    titre.p.texteMobileOn = true;
    titre.p.texteMobile = 'Court';
    const h = rendreDocument(
      {
        hote: 'h',
        offre: 'gratuit',
        theme: s.theme,
        navigation: s.navigation,
        page,
        pages: s.pages,
        nomEntreprise: 'B',
      },
      ctx,
    );
    expect(h).toContain('<span class="om">Court</span>');
    expect(h).toContain('<span class="nm">');
    expect(h).toMatch(/@media \(max-width:767px\)\{[^}]*\.ts\{font-size:var\(--fm\)\}/);
  });
});
