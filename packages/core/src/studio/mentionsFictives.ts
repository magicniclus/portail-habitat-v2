import type { Calque, PlanMontage } from './plan';
import type { Frise } from './frise';

/**
 * Jamais « exemple fictif » à l'image (décision du propriétaire) : l'auteur le dit à l'oral.
 * Les mentions sont retirées des textes, cartons, notifications, listes et miniatures ; un
 * élément qui ne contenait que cela disparaît.
 */
const MENTION = /\(?\s*(exemple\s+fictif|fictif|fictive|exemple)\s*\)?[\s.:!·–-]*/gi;

export function sansMentionFictive(texte: string): string {
  return texte
    .replace(MENTION, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Calque nettoyé, ou `null` s'il ne reste rien à montrer. */
export function calqueSansMention(c: Calque): Calque | null {
  switch (c.type) {
    case 'texte': {
      const texte = sansMentionFictive(c.texte);
      return texte ? { ...c, texte } : null;
    }
    case 'notification': {
      const titre = sansMentionFictive(c.titre);
      const texte = sansMentionFictive(c.texte);
      return titre && texte ? { ...c, titre, texte } : null;
    }
    case 'liste': {
      const elements = c.elements.map(sansMentionFictive).filter(Boolean);
      return elements.length ? { ...c, elements } : null;
    }
    case 'compteur':
    case 'barre':
      return { ...c, libelle: sansMentionFictive(c.libelle) || c.libelle };
    default:
      return c;
  }
}

const miniature = <T extends { miniature?: { texte: string; accent: string; tempsMs: number } }>(
  x: T,
): T => {
  if (!x.miniature) return x;
  const texte = sansMentionFictive(x.miniature.texte);
  return { ...x, miniature: { ...x.miniature, texte: texte || 'Portail Travaux' } };
};

export function planSansMentionFictive(p: PlanMontage): PlanMontage {
  return miniature({
    ...p,
    plans: p.plans.map((x) => ({
      ...x,
      ...(x.carton !== undefined
        ? { carton: sansMentionFictive(x.carton) || 'Portail Travaux' }
        : {}),
      calques: x.calques.flatMap((c) => {
        const n = calqueSansMention(c);
        return n ? [n] : [];
      }),
    })),
  });
}

export function friseSansMentionFictive(f: Frise): Frise {
  return miniature({
    ...f,
    pistes: f.pistes.map((p) => ({
      ...p,
      clips: p.clips.flatMap((c) => {
        const s = c.source;
        if (s.type === 'carton') {
          return [
            { ...c, source: { ...s, texte: sansMentionFictive(s.texte) || 'Portail Travaux' } },
          ];
        }
        if (s.type === 'effet') {
          const calque = calqueSansMention(s.calque);
          return calque ? [{ ...c, source: { ...s, calque } }] : [];
        }
        return [c];
      }),
    })),
  });
}
