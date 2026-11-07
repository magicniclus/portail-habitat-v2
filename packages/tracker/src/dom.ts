import { ECHANTILLONS_DEFAUT } from '@ph/core/comportement';
import type { OptionsTraceur } from './index';
import { creerResume } from './resume';

/** Branchement du résumé sur la page : écoutes passives, aucune lecture de texte ni de valeur. */
export const EVENEMENT_CONVERSION = 'ph:conversion';
const SECOURS_MS = 60_000;
const DEFILEMENT_MS = 100;
const CLIQUABLE =
  'a[href],button,input,select,textarea,label,summary,[role=button],[role=link],[role=tab],[role=checkbox],[role=radio],[onclick]';
const OBJECTIFS = ['inscription', 'demande', 'paiement'] as const;

const nettoyer = (v: string) =>
  v
    .toLowerCase()
    .replace(/[^a-z0-9_:.>-]+/g, '-')
    .replace(/^[^a-z0-9]+/, '')
    .slice(0, 60);
const aleatoire = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(16)), (o) => (o % 36).toString(36)).join('');
/** Lit ou pose une valeur ; rend `[valeur, nouvelle]`. Stockage bloqué : valeur par défaut. */
function memoire(s: () => Storage, cle: string, defaut: string) {
  try {
    const v = s().getItem(cle);
    if (v) return [v, false] as const;
    s().setItem(cle, defaut);
  } catch {
    /* navigation privée stricte : la visite est mesurée sans mémoire */
  }
  return [defaut, true] as const;
}
const masque = (el: Element) => !!el.closest('[data-ph-masque]');
const suiviDe = (el: Element) => {
  const v = el.closest('[data-ph]')?.getAttribute('data-ph');
  return v ? nettoyer(v) : undefined;
};
/** Clé stable : `data-ph`, sinon section + balise + rang parmi ses semblables (jamais de texte). */
function cle(el: Element) {
  const suivi = suiviDe(el);
  if (suivi) return suivi;
  let rang = 1;
  for (let s = el.previousElementSibling; s; s = s.previousElementSibling)
    if (s.tagName === el.tagName) rang++;
  const section = el.closest('[data-ph-section]')?.getAttribute('data-ph-section') ?? 'page';
  return nettoyer(`${section}>${el.tagName}:${rang}`);
}
/** Source : `utm_source`, sinon domaine du référent externe, sinon `direct` (jamais d'URL complète). */
function source() {
  let s = new URLSearchParams(location.search).get('utm_source') ?? '';
  try {
    const h = s || new URL(document.referrer).hostname;
    if (h !== location.hostname) s = h;
  } catch {
    /* pas de référent */
  }
  return nettoyer(s).replace(/[:>]/g, '-') || 'direct';
}
const elementDe = (e: Event) => (e.target instanceof Element ? e.target : null);

