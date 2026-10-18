import { z } from 'zod';
import { fr } from 'zod/locales';

// Messages de validation en français, partout (site, Functions). Importer `z` d'ici, jamais de « zod ».
z.config(fr());

export { z };
