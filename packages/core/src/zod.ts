import { z } from 'zod';
// Seule la langue française : `zod/locales` embarquerait les ~50 langues dans chaque page.
import fr from 'zod/v4/locales/fr.js';

// Messages de validation en français, partout (site, Functions). Importer `z` d'ici, jamais de « zod ».
z.config(fr());

export { z };
