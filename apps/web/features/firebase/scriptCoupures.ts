/**
 * À placer dans `<head>`, avant le code de Next.js : la connexion temps réel de Firestore est coupée
 * volontairement (écoute fermée, page quittée) et son transport rejette alors une promesse que le
 * SDK ne rattrape pas (« AbortError: signal is aborted without reason »). Next.js l'affichait comme
 * une erreur (fenêtre rouge en développement), et son écouteur ignore `preventDefault()` : celui-ci,
 * posé avant, arrête l'événement. Notre code n'interrompt jamais une requête sans raison (délais :
 * `TimeoutError`), toute autre erreur reste donc visible.
 */
export const SCRIPT_COUPURES_FIRESTORE =
  "try{addEventListener('unhandledrejection',function(e){var r=e.reason;if(r&&r.name==='AbortError'&&r.message==='signal is aborted without reason'){e.preventDefault();e.stopImmediatePropagation()}})}catch(e){}";