export function demarrer(o: OptionsTraceur) {
  const maintenant = () => performance.now();
  const doc = document.documentElement;
  const [sessionId] = memoire(() => sessionStorage, 'ph:s', aleatoire());
  const [, nouvelle] = memoire(() => localStorage, 'ph:v', '1');
  const r = creerResume({
    sessionId,
    vueId: aleatoire(),
    page: o.page,
    ...(o.variante ? { variante: o.variante } : {}),
    app: o.app,
    largeur: innerWidth,
    source: source(),
    nouvelle,
    debut: maintenant(),
    trajets: Math.random() < (o.echantillonTrajets ?? ECHANTILLONS_DEFAUT.trajets),
    replay: Math.random() < (o.echantillonReplay ?? ECHANTILLONS_DEFAUT.replays),
  });
  const ecoutes: [EventTarget, string, (e: Event) => void][] = [];
  const ecouter = <E extends Event>(cible: EventTarget, type: string, f: (e: E) => void) => {
    ecoutes.push([cible, type, f as (e: Event) => void]);
    cible.addEventListener(type, f as (e: Event) => void, { passive: true, capture: true });
  };
  let modifie = true;
  let dernierDefilement = -Infinity;
  let survol: { suivi: string; t: number } | undefined;
  let champ: { nom: string; t: number } | undefined;
  const visibles = new Map<Element, number | undefined>();
  const idSection = (el: Element) => nettoyer(el.getAttribute('data-ph-section') ?? '');

  /** Reporte dans le résumé les durées en cours (sections visibles, survol) sans les clore. */
  const vider = (t: number, reprise: number | undefined) => {
    for (const [el, debut] of visibles) {
      if (debut !== undefined) r.section(idSection(el), t - debut);
      visibles.set(el, reprise);
    }
    if (survol) {
      r.survol(survol.suivi, t - survol.t);
      survol.t = t;
    }
  };
  const envoyer = () => {
    const t = maintenant();
    vider(t, document.hidden ? undefined : t);
    if (!modifie) return;
    modifie = false;
    const corps = JSON.stringify(r.resume(t));
    const url = o.endpoint ?? '/api/t';
    try {
      if (navigator.sendBeacon(url, new Blob([corps], { type: 'application/json' }))) return;
    } catch {
      /* repli ci-dessous */
    }
    fetch(url, {
      method: 'POST',
      body: corps,
      keepalive: true,
      headers: { 'content-type': 'application/json' },
    }).catch(() => {});
  };
  const signaler = (f: (t: number) => void) => (e: Event) => {
    const el = elementDe(e);
    if (el && masque(el)) return;
    f(maintenant());
    modifie = true;
  };

  const io = new IntersectionObserver(
    (entrees) => {
      const t = maintenant();
      for (const e of entrees) {
        const vu = e.intersectionRatio >= 0.5 || e.intersectionRect.height >= innerHeight / 2;
        const debut = visibles.get(e.target);
        if (vu && !visibles.has(e.target)) {
          visibles.set(e.target, document.hidden ? undefined : t);
          r.sectionVisible(idSection(e.target));
        } else if (!vu && visibles.has(e.target)) {
          if (debut !== undefined) r.section(idSection(e.target), t - debut);
          visibles.delete(e.target);
        }
      }
      modifie = true;
    },
    { threshold: [0, 0.25, 0.5, 0.75, 1] },
  );
  document.querySelectorAll('[data-ph-section]').forEach((s) => io.observe(s));

  ecouter<MouseEvent>(document, 'click', (e) => {
    const el = elementDe(e);
    if (!el || masque(el)) return;
    const t = maintenant();
    const lien = el.closest('a[href]');
    if (lien instanceof HTMLAnchorElement && !lien.hash)
      r.sortie(lien.host === location.host ? 'navigation' : 'lien_externe', t);
    r.clic(
      t,
      e.pageX,
      e.pageY,
      doc.clientWidth,
      { cle: cle(el), cliquable: !!el.closest(CLIQUABLE), suivi: suiviDe(el) },
      e.detail > 0,
    );
    modifie = true;
  });
  ecouter<MouseEvent>(document, 'mousemove', (e) => {
    const el = elementDe(e);
    r.position(maintenant(), e.pageX, e.pageY, doc.clientWidth, () =>
      el && !masque(el) ? suiviDe(el) : undefined,
    );
    modifie = true;
  });
  ecouter<MouseEvent>(document, 'mouseover', (e) => {
    const el = elementDe(e);
    const suivi = el && !masque(el) ? suiviDe(el) : undefined;
    if (suivi === survol?.suivi) return;
    const t = maintenant();
    if (survol) r.survol(survol.suivi, t - survol.t);
    survol = suivi ? { suivi, t } : undefined;
  });
  ecouter<MouseEvent>(document, 'mouseout', (e) => {
    if (!e.relatedTarget && e.clientY <= 0) r.intention();
  });
  const defiler = () => {
    const t = maintenant();
    if (t - dernierDefilement < DEFILEMENT_MS) return;
    dernierDefilement = t;
    r.defilement(t, scrollY + innerHeight, doc.scrollHeight, scrollY);
    modifie = true;
  };
  ecouter(window, 'scroll', defiler);
  defiler();
  ecouter(document, 'focusin', (e) => {
    const el = elementDe(e);
    if (!el?.matches('input:not([type=hidden]),select,textarea') || masque(el)) return;
    const nom = nettoyer(
      el.getAttribute('data-ph') || el.getAttribute('name') || el.id || el.tagName,
    );
    champ = { nom, t: maintenant() };
  });
  ecouter(document, 'focusout', () => {
    if (champ) r.champ(champ.nom, maintenant() - champ.t);
    champ = undefined;
    modifie = true;
  });
  ecouter(
    document,
    'submit',
    signaler(() => r.formulaireEnvoye()),
  );
  ecouter<CustomEvent>(window, EVENEMENT_CONVERSION, (e) => {
    const objectif = OBJECTIFS.find((x) => x === e.detail);
    if (objectif) r.conversion(objectif);
    modifie = true;
  });
  ecouter(window, 'pagehide', envoyer);
  ecouter(document, 'visibilitychange', () => {
    if (document.hidden) envoyer();
    else for (const el of visibles.keys()) visibles.set(el, maintenant());
  });
  const secours = setTimeout(envoyer, SECOURS_MS);

  return (envoyerResume: boolean) => {
    clearTimeout(secours);
    io.disconnect();
    for (const [cible, type, f] of ecoutes) cible.removeEventListener(type, f, { capture: true });
    if (envoyerResume) return envoyer();
    // Consentement retiré : on efface aussi les repères de session posés par le traceur.
    try {
      sessionStorage.removeItem('ph:s');
      localStorage.removeItem('ph:v');
    } catch {
      /* stockage bloqué */
    }
  };
}
