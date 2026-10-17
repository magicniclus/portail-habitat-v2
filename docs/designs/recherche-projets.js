/* Portail Habitat — moteur de recherche de projets (maquette de référence).
   Données : intentions de projet + métiers + synonymes. En production : packages/core/recherche (même logique)
   et Typesense pour le classement (voir docs/RECHERCHE.md). */
(function () {
  // Métiers du bâtiment : id → nom, alias (recherche), famille, prestation estimable par défaut
  const METIERS = {};
  const M = (id, nom, famille, prestation, alias) => { METIERS[id] = { id, nom, famille, prestation, alias: alias ? alias.split("|") : [] }; };
  // Gros œuvre et structure
  M("macon", "Maçon", "gros-oeuvre", "maconnerie", "macon|maconnerie|entreprise de maconnerie|gros oeuvre|macon renovation");
  M("tailleur-pierre", "Tailleur de pierre", "gros-oeuvre", "pierre-marbre", "tailleur de pierre|pierre de taille|restauration pierre|marbrier|marbrerie|granit");
  M("terrassier", "Terrassier", "exterieur", "terrassement", "terrassier|terrassement|vrd|voirie|mini pelle|paveur|travaux publics");
  M("demolition", "Démolisseur", "gros-oeuvre", "demolition", "demolisseur|demolition|curage|debarras");
  M("amiante", "Désamianteur", "traitements", "desamiantage", "desamianteur|desamiantage|entreprise certifiee amiante|ss3|ss4");
  M("constructeur", "Constructeur de maisons", "gros-oeuvre", "maison-neuve", "constructeur|constructeur de maison|ccmi|maison individuelle|promoteur");
  M("extension-bois", "Constructeur ossature bois", "gros-oeuvre", "extension", "ossature bois|constructeur bois|maison bois|extension bois|mob");
  M("etudes", "Bureau d'études structure", "gros-oeuvre", "etude-structure", "bureau d'etudes|bet|ingenieur structure|calcul structure|etude beton|note de calcul|etude de sol|geotechnicien|g2");
  M("geometre", "Géomètre-expert", "gros-oeuvre", "bornage", "geometre|geometre expert|bornage|division parcellaire|plan topographique|releve topographique|mesurage");
  M("foreur", "Foreur / puisatier", "exterieur", "forage", "foreur|puisatier|forage|puits|forage eau|pompe immergee");
  M("cordiste", "Cordiste", "toiture", "travaux-hauteur", "cordiste|travaux en hauteur|acces difficile|travaux sur corde|echafaudeur|echafaudage|nacelle");
  // Toiture et façade
  M("couvreur", "Couvreur", "toiture", "toiture", "couvreur|couvreur zingueur|toiture|toit|couverture|tuiles|ardoises");
  M("zingueur", "Zingueur", "toiture", "gouttieres", "zingueur|zinguerie|zinc|gouttiere zinc|cheneau|noue|abergement");
  M("charpentier", "Charpentier", "toiture", "charpente", "charpentier|charpente|charpentier couvreur|ossature|poutres|charpente metallique");
  M("etancheur", "Étancheur", "toiture", "etancheite", "etancheur|etancheite|toit terrasse|membrane");
  M("facadier", "Façadier", "toiture", "ravalement", "facadier|ravaleur|ravalement|enduiseur|crepi|nettoyage facade");
  // Second œuvre intérieur
  M("plaquiste", "Plaquiste", "interieur", "cloison", "plaquiste|placo|plaques de platre|cloisons seches|jointeur|platrier plaquiste");
  M("platrier", "Plâtrier", "interieur", "platrerie", "platrier|platre|enduit platre|platre traditionnel|gobetis|lisseur");
  M("staffeur", "Staffeur stucateur", "interieur", "staff", "staffeur|staff|moulures|corniche|rosace|stuc|stucateur|gypserie");
  M("peintre", "Peintre en bâtiment", "deco", "peinture", "peintre|peintre en batiment|peintre decorateur|peinture|artisan peintre");
  M("tapissier", "Tapissier décorateur", "deco", "papier-peint", "tapissier|tapissier decorateur|papier peint|tenture|poseur de papier peint");
  M("decorateur", "Décorateur d'intérieur", "deco", "architecte", "decorateur|decoratrice|decoration interieure|home staging|conseil deco");
  M("carreleur", "Carreleur", "sols", "carrelage", "carreleur|carrelage|faience|mosaiste|mosaique|chapiste");
  M("solier", "Solier / parqueteur", "sols", "parquet", "solier|parqueteur|parquet|sols souples|moquettiste|poseur de sol|revetement de sol");
  M("poseur", "Poseur de revêtements", "sols", "sol-souple", "poseur|poseur de revetements|stratifie|vinyle|lino|resine");
  M("menuisier", "Menuisier", "menuiseries", "menuiserie", "menuisier|menuiserie|menuisier poseur|menuisier bois|menuisier pvc|menuisier alu|fenetres|portes");
  M("ebeniste", "Ébéniste agenceur", "interieur", "dressing", "ebeniste|agenceur|agencement|meubles sur mesure|dressing|placard|bibliotheque");
  M("cuisiniste", "Cuisiniste", "sdb-cuisine", "cuisine", "cuisiniste|cuisine|cuisine equipee|installateur cuisine");
  M("sdb", "Installateur de salle de bain", "sdb-cuisine", "sdb", "installateur salle de bain|salle de bain|bainiste|sdb");
  M("vitrier", "Vitrier miroitier", "menuiseries", "vitrerie", "vitrier|miroitier|vitrerie|vitre|miroir|verre");
  M("serrurier", "Serrurier", "menuiseries", "serrurerie", "serrurier|serrurerie|serrure|ouverture de porte|blindage");
  M("ferronnier", "Métallier ferronnier", "menuiseries", "garde-corps", "metallier|ferronnier|ferronnerie|serrurerie metallerie|fer forge|garde corps|verriere acier|escalier metal|soudeur");
  M("fermeture", "Storiste et fermetures", "menuiseries", "volets", "storiste|stores|volets|fermetures|volet roulant|motorisation volets|persiennes");
  // Fluides et énergie
  M("plombier", "Plombier", "plomberie", "plomberie", "plombier|plomberie|plombier chauffagiste|sanitaire|depannage plomberie");
  M("chauffagiste", "Chauffagiste", "chauffage", "chaudiere", "chauffagiste|chauffage|chaudiere|pompe a chaleur|installateur chauffage|thermicien chauffage");
  M("clim", "Frigoriste climaticien", "chauffage", "climatisation", "frigoriste|climaticien|climatisation|clim|froid|pompe a chaleur air air");
  M("ramoneur", "Ramoneur fumiste", "chauffage", "ramonage", "ramoneur|fumiste|ramonage|conduit|tubage");
  M("poelier", "Poêlier", "chauffage", "poele", "poelier|installateur poele|poele|insert|cheministe|cheminee");
  M("enr", "Installateur énergies renouvelables", "electricite", "panneaux-solaires", "installateur solaire|photovoltaique|energies renouvelables|enr|geothermicien|installateur geothermie|rge");
  M("electricien", "Électricien", "electricite", "elec", "electricien|electricite|electricien batiment|depannage electrique|installateur electrique");
  M("irve", "Installateur de bornes IRVE", "electricite", "borne-recharge", "irve|installateur borne|borne de recharge|wallbox");
  M("domotique", "Domoticien", "electricite", "domotique", "domoticien|domotique|integrateur|maison connectee|knx");
  M("antenne", "Antenniste et réseaux", "electricite", "antenne-reseau", "antenniste|antenne|parabole|installateur fibre|reseau informatique|cablage");
  M("isolation", "Spécialiste de l'isolation", "isolation", "isolation", "isolation|isolateur|applicateur isolation|entreprise isolation|rge isolation|souffleur");
  M("thermicien", "Thermicien / auditeur énergétique", "isolation", "audit-energetique", "thermicien|auditeur energetique|audit|bureau d'etudes thermiques|accompagnateur renov");
  M("assainissement", "Assainisseur", "exterieur", "assainissement", "assainissement|vidangeur|fosse septique|micro station|spanc");
  // Extérieur
  M("paysagiste", "Paysagiste", "exterieur", "jardin", "paysagiste|jardinier|jardin|espaces verts|entretien jardin|pepinieriste");
  M("elagueur", "Élagueur", "exterieur", "elagage", "elagueur|arboriste|grimpeur elagueur|abattage|elagage");
  M("piscinier", "Pisciniste", "exterieur", "piscine", "pisciniste|piscinier|piscine|spa|pool house");
  M("portail", "Portails, clôtures, automatismes", "exterieur", "portail", "portail|clotures|clotureur|automaticien|motorisation portail|portes de garage");
  M("veranda", "Vérandaliste", "gros-oeuvre", "veranda", "verandaliste|veranda|pergola|carport|jardin d'hiver");
  // Sécurité, accessibilité, traitements
  M("securite", "Installateur alarme et vidéo", "securite", "alarme", "alarme|installateur alarme|videosurveillance|telesurveillance|securite");
  M("ascenseur", "Accessibilité et monte-escalier", "securite", "monte-escalier", "ascensoriste|monte escalier|accessibilite|pmr|elevateur");
  M("diag", "Diagnostiqueur immobilier", "traitements", "diagnostic", "diagnostiqueur|diagnostic|diagnostics immobiliers|dpe|expert immobilier");
  M("humidite", "Traitement de l'humidité", "traitements", "humidite", "humidite|traitement humidite|assechement|cuvelage");
  M("nuisibles", "Traitement bois et nuisibles", "traitements", "traitement-bois", "desinsectiseur|deratiseur|termites|nuisibles|traitement bois|3d");
  // Conception et entreprises générales
  M("moe", "Architecte / maître d'œuvre", "gros-oeuvre", "architecte", "architecte|maitre d'oeuvre|moe|architecte d'interieur|economiste|conducteur de travaux|permis de construire");
  M("renovation", "Entreprise générale de rénovation", "interieur", "renovation-complete", "entreprise generale|entreprise de renovation|tous corps d'etat|tce|renovation|artisan renovation|entreprise batiment");
  M("multiservice", "Multiservice / homme toutes mains", "depannage", "petits-travaux", "multiservice|homme toutes mains|bricoleur|handyman|petits travaux|depannage");
  M("nettoyage", "Nettoyage après travaux", "depannage", "nettoyage-chantier", "nettoyage|entreprise de nettoyage|fin de chantier");


  // I(id, libellé affiché, métier, prestation du simulateur | null, popularité 1-5, mots-clés séparés par |)
  const L = [];
  const I = (id, l, m, p, pop, k) => L.push({ id, l, m, p, pop, k: k.split("|") });

  // ---------- Salle de bain ----------
  I("sdb-renovation", "Rénovation de salle de bain", "sdb", "sdb", 5, "renovation salle de bain|refaire salle de bain|refection salle de bain|salle de bain complete|sdb|salle d'eau|salle de douche|moderniser salle de bain|relooking salle de bain|transformation salle de bain|salle de bain cle en main|salle de bain neuve|travaux salle de bain|creation salle de bain");
  I("sdb-baignoire-douche", "Remplacer une baignoire par une douche", "sdb", "sdb", 5, "baignoire en douche|remplacer baignoire|transformer baignoire|baignoire douche|enlever baignoire|retirer baignoire|remplacement baignoire|senior douche|douche securisee");
  I("sdb-italienne", "Douche à l'italienne", "sdb", "sdb", 5, "douche italienne|douche a l'italienne|douche plain pied|douche de plain-pied|douche extra plate|receveur extra plat|douche sans seuil|douche walk in|walk-in|paroi de douche|receveur de douche|bac a douche|siphon de sol|caniveau de douche");
  I("sdb-pmr", "Salle de bain PMR / seniors", "sdb", "sdb", 4, "salle de bain pmr|salle de bain senior|adaptation salle de bain|salle de bain handicap|mobilite reduite|barre d'appui|siege de douche|maprimeadapt|ma prime adapt|autonomie|vieillissement|accessibilite salle de bain");
  I("sdb-meuble", "Pose de meuble vasque", "sdb", "sdb", 3, "meuble vasque|meuble salle de bain|double vasque|lavabo|vasque a poser|plan vasque|colonne salle de bain|miroir salle de bain|remplacer lavabo");
  I("sdb-baignoire", "Pose ou remplacement de baignoire", "sdb", "sdb", 3, "baignoire|baignoire ilot|baignoire balneo|balneotherapie|baignoire d'angle|baignoire a porte|tablier de baignoire|reemaillage baignoire|renover baignoire");
  I("sdb-wc", "Toilettes et WC suspendu", "plombier", "plomberie", 4, "wc|toilettes|toilette|wc suspendu|bati support|geberit|cuvette|chasse d'eau|abattant|wc lave-mains|lave mains|sanibroyeur|broyeur wc|wc japonais|remplacer wc|deplacer wc|creer des toilettes");

  // ---------- Cuisine ----------
  I("cuisine-renovation", "Rénovation de cuisine", "cuisiniste", "cuisine", 5, "renovation cuisine|refaire cuisine|nouvelle cuisine|cuisine equipee|cuisine amenagee|cuisine sur mesure|installer cuisine|pose cuisine|cuisine ouverte|ouvrir la cuisine|cuisine americaine|relooking cuisine|moderniser cuisine|cuisiniste");
  I("cuisine-pose", "Montage et pose de cuisine en kit", "cuisiniste", "cuisine", 4, "montage cuisine|pose cuisine ikea|cuisine en kit|monter cuisine|poseur cuisine|installer meubles cuisine|cuisine leroy merlin|cuisine castorama|cuisine brico depot");
  I("cuisine-plan", "Plan de travail et crédence", "cuisiniste", "cuisine", 3, "plan de travail|credence|plan de travail quartz|plan granit|plan stratifie|plan bois massif|dekton|ceramique plan|remplacer plan de travail|faience cuisine");
  I("cuisine-ilot", "Îlot central de cuisine", "cuisiniste", "cuisine", 3, "ilot central|ilot de cuisine|bar cuisine|table snack|ilot avec plaque");
  I("cuisine-relooking", "Relooking de cuisine (façades, peinture)", "peintre", "cuisine", 3, "repeindre cuisine|peindre meubles cuisine|changer facades cuisine|relooker cuisine|renover facades|poignees cuisine|covering cuisine|adhesif cuisine");
  I("cuisine-electromenager", "Branchement électroménager et hotte", "electricien", "elec", 2, "hotte|hotte aspirante|plaque induction|branchement four|lave-vaisselle|branchement lave vaisselle|raccordement electromenager|prise plaque de cuisson|ligne 32a");

  // ---------- Peinture et murs ----------
  I("peinture-interieure", "Peinture intérieure", "peintre", "peinture", 5, "peinture|peindre|repeindre|peinture interieure|peinture murs|peinture plafond|repeindre appartement|repeindre maison|peintre en batiment|coup de peinture|rafraichir|peinture piece|peinture chambre|peinture salon|peinture sejour|peinture couloir|peinture escalier|peinture cage d'escalier");
  I("peinture-boiseries", "Peinture des portes et boiseries", "peintre", "peinture", 3, "peinture porte|peindre portes|boiseries|plinthes|lasure interieure|vernis|peindre escalier bois|laquer|peinture radiateur");
  I("papier-peint", "Pose de papier peint", "peintre", "peinture", 4, "papier peint|tapisserie|poser papier peint|papier intisse|toile de verre|revetement mural|panoramique|decoller papier peint|retirer papier peint|enlever tapisserie");
  I("enduit", "Enduit et préparation des murs", "peintre", "peinture", 3, "enduit|ratisser|ratissage|lissage mur|reboucher|rebouchage|fissures murs|mur abime|preparer murs|bande a joint|enduit decoratif|beton cire|tadelakt|chaux|stuc");
  I("peinture-exterieure", "Peinture extérieure et volets", "peintre", null, 3, "peinture exterieure|peindre volets|peinture volets|repeindre volets|peinture portail|peinture garde corps|peinture boiserie exterieure|lasure exterieure|peinture menuiseries|peinture fer forge|peinture sous toiture|dessous de toit|debords de toit");
  I("facade-ravalement", "Ravalement de façade", "facadier", null, 5, "ravalement|ravalement facade|facade|nettoyage facade|renovation facade|crepi|crepissage|enduit facade|peinture facade|hydrofuge|demoussage facade|fissures facade|jointoiement|rejointoiement|pierre de taille|sablage|hydrogommage|facade maison");
  I("facade-ite", "Isolation thermique par l'extérieur (ITE)", "isolation", "isolation", 4, "ite|isolation exterieure|isolation par l'exterieur|isolation facade|isoler les murs par l'exterieur|bardage isolant|enduit sur isolant|polystyrene facade|laine de roche facade");

  // ---------- Sols ----------
  I("carrelage-sol", "Pose de carrelage au sol", "carreleur", "carrelage", 5, "carrelage|carreler|pose carrelage|carrelage sol|carreleur|grand format|carrelage imitation parquet|gres cerame|tomettes|carreaux ciment|mosaique|carrelage sejour|carrelage cuisine|refaire carrelage|remplacer carrelage");
  I("carrelage-mural", "Faïence et carrelage mural", "carreleur", "carrelage", 3, "faience|carrelage mural|carreler mur|zellige|metro|carrelage douche|credence carrelage|joints carrelage|refaire les joints");
  I("parquet", "Pose de parquet", "solier", null, 4, "parquet|pose parquet|parquet flottant|parquet massif|parquet contrecolle|parquet colle|parquet cloue|point de hongrie|chevrons|parqueteur");
  I("parquet-renovation", "Rénovation et vitrification de parquet", "solier", null, 4, "poncer parquet|poncage parquet|vitrifier parquet|vitrification|huiler parquet|renover parquet|parquet raye|restaurer parquet|lames abimees");
  I("sol-souple", "Sol vinyle, stratifié ou moquette", "poseur", null, 4, "stratifie|sol stratifie|vinyle|lvt|sol pvc|lino|linoleum|moquette|sol souple|lames clipsables|sol vinyle|jonc de mer|dalles vinyle|poser stratifie");
  I("chape", "Chape et ragréage", "macon", "carrelage", 3, "chape|ragreage|ragreer|mettre a niveau sol|sol pas droit|chape liquide|chape anhydrite|chape beton|dalle interieure");
  I("beton-cire", "Béton ciré et résine de sol", "poseur", null, 3, "beton cire|resine sol|sol resine|microciment|micro beton|epoxy|sol coule|beton decoratif|beton desactive");

  // ---------- Plâtrerie, cloisons, aménagement ----------
  I("cloison", "Création ou suppression de cloison", "plaquiste", null, 4, "cloison|monter une cloison|creer une piece|separer une piece|abattre cloison|supprimer cloison|casser cloison|placo|plaque de platre|ba13|cloison placo|cloison amovible|verriere|cloison vitree");
  I("verriere", "Pose de verrière d'intérieur", "ferronnier", null, 4, "verriere|verriere atelier|verriere interieure|verriere cuisine|cloison vitree|verriere style industriel|verriere acier|verriere alu");
  I("faux-plafond", "Faux plafond et plafond suspendu", "plaquiste", null, 3, "faux plafond|plafond suspendu|plafond placo|baisser plafond|plafond tendu|dalles plafond|plafond acoustique|spots encastres|plafond abime");
  I("mur-porteur", "Ouverture de mur porteur", "macon", null, 4, "mur porteur|ouvrir mur porteur|abattre mur porteur|casser mur porteur|ipn|poutre ipn|linteau|tremie|ouverture mur|agrandir ouverture|agrandir porte|creer une ouverture");
  I("dressing", "Dressing et placards sur mesure", "ebeniste", null, 4, "dressing|placard|placards sur mesure|dressing sur mesure|portes coulissantes|amenagement placard|rangement sous escalier|bibliotheque sur mesure|meuble sur mesure|agencement");
  I("escalier", "Escalier : création ou rénovation", "menuisier", null, 3, "escalier|escalier bois|escalier metal|escalier colimacon|escalier helicoidal|escalier quart tournant|renover escalier|habiller escalier|marches|rampe escalier|garde corps interieur|tremie escalier");
  I("combles-amenagement", "Aménagement des combles", "renovation", null, 4, "amenagement combles|amenager combles|amenager grenier|grenier|combles|creer chambre combles|surelevation|velux|fenetre de toit|combles amenageables|transformer combles|plancher combles");
  I("garage-transformation", "Transformer un garage en pièce", "renovation", null, 3, "transformer garage|garage en chambre|garage en piece de vie|amenager garage|changement de destination|garage en studio|reconvertir garage");
  I("renovation-complete", "Rénovation complète maison ou appartement", "renovation", null, 5, "renovation complete|renovation totale|renovation globale|renover maison|renover appartement|renovation appartement|renovation maison|tout refaire|travaux maison|maison a renover|appartement a renover|entreprise generale|tous corps d'etat|tce|cle en main|rehabilitation|renovation lourde");
  I("extension", "Extension de maison", "macon", null, 4, "extension|agrandissement|agrandir maison|extension bois|extension ossature bois|veranda|piece supplementaire|extension parpaing|agrandissement maison|surelevation maison|permis de construire extension");
  I("veranda", "Véranda et pergola", "menuisier", "menuiserie", 3, "veranda|pergola|pergola bioclimatique|jardin d'hiver|abri terrasse|carport|auvent|marquise|store banne|toit terrasse");
  I("maison-neuve", "Construction de maison", "moe", null, 3, "construction maison|construire maison|maison neuve|maison individuelle|constructeur|gros oeuvre|fondations|permis de construire|architecte|maitre d'oeuvre|maison ossature bois");
  I("architecte", "Architecte ou maître d'œuvre", "moe", null, 3, "architecte|architecte d'interieur|maitre d'oeuvre|moe|plans|dessiner plans|permis de construire|declaration prealable|suivi de chantier|decoratrice|decorateur|home staging|conception");

  // ---------- Plomberie ----------
  I("plomberie-fuite", "Recherche et réparation de fuite", "plombier", "plomberie", 5, "fuite|fuite d'eau|fuite eau|degat des eaux|recherche de fuite|tuyau perce|canalisation percee|robinet qui fuit|fuite sous evier|fuite wc|infiltration|compteur qui tourne|goutte|plombier urgence|urgence plomberie");
  I("plomberie-debouchage", "Débouchage de canalisation", "plombier", "plomberie", 4, "deboucher|debouchage|canalisation bouchee|evier bouche|wc bouche|toilettes bouchees|douche bouchee|evacuation|curage|hydrocurage|camera canalisation|odeur egout|remontee odeur");
  I("plomberie-refection", "Réfection de la plomberie", "plombier", "plomberie", 3, "refaire plomberie|plomberie complete|tuyauterie|canalisations|remplacer tuyaux|tuyaux plomb|cuivre|per|multicouche|alimentation eau|evacuations|colonne d'eau|plomberie maison");
  I("chauffe-eau", "Chauffe-eau et ballon d'eau chaude", "plombier", "plomberie", 5, "chauffe eau|chauffe-eau|ballon eau chaude|cumulus|ballon|remplacer chauffe eau|chauffe eau electrique|plus d'eau chaude|pas d'eau chaude|groupe de securite|chauffe eau gaz|chauffe-bain|ballon 200 litres");
  I("chauffe-eau-thermo", "Chauffe-eau thermodynamique ou solaire", "enr", "plomberie", 3, "chauffe eau thermodynamique|ballon thermodynamique|cesi|chauffe eau solaire|solaire thermique|eau chaude solaire");
  I("adoucisseur", "Adoucisseur et traitement de l'eau", "plombier", "plomberie", 2, "adoucisseur|calcaire|eau dure|osmoseur|filtre eau|traitement eau|anti calcaire|purificateur eau");
  I("robinetterie", "Robinetterie et mitigeur", "plombier", "plomberie", 3, "robinet|mitigeur|mitigeur thermostatique|colonne de douche|robinetterie|changer robinet|remplacer mitigeur|douchette|pommeau");
  I("recuperation-eau", "Récupération d'eau de pluie", "plombier", null, 2, "recuperateur eau de pluie|cuve eau de pluie|recuperation eau pluviale|citerne|arrosage eau de pluie");

  // ---------- Chauffage ----------
  I("pac-air-eau", "Pompe à chaleur air-eau", "chauffagiste", null, 5, "pompe a chaleur|pac|pac air eau|pompe a chaleur air eau|remplacer chaudiere par pompe a chaleur|pac hybride|daikin|atlantic|mitsubishi|aide pompe a chaleur|maprimerenov pompe a chaleur|coup de pouce chauffage");
  I("pac-air-air", "Pompe à chaleur air-air (réversible)", "clim", null, 4, "pac air air|pompe a chaleur air air|clim reversible|climatisation reversible|split|multisplit|gainable|unite exterieure");
  I("chaudiere", "Chaudière : installation ou remplacement", "chauffagiste", null, 5, "chaudiere|remplacer chaudiere|changer chaudiere|chaudiere gaz|chaudiere condensation|chaudiere a condensation|chaudiere fioul|remplacement chaudiere fioul|chaudiere murale|chaudiere au sol|chaudiere en panne|panne chaudiere|chaudiere granules|chaudiere a granules|chaudiere bois|chaudiere biomasse");
  I("chaudiere-entretien", "Entretien de chaudière", "chauffagiste", null, 4, "entretien chaudiere|entretien annuel|revision chaudiere|contrat entretien|attestation entretien|ramonage chaudiere|entretien pompe a chaleur|entretien pac|entretien clim");
  I("poele", "Poêle à bois ou à granulés", "ramoneur", null, 5, "poele|poele a bois|poele a granules|poele a pellets|pellets|granules|installer poele|poele mixte|poele de masse|conduit poele|tubage|flamme verte");
  I("cheminee", "Cheminée et insert", "ramoneur", null, 3, "cheminee|insert|foyer ferme|recuperateur de chaleur|cheminee ethanol|cheminee bioethanol|habillage cheminee|condamner cheminee|boucher cheminee|cheminee qui fume");
  I("ramonage", "Ramonage", "ramoneur", null, 4, "ramonage|ramoner|ramoneur|certificat de ramonage|conduit de cheminee|debistrage|hérisson|nettoyage conduit");
  I("radiateurs", "Radiateurs et chauffage électrique", "electricien", "elec", 4, "radiateur|radiateurs|radiateur electrique|remplacer radiateurs|radiateur inertie|radiateur chaleur douce|seche serviette|seche-serviettes|convecteur|grille pain|chauffage electrique|thermostat|programmateur|fil pilote");
  I("plancher-chauffant", "Plancher chauffant", "chauffagiste", null, 3, "plancher chauffant|sol chauffant|chauffage au sol|plancher rafraichissant|plancher chauffant basse temperature|desembouage plancher");
  I("chauffage-central", "Chauffage central et désembouage", "chauffagiste", null, 3, "chauffage central|radiateurs eau|circuit chauffage|desembouage|purger radiateurs|equilibrage|robinets thermostatiques|vase d'expansion|circulateur|radiateur froid|chauffage ne marche plus");
  I("geothermie", "Géothermie", "enr", null, 2, "geothermie|pac geothermique|pompe a chaleur geothermique|forage geothermique|captage horizontal|sonde geothermique");

  // ---------- Climatisation, ventilation, air ----------
  I("climatisation", "Climatisation", "clim", null, 5, "climatisation|clim|climatiseur|installer clim|pose clim|climatisation maison|climatisation appartement|climatisation chambre|clim mobile|clim split|rafraichir maison|canicule|chaleur ete");
  I("vmc", "VMC et ventilation", "electricien", "elec", 4, "vmc|ventilation|vmc simple flux|vmc double flux|vmc hygroreglable|extracteur|aeration|humidite ventilation|condensation|moisissures|bouches vmc|entretien vmc|vmi|ventilation insufflation");
  I("purificateur", "Qualité de l'air et déshumidification", "humidite", null, 2, "deshumidificateur|qualite air|radon|purificateur air|air sec|air humide|ventilation naturelle");

  // ---------- Électricité ----------
  I("elec-renovation", "Rénovation électrique", "electricien", "elec", 5, "electricite|electricien|refaire electricite|renovation electrique|installation electrique|mise aux normes|mise en conformite|norme nf c 15-100|nfc 15-100|consuel|electricite maison|electricite appartement|refaire le circuit|recablage|installation vetuste");
  I("tableau-electrique", "Tableau électrique", "electricien", "elec", 4, "tableau electrique|remplacer tableau|disjoncteur|differentiel|interrupteur differentiel|coupe circuit|fusibles|disjoncte|ca saute|compteur electrique|linky|augmenter puissance|triphase|monophase");
  I("elec-prises", "Ajout de prises et points lumineux", "electricien", "elec", 4, "prise|prises|ajouter prise|deplacer prise|interrupteur|point lumineux|luminaire|lustre|spots|spot led|eclairage|va et vient|goulotte|prise rj45|prise usb|installer lampe");
  I("elec-panne", "Dépannage électrique", "electricien", "elec", 4, "panne electrique|plus de courant|court circuit|depannage electricien|electricien urgence|prise qui chauffe|odeur de brule|disjoncteur saute");
  I("borne-recharge", "Borne de recharge voiture électrique", "electricien", "elec", 4, "borne de recharge|wallbox|recharge voiture electrique|prise renforcee|green up|irve|borne vehicule electrique|recharge tesla|borne copropriete");
  I("panneaux-solaires", "Panneaux solaires photovoltaïques", "enr", null, 5, "panneaux solaires|panneau solaire|photovoltaique|solaire|autoconsommation|installation solaire|revente electricite|edf oa|micro onduleur|batterie solaire|kit solaire|tuiles solaires");
  I("domotique", "Domotique et maison connectée", "domotique", "elec", 2, "domotique|maison connectee|volets connectes|thermostat connecte|netatmo|somfy|home assistant|knx|eclairage connecte|pilotage a distance");
  I("eclairage-exterieur", "Éclairage extérieur", "electricien", "elec", 2, "eclairage exterieur|eclairage jardin|spot exterieur|detecteur de presence|eclairage terrasse|borne lumineuse|eclairage allee");
  I("antenne", "Antenne TV et parabole", "antenne", null, 2, "antenne|antenne tv|parabole|tnt|antenniste|reception tele|fibre optique|raccordement fibre|cablage reseau|reseau ethernet");

  // ---------- Isolation, énergie ----------
  I("isolation-combles", "Isolation des combles", "isolation", "isolation", 5, "isolation combles|isoler combles|combles perdus|laine soufflee|isolation grenier|ouate de cellulose|isolation toiture interieure|isolation sous rampants|rampants|isolation plancher grenier|laine de verre combles");
  I("isolation-murs", "Isolation des murs par l'intérieur", "isolation", "isolation", 4, "isolation murs|isoler murs|isolation interieure|iti|doublage|doublage isolant|placo isolant|isolation mur froid|mur humide isolation|isolation phonique|isolation acoustique|insonorisation|bruit voisins");
  I("isolation-sol", "Isolation du sol et du vide sanitaire", "isolation", "isolation", 3, "isolation sol|isolation plancher bas|vide sanitaire|isolation garage|isolation sous-sol|isolation cave|flocage|plafond garage");
  I("renovation-energetique", "Rénovation énergétique globale", "renovation", "isolation", 4, "renovation energetique|maprimerenov|ma prime renov|prime energie|cee|mon accompagnateur renov|accompagnateur renov|audit energetique|passoire thermique|dpe f|dpe g|gagner des classes|economies d'energie|facture chauffage|bbc|rge");
  I("audit-energetique", "Audit énergétique", "diag", null, 3, "audit energetique|audit energie|bilan thermique|thermographie|camera thermique|test d'infiltrometrie|etancheite a l'air");

  // ---------- Menuiseries, fermetures ----------
  I("fenetres", "Remplacement de fenêtres", "menuisier", "menuiserie", 5, "fenetre|fenetres|remplacer fenetres|changer fenetres|double vitrage|triple vitrage|fenetre pvc|fenetre alu|fenetre bois|fenetre mixte|baie vitree|porte fenetre|menuiseries|renovation fenetres|pose en renovation|fenetres simple vitrage|chassis");
  I("baie-vitree", "Baie vitrée et coulissant", "menuisier", "menuiserie", 4, "baie vitree|coulissant|galandage|baie coulissante|agrandir baie|ouverture baie|porte fenetre coulissante|baie alu");
  I("porte-entree", "Porte d'entrée", "menuisier", "menuiserie", 4, "porte d'entree|porte entree|changer porte d'entree|porte blindee|porte securisee|porte alu|porte pvc|porte bois|bloc porte|porte palière|porte paliere");
  I("portes-interieures", "Portes intérieures", "menuisier", null, 3, "porte interieure|portes interieures|bloc porte|porte coulissante|porte a galandage|changer portes|porte vitree|porte atelier|remplacer portes");
  I("volets", "Volets roulants et battants", "fermeture", "menuiserie", 4, "volet|volets|volet roulant|volets roulants|motoriser volets|motorisation volet|volet battant|volet electrique|volet solaire|volet bloque|reparer volet|sangle volet|persiennes|brise soleil");
  I("store", "Store banne et protection solaire", "fermeture", null, 3, "store|store banne|store exterieur|brise soleil orientable|bso|store interieur|voilage|toile store|store coffre|moustiquaire");
  I("velux", "Fenêtre de toit (Velux)", "couvreur", "toiture", 3, "velux|fenetre de toit|lucarne|chien assis|puits de lumiere|tabatiere|remplacer velux|store velux");
  I("vitrerie", "Vitrerie et remplacement de vitre", "vitrier", null, 3, "vitre cassee|vitrier|remplacer vitre|double vitrage casse|miroir|verre securit|vitrage|buee double vitrage|vitrine|film solaire");
  I("serrurerie", "Serrurerie et ouverture de porte", "serrurier", null, 4, "serrurier|serrure|changer serrure|porte claquee|cle perdue|ouverture de porte|cylindre|barillet|serrure 3 points|serrure multipoints|porte bloquee|blindage porte|serrurier urgence");
  I("garde-corps", "Garde-corps et rampe", "ferronnier", null, 2, "garde corps|garde-corps|rampe|balustrade|garde corps verre|main courante|garde corps inox|balcon|ferronnerie|fer forge|metallerie");

  // ---------- Toiture ----------
  I("toiture-renovation", "Rénovation de toiture", "couvreur", "toiture", 5, "toiture|toit|couverture|refaire toiture|renovation toiture|refection toiture|changer tuiles|tuiles|ardoise|zinc|bac acier|couvreur|toiture maison|charpente toiture|remaniage|tuiles cassees|toit qui fuit");
  I("toiture-fuite", "Fuite de toiture et réparation", "couvreur", "toiture", 4, "fuite toiture|fuite toit|infiltration toiture|toit qui fuit|tuile deplacee|reparer toit|tempete|degat tempete|bache toit|urgence couvreur");
  I("toiture-demoussage", "Démoussage et traitement de toiture", "couvreur", "toiture", 4, "demoussage|demousser|nettoyage toiture|nettoyer toit|mousse toit|hydrofuge toiture|traitement toiture|anti mousse|lichen");
  I("gouttieres", "Gouttières et descentes", "couvreur", "toiture", 3, "gouttiere|gouttieres|cheneau|descente eaux pluviales|zinguerie|nettoyer gouttieres|gouttiere alu|gouttiere pvc|gouttiere zinc|habillage bandeau|planche de rive|sous face");
  I("charpente", "Charpente : réparation ou création", "charpentier", "toiture", 3, "charpente|charpentier|poutre|chevrons|pannes|traitement charpente|capricornes|charpente abimee|renforcer charpente|ossature bois|lamelle colle");
  I("toit-terrasse", "Étanchéité de toit-terrasse", "etancheur", null, 3, "toit terrasse|toiture terrasse|etancheite|etancheite toiture|membrane epdm|bitume|toit plat|infiltration terrasse|etancheite balcon|resine etancheite|vegetalisation toiture");

  // ---------- Maçonnerie, gros œuvre ----------
  I("maconnerie", "Travaux de maçonnerie", "macon", null, 4, "maconnerie|macon|mur|muret|parpaing|brique|pierre|dalle beton|beton|coffrage|fondations|reprise en sous-oeuvre|fissure|fissures|micropieux|agglo|mur de soutenement");
  I("fissures", "Fissures et désordres structurels", "macon", null, 3, "fissure|fissures|lezarde|mur fissure|fissure facade|secheresse|retrait gonflement|argile|agrafage|tassement|reprise en sous oeuvre|expertise fissure");
  I("demolition", "Démolition et évacuation", "demolition", null, 3, "demolition|demolir|casser|evacuation gravats|benne|curage|desencombrement|vider maison|debarras|abattre|deconstruction");
  I("desamiantage", "Désamiantage", "amiante", null, 2, "amiante|desamiantage|fibrociment|dalles amiante|retrait amiante|plaques eternit|eternit|toiture amiante|confinement");
  I("humidite", "Humidité, remontées capillaires, salpêtre", "humidite", null, 4, "humidite|mur humide|remontees capillaires|salpetre|moisissures|traces noires|condensation|injection resine|drainage|cuvelage|cave humide|infiltration mur|sous sol humide|traitement humidite");
  I("drainage", "Drainage et cuvelage", "terrassier", null, 2, "drainage|drain|cuvelage|sous sol inonde|eau dans la cave|pompe de relevage|puisard");
  I("assainissement", "Assainissement et fosse septique", "assainissement", null, 3, "fosse septique|assainissement|micro station|spanc|vidange fosse|raccordement tout a l'egout|tout a l'egout|epandage|filtre a sable|assainissement non collectif|eaux usees|regard");

  // ---------- Extérieur ----------
  I("terrasse-bois", "Terrasse en bois ou composite", "paysagiste", null, 4, "terrasse|terrasse bois|terrasse composite|deck|platelage|lambourdes|terrasse sur plots|terrasse pin|ipe|cumaru|terrasse suspendue|renover terrasse bois|degrisage");
  I("terrasse-dalle", "Terrasse en dalles ou carrelage", "macon", "carrelage", 3, "terrasse carrelage|dalle terrasse|terrasse beton|dalles sur plots|carrelage exterieur|pierre naturelle terrasse|travertin|terrasse pierre");
  I("allee", "Allée, cour et pavage", "terrassier", null, 3, "allee|allee garage|pavage|paves|enrobe|bitume|gravier|gravillons|beton desactive|stabilisateur gravier|cour|parking|acces garage|bordures");
  I("cloture", "Clôture et portillon", "portail", null, 4, "cloture|clotures|grillage|panneaux rigides|cloture bois|brise vue|mur de cloture|palissade|portillon|haie|cloture alu|cloture composite|gabion");
  I("portail", "Portail et motorisation", "portail", null, 4, "portail|portail coulissant|portail battant|motorisation portail|motoriser portail|portail alu|portail electrique|interphone|visiophone|digicode|porte de garage");
  I("porte-garage", "Porte de garage", "fermeture", "menuiserie", 3, "porte de garage|porte garage sectionnelle|porte basculante|motoriser porte garage|porte enroulable|porte garage electrique");
  I("jardin", "Aménagement de jardin et paysagisme", "paysagiste", null, 4, "jardin|paysagiste|amenagement jardin|creation jardin|gazon|pelouse|engazonnement|gazon synthetique|massif|plantations|arrosage automatique|entretien jardin|elagage|abattage arbre|taille haie|dessouchage|potager");
  I("elagage", "Élagage et abattage d'arbres", "paysagiste", null, 3, "elagage|elaguer|abattage|abattre arbre|couper arbre|dessouchage|arboriste|taille arbre|grimpeur elagueur");
  I("piscine", "Piscine : construction ou rénovation", "piscinier", null, 4, "piscine|construire piscine|piscine coque|piscine beton|piscine enterree|piscine hors sol|renover piscine|liner|changer liner|pompe piscine|filtration piscine|abri piscine|volet piscine|pool house|spa|jacuzzi|bassin");
  I("terrassement", "Terrassement et viabilisation", "terrassier", null, 3, "terrassement|terrasser|decaissement|niveler terrain|viabilisation|tranchee|raccordement reseaux|evacuation terre|mini pelle|nivellement|enrochement");
  I("abri-jardin", "Abri de jardin, carport, garage", "charpentier", null, 3, "abri de jardin|cabane|abri bois|carport|garage bois|pool house|atelier jardin|bureau de jardin|studio de jardin|chalet");

  // ---------- Sécurité, accessibilité ----------
  I("alarme", "Alarme et vidéosurveillance", "securite", "elec", 3, "alarme|alarme maison|videosurveillance|camera|camera exterieure|telesurveillance|detecteur intrusion|cambriolage|securiser maison|interphone video");
  I("monte-escalier", "Monte-escalier et accessibilité", "ascenseur", null, 2, "monte escalier|monte-escalier|siege monte escalier|ascenseur privatif|elevateur|rampe d'acces|pmr|accessibilite|maintien a domicile|adapter logement|maprimeadapt");
  I("detecteur-fumee", "Détecteurs de fumée et CO", "electricien", "elec", 1, "detecteur de fumee|daaf|detecteur monoxyde|detecteur co|detecteur incendie");

  // ---------- Traitements ----------
  I("termites", "Traitement termites et insectes du bois", "nuisibles", null, 3, "termites|traitement termites|insectes xylophages|capricorne|vrillette|merule|champignon bois|traitement bois|traitement charpente");
  I("nuisibles", "Nuisibles : rats, frelons, punaises", "nuisibles", null, 2, "rats|souris|frelons|nid de frelons|guepes|punaises de lit|cafards|blattes|deratisation|desinsectisation|pigeons|chenilles processionnaires");

  // ---------- Diagnostics ----------
  I("diagnostics-vente", "Diagnostics immobiliers pour une vente", "diag", null, 4, "diagnostic immobilier|diagnostics vente|diagnostic vente|dossier diagnostic technique|ddt|diagnostiqueur|vendre maison|vendre appartement|compromis|diagnostics obligatoires");
  I("dpe", "DPE (diagnostic de performance énergétique)", "diag", null, 5, "dpe|diagnostic de performance energetique|etiquette energie|classe energie|dpe location|refaire dpe|dpe opposable|dpe collectif");
  I("diagnostics-location", "Diagnostics pour une location", "diag", null, 3, "diagnostics location|diagnostic location|mettre en location|louer appartement|bail|loi boutin|surface habitable|decence");
  I("diag-amiante", "Diagnostic amiante", "diag", null, 3, "diagnostic amiante|reperage amiante|amiante avant travaux|rat|amiante avant demolition|dta");
  I("diag-plomb", "Diagnostic plomb (CREP)", "diag", null, 2, "diagnostic plomb|crep|plomb peinture|constat risque exposition plomb");
  I("diag-carrez", "Mesurage loi Carrez", "diag", null, 2, "loi carrez|carrez|mesurage|metrage|surface carrez|superficie privative");
  I("diag-elec-gaz", "Diagnostic électricité et gaz", "diag", null, 2, "diagnostic electricite|diagnostic electrique|diagnostic gaz|etat installation gaz|etat installation electrique");
  I("diag-termites", "Diagnostic termites", "diag", null, 2, "diagnostic termites|etat parasitaire|etat termites");
  I("diag-assainissement", "Contrôle d'assainissement", "diag", null, 2, "controle assainissement|diagnostic assainissement|spanc controle|conformite assainissement");

  // ---------- Petits travaux, entretien ----------
  I("petits-travaux", "Petits travaux et bricolage", "renovation", null, 3, "petits travaux|bricolage|homme toutes mains|multiservice|poser etageres|fixer tv|montage meubles|accrocher tableaux|petites reparations|reparations diverses|depannage maison");
  I("nettoyage-fin-chantier", "Nettoyage de fin de chantier", "renovation", null, 1, "nettoyage fin de chantier|nettoyage apres travaux|nettoyage chantier");
  I("sinistre", "Remise en état après sinistre", "renovation", null, 2, "sinistre|degat des eaux reparation|apres incendie|inondation|remise en etat|expertise assurance|degats|dommage");


  // ---------- Métiers spécialisés ----------
  I("pierre-marbre", "Pierre de taille, marbre et granit", "tailleur-pierre", "pierre-marbre", 2, "pierre de taille|restauration pierre|rejointoiement pierre|marbre|plan marbre|granit|travertin|escalier pierre|cheminee pierre|appui pierre|seuil pierre|linteau pierre");
  I("staff", "Moulures, corniches et staff", "staffeur", "staff", 2, "moulures|corniche|rosace|staff|stuc|restauration moulures|plafond moulure|faux plafond staff|gorge lumineuse");
  I("platrerie", "Plâtrerie et enduit plâtre traditionnel", "platrier", "platrerie", 2, "platre|enduit platre|platre traditionnel|refaire platre|mur en platre|plafond platre|lissage platre|plafond fissure");
  I("bornage", "Bornage et relevé de géomètre", "geometre", "bornage", 2, "bornage|geometre|borne terrain|limite de propriete|division parcellaire|plan topographique|releve de terrain|voisin limite");
  I("etude-structure", "Étude de structure et étude de sol", "etudes", "etude-structure", 2, "etude structure|note de calcul|bureau d'etudes|ingenieur structure|etude de sol|g2|g1|geotechnique|calcul poutre|mur porteur etude");
  I("travaux-hauteur", "Travaux en hauteur et accès difficile", "cordiste", "travaux-hauteur", 2, "travaux en hauteur|cordiste|nacelle|echafaudage|acces difficile|facade haute|nettoyage vitres hauteur|filet|purge facade");
  I("forage", "Forage et puits", "foreur", "forage", 2, "forage|puits|forage eau|creuser puits|pompe puits|puits arrosage|forage domestique");
  I("zinguerie", "Zinguerie et habillages zinc", "zingueur", "gouttieres", 2, "zinguerie|zinc|noue|abergement|faitage zinc|couvertine|habillage zinc|chéneau zinc");
  I("home-staging", "Décoration et home staging", "decorateur", "architecte", 2, "home staging|decoration interieure|decorateur|conseil decoration|relooking interieur|choix couleurs|plan 3d decoration");
  I("constructeur-bois", "Maison ou extension en ossature bois", "extension-bois", "extension", 2, "ossature bois|maison bois|extension ossature bois|mob|construction bois|bardage bois");

  // ---------- Synonymes et abréviations (développés avant la recherche) ----------
  const SYN = {
    sdb: "salle bain", sde: "salle eau", wc: "toilette", pac: "pompe chaleur", clim: "climatisation", clime: "climatisation",
    elec: "electricite", elect: "electricite", reno: "renovation", renov: "renovation", appart: "appartement", apart: "appartement",
    appt: "appartement", maisson: "maison", placo: "placo plaque platre", ba13: "placo", vmc: "vmc ventilation",
    ite: "isolation exterieure", iti: "isolation interieure", dpe: "dpe diagnostic", pv: "photovoltaique", photovoltaique: "panneaux solaires photovoltaique",
    velux: "velux fenetre toit", pmr: "pmr accessibilite", ipn: "ipn mur porteur", cumulus: "chauffe eau cumulus", ballon: "ballon chauffe eau",
    tele: "tv", television: "tv", douche: "douche", italienne: "italienne", carlage: "carrelage", carelage: "carrelage", carrellage: "carrelage",
    peinturer: "peinture", paint: "peinture", repeint: "peinture", renovation: "renovation", refaire: "renovation", refection: "renovation",
    changer: "remplacer", remplacement: "remplacer", installation: "installer", pose: "installer", poser: "installer", mettre: "installer",
    isoler: "isolation", chauffer: "chauffage", deboucher: "debouchage", fuit: "fuite", fuir: "fuite", fuite: "fuite",
    ravaler: "ravalement", toiture: "toiture toit", toit: "toiture toit", maprimerenov: "maprimerenov aide", aide: "aide maprimerenov",
    gazon: "gazon pelouse", pelouse: "gazon pelouse", cuisine: "cuisine", sol: "sol", plancher: "plancher sol",
  };
  const STOP = new Set("le la les l un une des de du d au aux a en et ou pour par sur sous avec sans chez dans mon ma mes ton ta tes son sa ses notre nos votre vos leur leurs ce cet cette ces je j me m nous vous il elle on veux voudrais souhaite souhaiterais besoin faire fais faut cherche recherche trouver quel quelle quels quelles combien prix cout coute tarif devis estimation urgent urgence svp".split(" "));
  const URGENCE = /\b(urgence|urgent|vite|rapidement|aujourd'hui|ce soir|de suite|tout de suite|degat)\b/i;

  const norm = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/œ/g, "oe").replace(/æ/g, "ae")
    .replace(/['’`]/g, " ").replace(/[^a-z0-9]+/g, " ").trim();
  const stem = (w) => (w.length > 4 && /(aux)$/.test(w) ? w.slice(0, -3) + "al" : w.length > 3 && /[sx]$/.test(w) ? w.slice(0, -1) : w);
  const tokens = (s, keepStop) => norm(s).split(" ").filter((w) => w && (keepStop || !STOP.has(w))).map(stem);
  const variantes = (t) => [t].concat(SYN[t] ? SYN[t].split(" ").map(stem) : []); // un mot de la requête = lui-même + ses synonymes

  function dl(a, b, max) { // Damerau-Levenshtein borné
    if (Math.abs(a.length - b.length) > max) return max + 1;
    const d = []; for (let i = 0; i <= a.length; i++) { d[i] = [i]; }
    for (let j = 0; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) { let best = 99;
      for (let j = 1; j <= b.length; j++) {
        const c = a[i - 1] === b[j - 1] ? 0 : 1;
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
        if (d[i][j] < best) best = d[i][j];
      }
      if (best > max) return max + 1;
    }
    return d[a.length][b.length];
  }

  // index
  const PRESTA = {"sdb-renovation":"sdb","sdb-baignoire-douche":"sdb-douche","sdb-italienne":"sdb-douche","sdb-pmr":"sdb-pmr","sdb-meuble":"sdb","sdb-baignoire":"sdb","sdb-wc":"wc","cuisine-renovation":"cuisine","cuisine-pose":"cuisine-pose","cuisine-plan":"cuisine-plan","cuisine-ilot":"cuisine","cuisine-relooking":"cuisine-relooking","cuisine-electromenager":"prises-eclairage","peinture-interieure":"peinture","peinture-boiseries":"peinture","papier-peint":"papier-peint","enduit":"enduit-deco","peinture-exterieure":"peinture-ext","facade-ravalement":"ravalement","facade-ite":"isolation-ite","carrelage-sol":"carrelage","carrelage-mural":"carrelage","parquet":"parquet","parquet-renovation":"parquet-renov","sol-souple":"sol-souple","chape":"chape","beton-cire":"beton-cire-sol","cloison":"cloison","verriere":"verriere","faux-plafond":"faux-plafond","mur-porteur":"mur-porteur","dressing":"dressing","escalier":"escalier","combles-amenagement":"combles-amenagement","garage-transformation":"garage-transformation","renovation-complete":"renovation-complete","extension":"extension","veranda":"veranda","maison-neuve":"maison-neuve","architecte":"architecte","plomberie-fuite":"fuite","plomberie-debouchage":"debouchage","plomberie-refection":"plomberie","chauffe-eau":"chauffe-eau","chauffe-eau-thermo":"chauffe-eau","adoucisseur":"adoucisseur","robinetterie":"robinetterie","recuperation-eau":"recuperation-eau","pac-air-eau":"pac-air-eau","pac-air-air":"climatisation","chaudiere":"chaudiere","chaudiere-entretien":"entretien-chauffage","poele":"poele","cheminee":"cheminee","ramonage":"ramonage","radiateurs":"chauffage-electrique","plancher-chauffant":"plancher-chauffant","chauffage-central":"desembouage","geothermie":"geothermie","climatisation":"climatisation","vmc":"vmc","purificateur":"humidite","elec-renovation":"elec","tableau-electrique":"tableau-electrique","elec-prises":"prises-eclairage","elec-panne":"depannage-elec","borne-recharge":"borne-recharge","panneaux-solaires":"panneaux-solaires","domotique":"domotique","eclairage-exterieur":"eclairage-ext","antenne":"antenne-reseau","isolation-combles":"isolation","isolation-murs":"isolation","isolation-sol":"isolation-sol","renovation-energetique":"isolation","audit-energetique":"audit-energetique","fenetres":"menuiserie","baie-vitree":"menuiserie","porte-entree":"porte-entree","portes-interieures":"portes-interieures","volets":"volets","store":"store","velux":"fenetre-toit","vitrerie":"vitrerie","serrurerie":"serrurerie","garde-corps":"garde-corps","toiture-renovation":"toiture","toiture-fuite":"toiture-reparation","toiture-demoussage":"demoussage","gouttieres":"gouttieres","charpente":"charpente","toit-terrasse":"etancheite","maconnerie":"maconnerie","fissures":"fissures","demolition":"demolition","desamiantage":"desamiantage","humidite":"humidite","drainage":"drainage","assainissement":"assainissement","terrasse-bois":"terrasse","terrasse-dalle":"terrasse","allee":"allee","cloture":"cloture","portail":"portail","porte-garage":"porte-garage","jardin":"jardin","elagage":"elagage","piscine":"piscine","terrassement":"terrassement","abri-jardin":"abri-jardin","alarme":"alarme","monte-escalier":"monte-escalier","detecteur-fumee":"detecteurs","termites":"traitement-bois","nuisibles":"nuisibles","petits-travaux":"petits-travaux","nettoyage-fin-chantier":"nettoyage-chantier","sinistre":"remise-en-etat"};
  const REMETIER = {"gouttieres":"zingueur","elagage":"elagueur","poele":"poelier","cheminee":"poelier","borne-recharge":"irve","audit-energetique":"thermicien","petits-travaux":"multiservice","nettoyage-fin-chantier":"nettoyage","veranda":"veranda","maison-neuve":"constructeur","papier-peint":"tapissier","humidite":"humidite"};
  L.forEach((it) => { if (PRESTA[it.id]) it.p = PRESTA[it.id]; if (REMETIER[it.id]) it.m = REMETIER[it.id]; if (!it.p && METIERS[it.m]) it.p = METIERS[it.m].prestation; });
  const VOCAB = new Set(); const SURF = {};
  L.forEach((it) => {
    it.nl = norm(it.l); it.nk = it.k.map(norm);
    norm(it.l + " " + it.k.join(" ")).split(" ").forEach((w) => { const st = stem(w); if (!SURF[st]) SURF[st] = w; });
    it.terms = new Set(); tokens(it.l).concat(...it.k.map((k) => tokens(k)), tokens(METIERS[it.m] ? METIERS[it.m].nom + " " + METIERS[it.m].alias.join(" ") : "")).forEach((t) => { it.terms.add(t); VOCAB.add(t); });
  });
  const VOC = Array.from(VOCAB);
  const DF = {}; L.forEach((it) => it.terms.forEach((t) => { DF[t] = (DF[t] || 0) + 1; }));
  const idf = (t) => { let d = DF[t]; if (!d) { for (const v of VOC) if (v.startsWith(t)) d = Math.max(d || 0, DF[v]); } return d ? Math.log(1 + L.length / d) / Math.log(1 + L.length / 1.5) : 1; };

  function corriger(tok) { // meilleur mot du vocabulaire à distance ≤ 1 ou 2
    if (VOCAB.has(tok) || SYN[tok] || tok.length < 4) return tok;
    const max = tok.length >= 8 ? 2 : 1; let best = null, bd = max + 1;
    for (const v of VOC) { if (v[0] !== tok[0] && tok.length < 7) continue; const x = dl(tok, v, max); if (x < bd) { bd = x; best = v; } }
    return best || tok;
  }

  function scoreItem(it, qtoks, qnorm, lastTok) {
    let s = 0, matched = 0;
    let poidsTotal = 0, poidsTrouve = 0;
    for (const group of qtoks) {
      let best = 0; const w0 = idf(group[0]); poidsTotal += w0;
      for (const t of group) {
        let m = 0;
        if (it.terms.has(t)) m = 3;
        else if (group[0] === lastTok && t.length >= 2) { for (const w of it.terms) if (w.startsWith(t)) { m = 2.2; break; } }
        if (!m && t.length >= 4) { const max = t.length >= 8 ? 2 : 1; for (const w of it.terms) if (Math.abs(w.length - t.length) <= max && dl(t, w, max) <= max) { m = 1.6; break; } }
        if (m > best) best = m;
      }
      if (best) { matched++; s += best * (0.4 + w0); poidsTrouve += w0; }
    }
    if (!matched) return 0;
    if (qtoks.length >= 2 && poidsTotal && poidsTrouve / poidsTotal < 0.55) return 0;
    const cov = poidsTotal ? poidsTrouve / poidsTotal : 0;
    if (qnorm.length >= 3) {
      if (it.nl.startsWith(qnorm)) s += 5; else if (it.nl.includes(qnorm)) s += 3.5;
      else if (it.nk.some((k) => k === qnorm)) s += 4.5; else if (it.nk.some((k) => k.startsWith(qnorm))) s += 3; else if (it.nk.some((k) => k.includes(qnorm))) s += 2;
    }
    return s * (0.35 + 0.65 * cov * cov) + it.pop * 0.6;
  }

  function surligner(label, qtoks) { // segments { t, b } où b = texte en gras
    const words = label.split(/(\s+|['’])/); const out = [];
    words.forEach((w) => { const n = stem(norm(w)); const hit = !!(n && n.length >= 2 && qtoks.some((q) => q.length >= 2 && (n.startsWith(q) || (q.startsWith(n) && n.length >= 3))));
      const last = out[out.length - 1]; if (last && last.b === hit) last.t += w; else out.push({ t: w, b: hit }); });
    return out;
  }

  function rechercher(q, opts) {
    const n = (opts && opts.max) || 7;
    const qn = norm(q); if (qn.length < 2) return { resultats: [], correction: null, urgence: false, metiers: [] };
    let raw = tokens(q); if (!raw.length) raw = tokens(q, true);
    const lastTok = raw[raw.length - 1];
    const corr = raw.map((t) => (t === lastTok ? t : corriger(t)));
    const corrLast = corriger(lastTok);
    const lastFor = VOC.some((v) => v.startsWith(lastTok)) ? lastTok : corrLast;
    corr[corr.length - 1] = lastFor;
    const qtoks = corr.map(variantes); const plats = [].concat(...qtoks);
    const corrige = corr.some((t, i) => t !== raw[i]);
    const tous = L.map((it) => ({ it, s: scoreItem(it, qtoks, qn, lastFor) })).filter((x) => x.s > 1.2).sort((a, b) => b.s - a.s);
    const seuil = tous.length ? Math.max(3.5, tous[0].s * 0.34) : 0;
    const res = tous.filter((x) => x.s >= seuil);
    const top = res.slice(0, n);
    const resultats = top.map(({ it, s }) => ({ id: it.id, libelle: it.l, segments: surligner(it.l, plats), metier: (METIERS[it.m] || {}).nom, metierId: it.m, prestation: it.p, score: Math.round(s * 10) / 10 }));
    const vus = new Set(); const metiers = [];
    res.forEach(({ it }) => { if (!vus.has(it.m) && metiers.length < 4) { vus.add(it.m); metiers.push({ id: it.m, nom: (METIERS[it.m] || {}).nom }); } });
    const liesIds = new Set(top.map((x) => x.it.id));
    const associees = top.length ? L.filter((it) => it.m === top[0].it.m && !liesIds.has(it.id)).sort((a, b) => b.pop - a.pop).slice(0, 4).map((it) => ({ id: it.id, libelle: it.l, prestation: it.p })) : [];
    return { resultats, correction: corrige && top.length ? corr.map((t) => SURF[t] || t).join(" ") : null, urgence: URGENCE.test(q), metiers, associees };
  }

  // Recherche de métiers (inscription artisan, filtres annuaire) : nom + alias, préfixe et fautes tolérés
  function rechercherMetiers(q, max) {
    const n = max || 8, qn = norm(q);
    const liste = Object.values(METIERS);
    if (qn.length < 1) return liste.slice(0, n).map((m) => ({ ...m, segments: [{ t: m.nom, b: false }] }));
    const qt = tokens(q, true).map((t) => (SYN[t] ? [t].concat(SYN[t].split(" ").map(stem)) : [t]));
    const res = liste.map((m) => {
      const nn = norm(m.nom), termes = new Set(tokens(m.nom + " " + m.alias.join(" "), true));
      let s = 0, ok = 0;
      qt.forEach((g) => { let b = 0; g.forEach((t) => {
        for (const w of termes) { if (w === t) b = Math.max(b, 3); else if (w.startsWith(t)) b = Math.max(b, 2.2); else if (t.length >= 4 && Math.abs(w.length - t.length) <= 1 && dl(t, w, 1) <= 1) b = Math.max(b, 1.5); }
      }); if (b) { ok++; s += b; } });
      if (ok < qt.length) return { m, s: 0 };
      if (nn.startsWith(qn)) s += 4; else if (nn.includes(qn)) s += 2;
      if (m.alias.some((a) => a.startsWith(qn))) s += 1.5;
      return { m, s };
    }).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, n);
    return res.map(({ m }) => ({ ...m, segments: surligner(m.nom, [].concat(...qt)) }));
  }
  const intentionsDuMetier = (id) => L.filter((it) => it.m === id).sort((a, b) => b.pop - a.pop).map((it) => ({ id: it.id, libelle: it.l, prestation: it.p }));

  const populaires = () => L.filter((it) => it.pop >= 5).slice(0, 8).map((it) => ({ id: it.id, libelle: it.l, prestation: it.p, metier: (METIERS[it.m] || {}).nom }));

  window.PH_RECHERCHE = { INTENTIONS: L, METIERS, metierNom: (id) => (METIERS[id] || {}).nom || "", SYNONYMES: SYN, rechercher, rechercherMetiers, intentionsDuMetier, populaires, norm };
})();
