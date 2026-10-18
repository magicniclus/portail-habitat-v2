# Photos des landings (emplacements à remplir)

Aucune image de banque : tant qu'un fichier manque, la landing affiche un fond `neutre-100` avec la légende de l'emplacement (composant `EmplacementPhoto`).

Format : **WebP**, qualité 80 environ, sans texte incrusté. Mettre le fichier ici avec exactement ce nom ; il est pris en compte au prochain build.

| Fichier                            | Taille      | Ratio    | Contenu attendu                                                                       |
| ---------------------------------- | ----------- | -------- | ------------------------------------------------------------------------------------- |
| `hero-chantiers.webp`              | 1600 × 1200 | 4:3      | Artisan qui consulte une demande sur son téléphone, sur chantier                      |
| `hero-site.webp`                   | 1600 × 1200 | 4:3      | Artisan devant sa camionnette ou une réalisation, téléphone en main montrant son site |
| `hero-devis.webp`                  | 1600 × 1200 | 4:3      | Artisan qui prépare un devis chez un client (tablette ou ordinateur)                  |
| `exemple-plombier-desktop.webp`    | 1280 × 800  | 16:10    | Site d'exemple d'un plombier, version ordinateur                                      |
| `exemple-plombier-mobile.webp`     | 390 × 844   | ≈ 9:19,5 | Même site, version téléphone                                                          |
| `exemple-couvreur-desktop.webp`    | 1280 × 800  | 16:10    | Site d'exemple d'un couvreur, ordinateur                                              |
| `exemple-couvreur-mobile.webp`     | 390 × 844   | ≈ 9:19,5 | Même site, téléphone                                                                  |
| `exemple-electricien-desktop.webp` | 1280 × 800  | 16:10    | Site d'exemple d'un électricien, ordinateur                                           |
| `exemple-electricien-mobile.webp`  | 390 × 844   | ≈ 9:19,5 | Même site, téléphone                                                                  |
| `exemple-peintre-desktop.webp`     | 1280 × 800  | 16:10    | Site d'exemple d'un peintre, ordinateur                                               |
| `exemple-peintre-mobile.webp`      | 390 × 844   | ≈ 9:19,5 | Même site, téléphone                                                                  |
| `exemple-macon-desktop.webp`       | 1280 × 800  | 16:10    | Site d'exemple d'un maçon, ordinateur                                                 |
| `exemple-macon-mobile.webp`        | 390 × 844   | ≈ 9:19,5 | Même site, téléphone                                                                  |
| `exemple-menuisier-desktop.webp`   | 1280 × 800  | 16:10    | Site d'exemple d'un menuisier, ordinateur                                             |
| `exemple-menuisier-mobile.webp`    | 390 × 844   | ≈ 9:19,5 | Même site, téléphone                                                                  |

Les **captures d'écran du produit** ne vont pas ici : elles sont produites par `pnpm captures` dans `../captures/` (voir `scripts/captures.ts`).

Les **photos des témoignages** ne vont pas ici non plus : elles se renseignent dans `config/preuveSociale.temoignages[].photo` (admin). Sans photo, l'avatar affiche les initiales sur une pastille de couleur.
