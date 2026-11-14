import type { ChampFormulaire } from '@ph/core/sites';
import type { ContexteRendu } from './elements';
import { esc } from './html';

const TYPES_HTML: Record<string, string> = { email: 'email', tel: 'tel', date: 'date', cp: 'text' };

/** Formulaire du site : champs de la configuration, anti-robot Turnstile, envoi sans rechargement. */
export function rendreFormulaire(
  bouton: string,
  ctx: ContexteRendu,
  base: string,
  mb: string,
  prefixe = 'f',
): string {
  const champ = (c: ChampFormulaire) => {
    const id = `${prefixe}-${esc(c.id)}`;
    const requis = c.requis ? ' required' : '';
    const etoile = c.requis ? ' <span aria-hidden="true">*</span>' : '';
    const label = `<label for="${id}">${esc(c.libelle)}${etoile}</label>`;
    if (c.type === 'zone')
      return `<p>${label}<textarea id="${id}" name="${esc(c.id)}" rows="4"${requis}></textarea></p>`;
    if ((c.type === 'liste' || c.type === 'choix') && c.options)
      return `<p>${label}<select id="${id}" name="${esc(c.id)}"${requis}><option value="">Choisir</option>${c.options.map((o) => `<option>${esc(o)}</option>`).join('')}</select></p>`;
    const extra =
      c.type === 'cp'
        ? ' inputmode="numeric" maxlength="5" pattern="\\d{5}"'
        : c.type === 'tel'
          ? ' autocomplete="tel"'
          : c.type === 'email'
            ? ' autocomplete="email"'
            : '';
    return `<p>${label}<input id="${id}" name="${esc(c.id)}" type="${TYPES_HTML[c.type] ?? 'text'}"${extra}${requis}></p>`;
  };
  const idForm = prefixe === 'f' ? 'formulaire' : `${prefixe}-formulaire`;
  return `<form id="${idForm}" class="${base} formulaire" style="${esc(mb)}" data-formulaire novalidate>${ctx.champs
    .filter((c) => c.type !== 'photos')
    .map(champ)
    .join(
      '',
    )}${ctx.turnstileSiteKey ? `<div class="cf-turnstile" data-sitekey="${esc(ctx.turnstileSiteKey)}" data-appearance="interaction-only"></div>` : ''}<p class="rgpd">Vos informations servent uniquement à vous recontacter au sujet de votre projet.</p><button type="submit" class="btn">${esc(bouton)}</button><p class="statut" role="status" aria-live="polite"></p></form>`;
}

/**
 * Fenêtre du formulaire (action « Formulaire » affichée en fenêtre) : une copie du formulaire du
 * site, ouverte par le script de la page ; feuille du bas sur mobile.
 */
export function fenetreFormulaire(ctx: ContexteRendu): string {
  return `<dialog class="fenetre" id="fenetre-formulaire" aria-labelledby="ff-titre"><div class="fen"><button type="button" class="ff-fermer" aria-label="Fermer" data-fermer-fenetre>×</button><h2 id="ff-titre">Votre demande de devis</h2>${rendreFormulaire('Envoyer ma demande', ctx, 'el', '', 'ff')}</div></dialog>`;
}
