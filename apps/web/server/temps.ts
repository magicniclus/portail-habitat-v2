import 'server-only';

/** Heure du serveur au rendu (hors des composants, qui doivent rester purs). */
export const maintenant = () => Date.now();
