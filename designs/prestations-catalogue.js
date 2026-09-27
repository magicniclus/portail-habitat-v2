/* Portail Habitat — catalogue des prestations estimables en ligne (complète les 9 prestations détaillées du simulateur).
   Format déclaratif, stockable tel quel dans Firestore : referentiel/prestations/items/{id} (champs, libellés)
   et referentiel/prestations/prix/{id} (unitaire, base, k, extras : serveur uniquement). Calcul générique :
   quantité × prix unitaire × coefficients des choix + forfait de base + options + évacuation. Montants TTC indicatifs, Gironde 2026. */
(function () {
  const ICO = {
    maison: "M3 11 12 4l9 7M6 12.5V20h12v-7.5", mur: "M3 6h18v12H3zM3 12h18M9 6v6M15 12v6", porte: "M6 21V3h12v18M10 12h.01",
    fenetre: "M4 4h16v16H4zM12 4v16M4 12h16", toit: "M2 12 12 4l10 8M5 10v10h14V10", sol: "M3 17h18M3 17l4-10h10l4 10M9 7l-2 10M15 7l2 10",
    flamme: "M12 3c3 4 6 6 6 10a6 6 0 0 1-12 0c0-3 2-4 3-7 1 2 2 3 3 3 0-2 0-4 0-6z", flocon: "M12 2v20M4 7l16 10M20 7 4 17",
    eclair: "M13 2 4 14h7l-1 8 9-12h-7z", soleil: "M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2",
    goutte: "M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z", arbre: "M12 22v-7M7 15h10l-5-11z", vague: "M2 12c2-2 4-2 6 0s4 2 6 0 4-2 6 0M2 17c2-2 4-2 6 0s4 2 6 0 4-2 6 0",
    cle: "M15 7a4 4 0 1 1-3.5 6L4 20.5 2.5 19l1.5-1.5L2.5 16 4 14.5l7.5-7.5A4 4 0 0 1 15 7z", bouclier: "M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z",
    loupe: "M11 4.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM16 16l4.5 4.5", outil: "M14 7l3-3 3 3-3 3M4 20l9-9M13 11l-2-2", escalier: "M4 20h4v-4h4v-4h4V8h4",
    grille: "M4 4v16M9 4v16M14 4v16M19 4v16M2 8h20M2 16h20", ventil: "M12 12m-2 0a2 2 0 1 0 4 0 2 2 0 1 0-4 0M12 10c0-4 4-6 6-4M14 12c4 0 6 4 4 6M12 14c0 4-4 6-6 4M10 12c-4 0-6-4-4-6",
    cuve: "M5 6h14v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2zM5 10h14", voiture: "M5 16h14M6 16l1.5-5h9L18 16M7 19v-3M17 19v-3", insecte: "M12 8a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM12 14v6M6 10l3 2M18 10l-3 2M6 17l3-2M18 17l-3-2",
    plan: "M3 5l6-2 6 2 6-2v16l-6 2-6-2-6 2zM9 3v16M15 5v16", cle2: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
  };
  const FAMILLES = [
    { id: "sdb-cuisine", nom: "Salle de bain et cuisine" }, { id: "deco", nom: "Peinture et décoration" }, { id: "sols", nom: "Sols" },
    { id: "interieur", nom: "Aménagement intérieur" }, { id: "gros-oeuvre", nom: "Gros œuvre et extension" }, { id: "plomberie", nom: "Plomberie et eau" },
    { id: "chauffage", nom: "Chauffage et climatisation" }, { id: "electricite", nom: "Électricité et énergie" }, { id: "isolation", nom: "Isolation et rénovation énergétique" },
    { id: "menuiseries", nom: "Menuiseries et fermetures" }, { id: "toiture", nom: "Toiture et façade" }, { id: "exterieur", nom: "Extérieur et jardin" },
    { id: "securite", nom: "Sécurité et accessibilité" }, { id: "traitements", nom: "Diagnostics et traitements" }, { id: "depannage", nom: "Dépannage et petits travaux" },
  ];
  // Familles des 9 prestations détaillées existantes
  const FAMILLE_EXISTANTES = { peinture: "deco", sdb: "sdb-cuisine", cuisine: "sdb-cuisine", elec: "electricite", plomberie: "plomberie", carrelage: "sols", isolation: "isolation", toiture: "toiture", menuiserie: "menuiseries" };

  const GAMME = ["gamme", "Gamme", "Matériaux et équipements.", [["eco", "Économique", "Entrée de gamme", 0.82], ["std", "Standard", "Le plus choisi", 1], ["premium", "Haut de gamme", "Finitions soignées", 1.4]]];
  const ETAT = ["etat", "État de l'existant", "La préparation pèse sur le prix.", [["bon", "Bon état", "", 1], ["moyen", "À reprendre", "+15 %", 1.15], ["mauvais", "Dégradé", "+35 %", 1.35]]];
  const URG = ["delai", "Délai", "Une intervention en urgence est majorée.", [["planifie", "Planifié", "Sous quelques semaines", 1], ["rapide", "Sous 48 h", "+15 %", 1.15], ["urgence", "Urgence", "Jour même · +40 %", 1.4]]];

  const LISTE = [];
  // P(id, nom, famille, icone, pitch, repère, tva, quantité[kind,label,aide,min,max,pas,def,unité], unitaire[a,b], libellé du poste, base[a,b], choix[], extras[[v,label,a,b,parUnité]], évacuation[a,b], parcours?)
  const P = (id, nom, famille, icone, pitch, repere, tva, q, unitaire, lib, base, choix, extras, evac, parcours) =>
    LISTE.push({ id, nom, famille, icone: ICO[icone] || ICO.maison, pitch, repere, tva, parcours: parcours || null,
      tarif: { q: { kind: q[0], label: q[1], aide: q[2], min: q[3], max: q[4], pas: q[5], def: q[6], unite: q[7] }, unitaire, lib, base, choix, extras, evac } });

  // ---------- Salle de bain et cuisine ----------
  P("sdb-douche", "Douche à l'italienne", "sdb-cuisine", "goutte", "Remplacement de baignoire, receveur extra-plat", "dès 3 500 €", 10,
    ["n", "Nombre de douches", "", 1, 3, 1, 1, "douche(s)"], [2200, 3800], "Douche complète (dépose, receveur, paroi, faïence)", [350, 700],
    [["type", "Type de sol", "", [["receveur", "Receveur extra-plat", "Le plus courant", 1], ["carrele", "Carrelée au sol", "Siphon de sol, +25 %", 1.25], ["pmr", "Accès PMR", "Barres, siège, +15 %", 1.15]]], GAMME],
    [["baignoire", "Dépose de baignoire", 250, 550], ["paroi", "Paroi sur mesure", 400, 1100], ["colonne", "Colonne thermostatique", 250, 700], ["niche", "Niche murale", 180, 400]], [150, 350]);
  P("wc", "WC et toilettes", "sdb-cuisine", "goutte", "WC suspendu, sanibroyeur, lave-mains", "dès 450 €", 10,
    ["n", "Nombre de WC", "", 1, 4, 1, 1, "WC"], [380, 780], "Fourniture et pose des WC", [120, 250],
    [["type", "Type de WC", "", [["poser", "À poser", "", 0.85], ["suspendu", "Suspendu (bâti-support)", "+45 %", 1.45], ["broyeur", "Sanibroyeur", "", 1.1]]], GAMME],
    [["lavemains", "Lave-mains", 250, 600], ["deplacement", "Déplacement des évacuations", 350, 900], ["coffrage", "Coffrage et faïence", 300, 800]], [60, 150]);
  P("sdb-pmr", "Adaptation PMR de salle de bain", "sdb-cuisine", "bouclier", "Seniors, mobilité réduite, MaPrimeAdapt'", "dès 2 800 €", 5.5,
    ["s", "Surface de la pièce", "", 3, 15, 1, 5, "m²"], [520, 900], "Adaptation (douche de plain-pied, sol antidérapant)", [900, 1800],
    [GAMME], [["barres", "Barres d'appui", 150, 400], ["siege", "Siège de douche", 150, 450], ["porte", "Élargissement de porte", 600, 1400], ["wcreh", "WC rehaussé", 350, 800]], [200, 450]);
  P("cuisine-pose", "Pose de cuisine en kit", "sdb-cuisine", "outil", "Montage des meubles achetés en magasin", "dès 900 €", 10,
    ["s", "Longueur de cuisine", "", 2, 12, 0.5, 4, "ml"], [260, 480], "Montage et pose des meubles", [200, 450],
    [["forme", "Configuration", "", [["droite", "Droite", "", 1], ["l", "En L", "+10 %", 1.1], ["u", "En U ou avec îlot", "+25 %", 1.25]]]],
    [["plan", "Découpe du plan de travail", 150, 400], ["electro", "Branchement électroménager", 150, 400], ["plomb", "Raccordement évier", 150, 350], ["credence", "Pose de crédence", 200, 600]], [90, 200]);
  P("cuisine-plan", "Plan de travail et crédence", "sdb-cuisine", "grille", "Stratifié, bois, quartz, céramique", "dès 600 €", 10,
    ["s", "Longueur de plan", "", 1, 10, 0.5, 3, "ml"], [180, 420], "Fourniture et pose du plan", [150, 300],
    [["materiau", "Matériau", "", [["strat", "Stratifié", "", 0.6], ["bois", "Bois massif", "", 1], ["quartz", "Quartz", "+60 %", 1.6], ["ceramique", "Céramique / Dekton", "+100 %", 2]]]],
    [["credence", "Crédence assortie", 250, 800], ["evier", "Découpe évier sous-plan", 150, 350], ["plaque", "Découpe plaque affleurante", 150, 350]], [60, 150]);
  P("cuisine-relooking", "Relooking de cuisine", "sdb-cuisine", "outil", "Façades, peinture, poignées, crédence", "dès 1 200 €", 10,
    ["s", "Longueur de cuisine", "", 2, 12, 0.5, 4, "ml"], [220, 520], "Façades ou peinture des meubles", [150, 300],
    [["methode", "Méthode", "", [["peinture", "Peinture des façades", "", 0.7], ["adhesif", "Covering adhésif", "", 0.6], ["facades", "Nouvelles façades", "", 1.3]]]],
    [["poignees", "Nouvelles poignées", 100, 350], ["credence", "Crédence", 250, 800], ["eclairage", "Éclairage LED sous meubles", 150, 450]], [0, 0]);

  // ---------- Peinture et décoration ----------
  P("papier-peint", "Papier peint et revêtements muraux", "deco", "mur", "Papier peint, intissé, toile de verre, panoramique", "dès 18 €/m²", 10,
    ["s", "Surface murale", "", 5, 200, 5, 30, "m²"], [18, 38], "Pose du revêtement", [120, 250],
    [["type", "Revêtement", "", [["intisse", "Intissé", "", 1], ["toile", "Toile de verre + peinture", "", 1.25], ["panoramique", "Panoramique / raccords", "+30 %", 1.3]]], ETAT],
    [["depose", "Décollage de l'ancien", 6, 12, true], ["fourniture", "Fourniture du papier", 8, 30, true]], [60, 150]);
  P("enduit-deco", "Enduits décoratifs et béton ciré mural", "deco", "mur", "Tadelakt, chaux, stuc, béton ciré", "dès 55 €/m²", 10,
    ["s", "Surface", "", 2, 100, 1, 12, "m²"], [55, 120], "Application de l'enduit", [150, 300],
    [["type", "Finition", "", [["chaux", "Chaux", "", 0.9], ["beton", "Béton ciré", "", 1], ["tadelakt", "Tadelakt", "+40 %", 1.4]]], ETAT], [["protection", "Vernis de protection", 8, 18, true]], [50, 120]);
  P("peinture-ext", "Peinture extérieure et volets", "deco", "fenetre", "Volets, portail, boiseries, dessous de toit", "dès 60 € le volet", 10,
    ["n", "Nombre d'éléments (volets, portes…)", "", 1, 40, 1, 8, "élément(s)"], [60, 140], "Préparation et peinture", [150, 300],
    [["support", "Support", "", [["bois", "Bois", "", 1], ["metal", "Métal / fer forgé", "+20 %", 1.2], ["pvc", "PVC", "", 0.85]]], ETAT],
    [["sousface", "Dessous de toit (par ml)", 25, 45, false], ["portail", "Portail", 250, 600], ["nacelle", "Nacelle ou échafaudage", 300, 900]], [50, 120]);

  // ---------- Sols ----------
  P("parquet", "Pose de parquet", "sols", "sol", "Flottant, contrecollé, massif, point de Hongrie", "dès 25 €/m²", 10,
    ["s", "Surface", "", 5, 200, 5, 30, "m²"], [25, 55], "Pose", [150, 300],
    [["type", "Type de parquet", "", [["flottant", "Flottant", "", 0.8], ["colle", "Contrecollé collé", "", 1], ["massif", "Massif cloué", "+30 %", 1.3], ["hongrie", "Point de Hongrie / chevron", "+70 %", 1.7]]], GAMME],
    [["fourniture", "Fourniture du parquet", 25, 90, true], ["depose", "Dépose de l'ancien sol", 8, 18, true], ["ragreage", "Ragréage", 15, 30, true], ["plinthes", "Plinthes", 6, 14, true]], [80, 200]);
  P("parquet-renov", "Ponçage et vitrification de parquet", "sols", "sol", "Ponçage, vitrification, huile", "dès 22 €/m²", 10,
    ["s", "Surface", "", 5, 200, 5, 30, "m²"], [22, 40], "Ponçage et finition", [120, 250],
    [["finition", "Finition", "", [["vitrif", "Vitrification", "", 1], ["huile", "Huile", "", 1.05], ["teinte", "Teinte + vitrification", "+20 %", 1.2]]], ETAT],
    [["lames", "Remplacement de lames", 150, 450], ["escalier", "Escalier (par marche)", 35, 70, false]], [50, 120]);
  P("sol-souple", "Sol stratifié, vinyle ou moquette", "sols", "sol", "Stratifié, LVT, lino, moquette", "dès 15 €/m²", 10,
    ["s", "Surface", "", 5, 200, 5, 30, "m²"], [15, 32], "Pose", [100, 220],
    [["type", "Revêtement", "", [["strat", "Stratifié", "", 1], ["lvt", "Vinyle LVT clipsable", "", 1.1], ["lvtcolle", "Vinyle collé", "", 1.2], ["moquette", "Moquette", "", 0.9]]], GAMME],
    [["fourniture", "Fourniture du revêtement", 12, 45, true], ["depose", "Dépose de l'ancien sol", 6, 14, true], ["ragreage", "Ragréage", 15, 30, true]], [60, 150]);
  P("chape", "Chape et ragréage", "sols", "sol", "Mise à niveau avant revêtement", "dès 20 €/m²", 10,
    ["s", "Surface", "", 5, 250, 5, 40, "m²"], [20, 42], "Chape ou ragréage", [200, 450],
    [["type", "Type", "", [["ragreage", "Ragréage autolissant", "", 0.8], ["chape", "Chape ciment", "", 1], ["liquide", "Chape liquide anhydrite", "+15 %", 1.15]]]],
    [["isolant", "Isolant sous chape", 15, 30, true], ["depose", "Dépose du sol existant", 10, 22, true]], [100, 300]);
  P("beton-cire-sol", "Béton ciré et résine de sol", "sols", "sol", "Microciment, résine époxy, sol coulé", "dès 80 €/m²", 10,
    ["s", "Surface", "", 5, 150, 5, 25, "m²"], [80, 150], "Application", [250, 500],
    [["type", "Type", "", [["beton", "Béton ciré", "", 1], ["micro", "Microciment", "", 1.1], ["epoxy", "Résine époxy", "", 0.9]]], ETAT], [["ragreage", "Ragréage préalable", 15, 30, true]], [80, 200]);
  P("terrasse", "Terrasse bois, composite ou dalles", "exterieur", "sol", "Terrasse sur plots, lambourdes, dalles, carrelage", "dès 90 €/m²", 10,
    ["s", "Surface", "", 5, 150, 5, 25, "m²"], [90, 160], "Terrasse posée", [300, 700],
    [["materiau", "Matériau", "", [["pin", "Pin traité", "", 0.8], ["composite", "Composite", "", 1.1], ["exotique", "Bois exotique", "+35 %", 1.35], ["dalles", "Dalles / carrelage", "", 1]]], ["support", "Support", "", [["plots", "Sur plots", "", 1], ["dalle", "Dalle béton à créer", "+40 %", 1.4], ["suspendue", "Terrasse suspendue", "+80 %", 1.8]]]],
    [["gardecorps", "Garde-corps", 180, 350, false], ["eclairage", "Spots encastrés", 300, 900], ["escalier", "Marches", 400, 1200]], [150, 400]);

  // ---------- Aménagement intérieur ----------
  P("cloison", "Création ou suppression de cloison", "interieur", "mur", "Placo, cloison vitrée, abattage de cloison", "dès 45 €/m²", 10,
    ["s", "Surface de cloison", "", 2, 80, 1, 10, "m²"], [45, 85], "Cloison (ossature, plaques, bandes)", [250, 500],
    [["action", "Travaux", "", [["creer", "Créer une cloison", "", 1], ["abattre", "Supprimer une cloison", "", 0.7], ["phonique", "Cloison phonique", "+30 %", 1.3]]]],
    [["porte", "Bloc-porte", 350, 800], ["elec", "Prises et interrupteurs", 150, 400], ["peinture", "Peinture", 20, 35, true]], [150, 400]);
  P("verriere", "Verrière d'intérieur", "interieur", "fenetre", "Style atelier, acier ou alu", "dès 1 200 €", 10,
    ["s", "Largeur", "", 1, 8, 0.5, 2, "ml"], [650, 1300], "Verrière sur mesure posée", [250, 500],
    [["materiau", "Matériau", "", [["alu", "Aluminium", "", 0.85], ["acier", "Acier", "", 1], ["bois", "Bois", "", 0.9]]]],
    [["porte", "Porte vitrée intégrée", 800, 1800], ["allege", "Allège maçonnée", 300, 700]], [80, 200]);
  P("faux-plafond", "Faux plafond", "interieur", "grille", "Placo, dalles, plafond tendu, acoustique", "dès 40 €/m²", 10,
    ["s", "Surface", "", 3, 150, 1, 20, "m²"], [40, 75], "Faux plafond posé", [200, 400],
    [["type", "Type", "", [["placo", "Placo", "", 1], ["dalles", "Dalles minérales", "", 0.85], ["tendu", "Plafond tendu", "+20 %", 1.2], ["acoustique", "Acoustique", "+25 %", 1.25]]]],
    [["spots", "Spots encastrés (par spot)", 60, 120, false], ["isolant", "Isolant", 12, 25, true], ["peinture", "Peinture", 15, 25, true]], [100, 250]);
  P("mur-porteur", "Ouverture de mur porteur", "interieur", "mur", "IPN, linteau, étude de structure", "dès 3 000 €", 10,
    ["s", "Largeur de l'ouverture", "", 1, 8, 0.5, 2.5, "m"], [900, 1600], "Ouverture et pose de la poutre", [1500, 2800],
    [["mur", "Nature du mur", "", [["parpaing", "Parpaing / brique", "", 1], ["pierre", "Pierre", "+30 %", 1.3], ["beton", "Béton", "+20 %", 1.2]]]],
    [["bet", "Étude de structure (BET)", 500, 1200], ["etai", "Étaiement renforcé", 300, 900], ["finitions", "Reprise des finitions", 400, 1200]], [300, 800]);
  P("dressing", "Dressing et placards sur mesure", "interieur", "porte", "Dressing, placard, rangements sur mesure", "dès 1 500 €", 20,
    ["s", "Longueur", "", 1, 10, 0.5, 2.5, "ml"], [650, 1400], "Agencement sur mesure", [200, 400],
    [["portes", "Façade", "", [["ouvert", "Ouvert", "", 0.75], ["battantes", "Portes battantes", "", 1], ["coulissantes", "Portes coulissantes", "", 1.1]]], GAMME],
    [["eclairage", "Éclairage intégré", 200, 600], ["miroir", "Portes miroir", 300, 900]], [0, 0]);
  P("escalier", "Escalier : création ou rénovation", "interieur", "escalier", "Escalier bois, métal, rénovation des marches", "dès 2 500 €", 10,
    ["n", "Nombre de marches", "", 3, 20, 1, 14, "marche(s)"], [180, 380], "Escalier fourni posé", [600, 1200],
    [["travaux", "Travaux", "", [["renov", "Rénovation / habillage", "", 0.45], ["bois", "Escalier bois neuf", "", 1], ["metal", "Métal ou mixte", "+30 %", 1.3]]], ["forme", "Forme", "", [["droit", "Droit", "", 1], ["quart", "Quart tournant", "+15 %", 1.15], ["helico", "Hélicoïdal", "+30 %", 1.3]]]],
    [["gardecorps", "Garde-corps", 600, 1800], ["tremie", "Création de trémie", 1200, 3000]], [150, 400]);
  P("combles-amenagement", "Aménagement des combles", "interieur", "toit", "Chambre, bureau, velux, plancher", "dès 900 €/m²", 10,
    ["s", "Surface à aménager", "", 8, 80, 1, 25, "m²"], [900, 1500], "Aménagement complet (isolation, plancher, placo)", [1500, 3500],
    [["hauteur", "Hauteur disponible", "", [["ok", "Plus de 1,80 m au faîtage", "", 1], ["juste", "Juste suffisante", "+10 %", 1.1], ["rehausse", "Rehausse nécessaire", "+60 %", 1.6]]]],
    [["velux", "Fenêtre de toit", 900, 1800], ["escalier", "Escalier d'accès", 2500, 6000], ["sdb", "Salle d'eau", 5000, 9000], ["elec", "Électricité", 1200, 2500]], [300, 700]);
  P("garage-transformation", "Transformation de garage en pièce", "interieur", "maison", "Chambre, bureau, studio", "dès 700 €/m²", 10,
    ["s", "Surface", "", 8, 50, 1, 18, "m²"], [700, 1200], "Aménagement (isolation, sol, placo, électricité)", [1200, 2500],
    [GAMME], [["fenetre", "Remplacement de la porte par une baie", 2000, 4500], ["sdb", "Salle d'eau", 4500, 8500], ["declaration", "Déclaration préalable", 300, 800]], [200, 500]);
  P("renovation-complete", "Rénovation complète", "interieur", "maison", "Maison ou appartement, tous corps d'état", "dès 600 €/m²", 10,
    ["s", "Surface habitable", "", 20, 300, 5, 80, "m²"], [600, 1100], "Rénovation tous corps d'état", [2000, 5000],
    [["niveau", "Niveau de rénovation", "", [["rafraichir", "Rafraîchissement", "Peinture, sols", 0.4], ["moyenne", "Rénovation moyenne", "Cuisine, sdb, sols", 1], ["lourde", "Rénovation lourde", "Réseaux, cloisons, +45 %", 1.45]]], GAMME],
    [["moe", "Maîtrise d'œuvre (suivi de chantier)", 3000, 9000], ["energie", "Volet rénovation énergétique", 8000, 25000]], [800, 2500]);
  P("extension", "Extension de maison", "gros-oeuvre", "maison", "Parpaing, ossature bois, surélévation", "dès 1 600 €/m²", 10,
    ["s", "Surface de l'extension", "", 8, 80, 1, 25, "m²"], [1600, 2600], "Extension clos-couvert et finitions", [3000, 6000],
    [["type", "Type", "", [["parpaing", "Maçonnée", "", 1], ["bois", "Ossature bois", "", 1.05], ["surelevation", "Surélévation", "+30 %", 1.3]]], GAMME],
    [["permis", "Plans et permis", 1500, 4000], ["baie", "Grande baie vitrée", 2500, 6000], ["toitterrasse", "Toit-terrasse", 3000, 8000]], [500, 1500]);
  P("veranda", "Véranda et pergola", "gros-oeuvre", "fenetre", "Véranda alu, pergola bioclimatique, carport", "dès 8 000 €", 10,
    ["s", "Surface", "", 6, 50, 1, 16, "m²"], [900, 1800], "Structure fournie posée", [1500, 3000],
    [["type", "Type", "", [["pergola", "Pergola bioclimatique", "", 0.6], ["veranda", "Véranda alu", "", 1], ["bois", "Véranda bois", "+15 %", 1.15]]]],
    [["dalle", "Dalle béton", 80, 140, true], ["chauffage", "Chauffage", 800, 2500], ["stores", "Stores intégrés", 800, 2500]], [200, 600]);
  P("maison-neuve", "Construction de maison", "gros-oeuvre", "maison", "Maison individuelle, gros œuvre et finitions", "dès 1 700 €/m²", 20,
    ["s", "Surface habitable", "", 60, 250, 5, 110, "m²"], [1700, 2600], "Construction (hors terrain)", [8000, 15000],
    [["niveaux", "Niveaux", "", [["plainpied", "Plain-pied", "", 1], ["etage", "À étage", "", 0.95]]], GAMME],
    [["garage", "Garage", 12000, 25000], ["etude", "Étude de sol G2", 1500, 3500], ["viabilisation", "Viabilisation", 5000, 15000]], [0, 0]);
  P("architecte", "Architecte ou maître d'œuvre", "gros-oeuvre", "plan", "Plans, permis, suivi de chantier", "dès 1 500 €", 20,
    ["s", "Montant estimé des travaux (k€)", "", 10, 500, 5, 60, "k€"], [70, 130], "Honoraires (conception et suivi)", [800, 1500],
    [["mission", "Mission", "", [["plans", "Plans et permis seuls", "", 0.4], ["complete", "Mission complète", "", 1], ["interieur", "Architecte d'intérieur", "", 0.8]]]],
    [["3d", "Visuels 3D", 400, 1200], ["releve", "Relevé de l'existant", 400, 1000]], [0, 0]);
  P("maconnerie", "Travaux de maçonnerie", "gros-oeuvre", "mur", "Mur, muret, dalle, ouverture", "dès 90 €/m²", 10,
    ["s", "Surface (mur ou dalle)", "", 2, 150, 1, 15, "m²"], [90, 180], "Maçonnerie", [400, 900],
    [["ouvrage", "Ouvrage", "", [["muret", "Muret / mur", "", 1], ["dalle", "Dalle béton", "", 0.8], ["pierre", "Pierre", "+50 %", 1.5]]]],
    [["fondations", "Fondations", 120, 250, true], ["enduit", "Enduit de finition", 30, 60, true]], [200, 600]);
  P("fissures", "Fissures et reprise de structure", "gros-oeuvre", "mur", "Agrafage, micropieux, reprise en sous-œuvre", "dès 1 500 €", 10,
    ["s", "Longueur de fissures", "", 1, 40, 1, 6, "ml"], [120, 260], "Traitement des fissures (agrafage)", [800, 1500],
    [["gravite", "Gravité", "", [["legere", "Fissures fines", "", 0.6], ["moyenne", "Fissures ouvertes", "", 1], ["structure", "Désordre structurel", "Micropieux, ×4", 4]]]],
    [["expertise", "Expertise / étude de sol", 900, 2500], ["enduit", "Reprise d'enduit", 400, 1500]], [150, 400]);
  P("demolition", "Démolition et évacuation", "gros-oeuvre", "outil", "Curage, démolition, benne, débarras", "dès 35 €/m²", 10,
    ["s", "Surface concernée", "", 5, 300, 5, 40, "m²"], [35, 75], "Démolition / curage", [300, 700],
    [["type", "Travaux", "", [["debarras", "Débarras", "", 0.4], ["curage", "Curage intérieur", "", 1], ["demolition", "Démolition de bâtiment", "+60 %", 1.6]]]],
    [["benne", "Benne supplémentaire", 350, 650], ["tri", "Tri et recyclage", 200, 600]], [300, 800]);
  P("desamiantage", "Désamiantage", "traitements", "bouclier", "Plaques fibrociment, dalles, toiture", "dès 40 €/m²", 20,
    ["s", "Surface", "", 5, 300, 5, 40, "m²"], [40, 90], "Retrait par entreprise certifiée", [1500, 3000],
    [["element", "Élément", "", [["toiture", "Toiture fibrociment", "", 1], ["dalles", "Dalles de sol", "", 1.2], ["flocage", "Flocage / calorifuge", "×2,5", 2.5]]]],
    [["reperage", "Repérage avant travaux", 400, 900], ["mesures", "Mesures d'empoussièrement", 500, 1200]], [300, 900]);
  P("humidite", "Traitement de l'humidité", "traitements", "goutte", "Remontées capillaires, salpêtre, moisissures", "dès 1 200 €", 10,
    ["s", "Longueur de murs touchés", "", 2, 60, 1, 10, "ml"], [120, 240], "Traitement (injection, enduit assainissant)", [500, 1000],
    [["cause", "Origine", "", [["capillaire", "Remontées capillaires", "", 1], ["condensation", "Condensation", "", 0.6], ["infiltration", "Infiltrations", "+20 %", 1.2]]]],
    [["diagnostic", "Diagnostic humidité", 150, 400], ["vmi", "Ventilation par insufflation", 1200, 2500], ["drainage", "Drainage périphérique", 80, 150, true]], [100, 300]);
  P("drainage", "Drainage et cuvelage", "exterieur", "goutte", "Drain périphérique, pompe de relevage", "dès 80 €/ml", 10,
    ["s", "Longueur", "", 5, 80, 1, 20, "ml"], [80, 160], "Drainage", [600, 1200],
    [["type", "Travaux", "", [["drain", "Drain périphérique", "", 1], ["cuvelage", "Cuvelage de cave", "×1,8", 1.8]]]],
    [["pompe", "Pompe de relevage", 600, 1500], ["regard", "Regard de visite", 150, 350]], [200, 600]);
  P("assainissement", "Assainissement et fosse septique", "exterieur", "cuve", "Micro-station, fosse, tout-à-l'égout", "dès 1 800 €", 10,
    ["n", "Nombre d'équivalents habitants", "", 3, 10, 1, 5, "EH"], [900, 1800], "Installation", [1500, 3000],
    [["type", "Travaux", "", [["raccord", "Raccordement tout-à-l'égout", "", 0.5], ["fosse", "Fosse + épandage", "", 1], ["microstation", "Micro-station", "+15 %", 1.15]]]],
    [["etude", "Étude de sol SPANC", 400, 800], ["vidange", "Vidange de l'ancienne fosse", 200, 400]], [300, 800]);

  // ---------- Plomberie et eau ----------
  P("fuite", "Recherche et réparation de fuite", "plomberie", "goutte", "Fuite, dégât des eaux, canalisation percée", "dès 150 €", 10,
    ["n", "Nombre de fuites", "", 1, 5, 1, 1, "fuite(s)"], [120, 280], "Réparation", [90, 150],
    [["type", "Recherche", "", [["visible", "Fuite visible", "", 1], ["encastree", "Fuite encastrée", "+60 %", 1.6], ["nondestructive", "Recherche non destructive", "×2,5", 2.5]]], URG],
    [["rapport", "Rapport pour l'assurance", 100, 250], ["reprise", "Reprise de carrelage ou placo", 200, 700]], [0, 0]);
  P("debouchage", "Débouchage de canalisation", "plomberie", "goutte", "Évier, WC, douche, colonne, hydrocurage", "dès 120 €", 10,
    ["n", "Évacuations bouchées", "", 1, 5, 1, 1, "évacuation(s)"], [90, 200], "Débouchage", [60, 120],
    [["methode", "Méthode", "", [["manuel", "Furet / pompe", "", 1], ["hydro", "Hydrocurage", "×2", 2]]], URG],
    [["camera", "Inspection caméra", 150, 350], ["rapport", "Rapport pour l'assurance", 80, 200]], [0, 0]);
  P("chauffe-eau", "Chauffe-eau et ballon d'eau chaude", "plomberie", "goutte", "Électrique, thermodynamique, solaire, gaz", "dès 700 €", 10,
    ["n", "Nombre de ballons", "", 1, 3, 1, 1, "ballon(s)"], [650, 1300], "Fourniture et pose", [150, 300],
    [["type", "Type", "", [["elec", "Électrique", "", 1], ["thermo", "Thermodynamique", "×2,4", 2.4], ["solaire", "Solaire (CESI)", "×4", 4], ["gaz", "Gaz", "", 1.3]]], ["capacite", "Capacité", "", [["100", "100 L", "1 à 2 personnes", 0.8], ["200", "200 L", "3 à 4 personnes", 1], ["300", "300 L", "5 personnes et plus", 1.25]]]],
    [["groupe", "Groupe de sécurité", 60, 150], ["evacuation", "Évacuation de l'ancien", 50, 120]], [0, 0]);
  P("adoucisseur", "Adoucisseur et traitement de l'eau", "plomberie", "goutte", "Adoucisseur, osmoseur, filtres", "dès 900 €", 20,
    ["n", "Nombre d'appareils", "", 1, 3, 1, 1, "appareil(s)"], [800, 1800], "Fourniture et pose", [150, 300],
    [["type", "Type", "", [["adoucisseur", "Adoucisseur", "", 1], ["osmoseur", "Osmoseur sous évier", "", 0.5], ["filtre", "Filtre anti-calcaire", "", 0.3]]]], [["bypass", "By-pass et raccords", 80, 200]], [0, 0]);
  P("robinetterie", "Robinetterie et mitigeurs", "plomberie", "goutte", "Mitigeur, colonne de douche, robinet", "dès 120 €", 10,
    ["n", "Nombre de robinets", "", 1, 10, 1, 2, "robinet(s)"], [90, 220], "Fourniture et pose", [60, 120],
    [["type", "Type", "", [["mitigeur", "Mitigeur", "", 1], ["thermo", "Thermostatique", "+40 %", 1.4], ["colonne", "Colonne de douche", "×2", 2]]], GAMME], [["flexibles", "Remplacement des flexibles", 30, 60, false]], [0, 0]);
  P("recuperation-eau", "Récupération d'eau de pluie", "plomberie", "cuve", "Cuve aérienne ou enterrée", "dès 600 €", 20,
    ["n", "Capacité (m³)", "", 1, 10, 1, 3, "m³"], [350, 900], "Cuve et raccordement", [300, 700],
    [["pose", "Pose", "", [["aerienne", "Aérienne", "", 0.6], ["enterree", "Enterrée", "", 1]]]], [["pompe", "Pompe et filtration", 400, 900], ["maison", "Raccordement WC / lave-linge", 600, 1500]], [100, 300]);

  // ---------- Chauffage et climatisation ----------
  P("pac-air-eau", "Pompe à chaleur air-eau", "chauffage", "flocon", "Remplacement de chaudière, MaPrimeRénov'", "dès 9 000 €", 5.5,
    ["s", "Surface chauffée", "", 40, 250, 5, 110, "m²"], [80, 125], "PAC fournie posée (puissance adaptée)", [3500, 6000],
    [["type", "Type", "", [["basse", "Basse température", "Radiateurs récents", 0.9], ["haute", "Haute température", "Radiateurs anciens, +15 %", 1.15], ["hybride", "Hybride (PAC + chaudière)", "", 1.05]]]],
    [["ecs", "Production d'eau chaude intégrée", 1200, 2200], ["depose", "Dépose de l'ancienne chaudière / cuve", 400, 1200], ["desembouage", "Désembouage du circuit", 350, 700]], [0, 0]);
  P("climatisation", "Climatisation et PAC air-air", "chauffage", "flocon", "Split, multisplit, gainable, réversible", "dès 1 800 €", 10,
    ["n", "Nombre de pièces à climatiser", "", 1, 8, 1, 2, "pièce(s)"], [1100, 1900], "Unités intérieures posées", [700, 1300],
    [["type", "Système", "", [["mono", "Mono / multisplit", "", 1], ["gainable", "Gainable", "+45 %", 1.45], ["console", "Console au sol", "", 1.05]]], GAMME],
    [["goulottes", "Goulottes décoratives", 100, 300], ["support", "Support mural ou toiture", 150, 450], ["wifi", "Pilotage Wi-Fi", 100, 250]], [0, 0]);
  P("chaudiere", "Chaudière : installation ou remplacement", "chauffage", "flamme", "Gaz condensation, granulés, fioul", "dès 3 500 €", 5.5,
    ["n", "Nombre de chaudières", "", 1, 2, 1, 1, "chaudière(s)"], [2800, 5200], "Chaudière fournie posée", [600, 1200],
    [["type", "Énergie", "", [["gaz", "Gaz à condensation", "", 1], ["granules", "Granulés", "×2,8", 2.8], ["fioul", "Fioul condensation", "", 1.4]]]],
    [["conduit", "Tubage / ventouse", 500, 1500], ["thermostat", "Thermostat connecté", 150, 400], ["desembouage", "Désembouage", 350, 700], ["depose", "Dépose de l'ancienne", 200, 500]], [0, 0]);
  P("entretien-chauffage", "Entretien de chaudière, PAC ou clim", "chauffage", "outil", "Entretien annuel obligatoire, attestation", "dès 110 €", 10,
    ["n", "Nombre d'appareils", "", 1, 4, 1, 1, "appareil(s)"], [100, 180], "Entretien et attestation", [0, 30],
    [["appareil", "Appareil", "", [["gaz", "Chaudière gaz", "", 1], ["fioul", "Chaudière fioul", "", 1.4], ["pac", "Pompe à chaleur", "+50 %", 1.5], ["clim", "Climatisation", "", 1.2]]]], [["contrat", "Contrat annuel avec dépannage", 60, 150]], [0, 0]);
  P("poele", "Poêle à bois ou à granulés", "chauffage", "flamme", "Poêle, conduit, tubage", "dès 3 000 €", 5.5,
    ["n", "Nombre de poêles", "", 1, 2, 1, 1, "poêle(s)"], [1800, 4200], "Poêle fourni", [900, 1800],
    [["type", "Type", "", [["bois", "Bûches", "", 1], ["granules", "Granulés", "+25 %", 1.25], ["masse", "Poêle de masse", "×2,5", 2.5]]], GAMME],
    [["conduit", "Création de conduit", 1200, 2800], ["tubage", "Tubage de conduit existant", 600, 1400], ["plaque", "Plaque de sol", 80, 250]], [0, 0]);
  P("cheminee", "Cheminée et insert", "chauffage", "flamme", "Insert, foyer fermé, habillage", "dès 2 500 €", 5.5,
    ["n", "Nombre de foyers", "", 1, 2, 1, 1, "foyer(s)"], [1600, 3800], "Insert ou foyer fourni posé", [600, 1400],
    [["type", "Travaux", "", [["insert", "Insert dans cheminée existante", "", 1], ["foyer", "Cheminée complète", "×2", 2], ["ethanol", "Cheminée éthanol", "", 0.5]]]],
    [["habillage", "Habillage", 800, 2500], ["tubage", "Tubage", 600, 1400]], [0, 0]);
  P("ramonage", "Ramonage", "chauffage", "flamme", "Conduit de cheminée, poêle, chaudière", "dès 60 €", 10,
    ["n", "Nombre de conduits", "", 1, 4, 1, 1, "conduit(s)"], [55, 110], "Ramonage et certificat", [0, 20],
    [["type", "Appareil", "", [["cheminee", "Cheminée / insert", "", 1], ["poele", "Poêle à granulés", "", 1.2], ["chaudiere", "Chaudière", "", 0.9]]]], [["debistrage", "Débistrage", 150, 400], ["camera", "Inspection caméra", 100, 250]], [0, 0]);
  P("chauffage-electrique", "Radiateurs électriques", "chauffage", "eclair", "Inertie, sèche-serviettes, thermostat", "dès 450 € par radiateur", 10,
    ["n", "Nombre de radiateurs", "", 1, 15, 1, 5, "radiateur(s)"], [380, 850], "Radiateur fourni posé", [150, 300],
    [["type", "Type", "", [["inertie", "Inertie sèche", "", 1], ["fluide", "Inertie fluide", "", 0.9], ["rayonnant", "Rayonnant", "", 0.6]]], GAMME],
    [["seche", "Sèche-serviettes", 350, 800], ["filpilote", "Fil pilote et programmation", 200, 600], ["depose", "Dépose des anciens", 20, 40, false]], [0, 0]);
  P("plancher-chauffant", "Plancher chauffant", "chauffage", "grille", "Hydraulique ou électrique", "dès 60 €/m²", 5.5,
    ["s", "Surface", "", 10, 200, 5, 60, "m²"], [55, 110], "Plancher chauffant posé", [800, 1800],
    [["type", "Type", "", [["hydro", "Hydraulique", "", 1], ["elec", "Électrique", "", 0.75]]], ["chantier", "Chantier", "", [["neuf", "Neuf / chape à couler", "", 1], ["renov", "Rénovation (plancher mince)", "+20 %", 1.2]]]],
    [["chape", "Chape", 20, 40, true], ["regulation", "Régulation par pièce", 400, 1200]], [150, 400]);
  P("desembouage", "Désembouage et chauffage central", "chauffage", "goutte", "Désembouage, équilibrage, vase d'expansion", "dès 350 €", 10,
    ["n", "Nombre de radiateurs", "", 2, 20, 1, 8, "radiateur(s)"], [35, 70], "Désembouage", [250, 450],
    [["travaux", "Travaux", "", [["desembouage", "Désembouage", "", 1], ["equilibrage", "Équilibrage seul", "", 0.5]]]],
    [["robinets", "Robinets thermostatiques", 60, 120, true], ["vase", "Vase d'expansion", 200, 450], ["circulateur", "Circulateur", 300, 700]], [0, 0]);
  P("geothermie", "Géothermie", "chauffage", "flocon", "PAC géothermique, forage, capteurs", "dès 18 000 €", 5.5,
    ["s", "Surface chauffée", "", 60, 300, 5, 130, "m²"], [110, 170], "PAC géothermique", [6000, 10000],
    [["captage", "Captage", "", [["horizontal", "Horizontal", "", 0.85], ["vertical", "Vertical (forage)", "+25 %", 1.25]]]], [["ecs", "Eau chaude intégrée", 1200, 2500]], [0, 0]);
  P("vmc", "VMC et ventilation", "chauffage", "ventil", "Simple flux, double flux, hygroréglable", "dès 600 €", 5.5,
    ["n", "Pièces humides (cuisine, sdb, WC)", "", 1, 8, 1, 3, "pièce(s)"], [150, 320], "Bouches et gaines", [450, 900],
    [["type", "Système", "", [["simple", "Simple flux", "", 1], ["hygro", "Hygroréglable", "+20 %", 1.2], ["double", "Double flux", "×2,5", 2.5], ["vmi", "Insufflation (VMI)", "+60 %", 1.6]]]],
    [["depose", "Dépose de l'ancienne", 80, 200], ["entretien", "Entretien annuel", 90, 180]], [0, 0]);

  // ---------- Électricité et énergie ----------
  P("tableau-electrique", "Tableau électrique", "electricite", "eclair", "Remplacement, mise en sécurité, disjoncteurs", "dès 900 €", 10,
    ["n", "Nombre de rangées", "", 1, 5, 1, 2, "rangée(s)"], [450, 800], "Tableau équipé posé", [300, 600],
    [["travaux", "Travaux", "", [["remplacement", "Remplacement", "", 1], ["securite", "Mise en sécurité", "", 0.7], ["triphase", "Passage en triphasé", "+40 %", 1.4]]]],
    [["terre", "Mise à la terre", 250, 600], ["parafoudre", "Parafoudre", 120, 300], ["consuel", "Attestation Consuel", 150, 250]], [0, 0]);
  P("prises-eclairage", "Prises, interrupteurs, éclairage", "electricite", "eclair", "Ajout, déplacement, spots, luminaires", "dès 80 € le point", 10,
    ["n", "Nombre de points", "", 1, 40, 1, 6, "point(s)"], [70, 150], "Création des points", [90, 180],
    [["pose", "Passage des câbles", "", [["apparent", "Apparent", "", 1], ["encastre", "Encastré", "+40 %", 1.4]]]], [["spots", "Spots LED (par spot)", 55, 110, false], ["luminaire", "Pose de luminaires", 50, 120, false]], [0, 0]);
  P("depannage-elec", "Dépannage électrique", "electricite", "eclair", "Panne, court-circuit, disjoncteur qui saute", "dès 120 €", 10,
    ["n", "Nombre de pannes", "", 1, 3, 1, 1, "panne(s)"], [90, 220], "Diagnostic et réparation", [80, 140],
    [URG], [["remplacement", "Remplacement d'appareillage", 60, 200]], [0, 0]);
  P("borne-recharge", "Borne de recharge véhicule électrique", "electricite", "voiture", "Wallbox, prise renforcée, copropriété", "dès 1 200 €", 20,
    ["n", "Nombre de bornes", "", 1, 3, 1, 1, "borne(s)"], [900, 1600], "Borne fournie posée (installateur IRVE)", [250, 500],
    [["puissance", "Puissance", "", [["prise", "Prise renforcée 3,7 kW", "", 0.45], ["7", "Wallbox 7,4 kW", "", 1], ["22", "Wallbox 22 kW (triphasé)", "+30 %", 1.3]]]],
    [["cable", "Câble au-delà de 15 m (par m)", 25, 45, false], ["tranchee", "Tranchée", 300, 900], ["pilotage", "Pilotage énergétique", 250, 600]], [0, 0]);
  P("panneaux-solaires", "Panneaux solaires photovoltaïques", "electricite", "soleil", "Autoconsommation, revente, batterie", "dès 6 000 €", 10,
    ["n", "Puissance souhaitée", "", 1, 12, 1, 3, "kWc"], [1800, 2800], "Installation (panneaux, onduleur, pose)", [1000, 2000],
    [["pose", "Pose", "", [["surimposition", "Surimposition toiture", "", 1], ["sol", "Au sol", "", 0.95], ["integre", "Intégré au bâti", "+15 %", 1.15]]]],
    [["batterie", "Batterie de stockage", 4000, 8000], ["suivi", "Monitoring", 150, 400], ["raccordement", "Raccordement Enedis", 400, 1200]], [0, 0]);
  P("domotique", "Domotique et maison connectée", "electricite", "eclair", "Volets, chauffage, éclairage pilotés", "dès 800 €", 20,
    ["n", "Nombre d'équipements pilotés", "", 2, 40, 1, 10, "équipement(s)"], [80, 180], "Modules et programmation", [300, 700],
    [["protocole", "Système", "", [["sansfil", "Sans fil (Zigbee, Wi-Fi)", "", 1], ["filaire", "Filaire KNX", "×2", 2]]]], [["box", "Box domotique", 150, 500], ["ecran", "Écran mural", 300, 900]], [0, 0]);
  P("eclairage-ext", "Éclairage extérieur", "electricite", "soleil", "Jardin, allée, terrasse, détecteurs", "dès 400 €", 20,
    ["n", "Nombre de points lumineux", "", 1, 30, 1, 6, "point(s)"], [90, 200], "Points posés", [150, 350],
    [GAMME], [["tranchee", "Tranchée (par ml)", 25, 50, false], ["detecteur", "Détecteurs de présence", 80, 200]], [0, 0]);
  P("antenne-reseau", "Antenne TV et réseau", "electricite", "eclair", "Antenne, parabole, RJ45, fibre", "dès 180 €", 20,
    ["n", "Nombre de prises", "", 1, 15, 1, 3, "prise(s)"], [60, 140], "Prises TV ou RJ45", [150, 300],
    [["travaux", "Travaux", "", [["antenne", "Antenne / parabole", "", 1], ["rj45", "Réseau RJ45", "", 1.1], ["fibre", "Passage fibre", "", 0.8]]]], [["baie", "Baie de brassage", 250, 700]], [0, 0]);

  // ---------- Isolation ----------
  P("isolation-ite", "Isolation thermique par l'extérieur", "isolation", "mur", "ITE sous enduit ou bardage", "dès 130 €/m²", 5.5,
    ["s", "Surface de façade", "", 30, 400, 5, 120, "m²"], [130, 210], "ITE posée", [1500, 3000],
    [["finition", "Finition", "", [["enduit", "Sous enduit", "", 1], ["bardage", "Bardage", "+20 %", 1.2]]]], [["echafaudage", "Échafaudage", 8, 15, true], ["appuis", "Appuis de fenêtre", 80, 160, false]], [300, 800]);
  P("isolation-sol", "Isolation du sol et du vide sanitaire", "isolation", "sol", "Plancher bas, garage, sous-sol, cave", "dès 30 €/m²", 5.5,
    ["s", "Surface", "", 10, 200, 5, 60, "m²"], [30, 60], "Isolation posée", [250, 500],
    [["technique", "Technique", "", [["panneaux", "Panneaux sous plafond", "", 1], ["flocage", "Flocage", "", 0.9], ["vide", "Vide sanitaire (rampant)", "+25 %", 1.25]]]], [], [100, 250]);
  P("audit-energetique", "Audit énergétique", "isolation", "loupe", "Audit réglementaire, scénarios de travaux", "dès 600 €", 20,
    ["s", "Surface habitable", "", 30, 300, 5, 110, "m²"], [4, 7], "Audit (visite, rapport, scénarios)", [350, 600],
    [["type", "Type", "", [["reglementaire", "Réglementaire (vente)", "", 1], ["accompagnement", "Mon Accompagnateur Rénov'", "×2,5", 2.5]]]], [["thermographie", "Thermographie", 200, 450], ["infiltro", "Test d'étanchéité à l'air", 350, 700]], [0, 0]);

  // ---------- Menuiseries et fermetures ----------
  P("porte-entree", "Porte d'entrée", "menuiseries", "porte", "PVC, alu, bois, blindée", "dès 1 500 €", 10,
    ["n", "Nombre de portes", "", 1, 3, 1, 1, "porte(s)"], [1100, 2600], "Porte fournie", [400, 800],
    [["materiau", "Matériau", "", [["pvc", "PVC", "", 0.8], ["alu", "Aluminium", "", 1.2], ["bois", "Bois", "", 1.1], ["blindee", "Blindée", "×1,6", 1.6]]]],
    [["serrure", "Serrure connectée", 300, 800], ["tierce", "Partie vitrée latérale", 600, 1500]], [80, 200]);
  P("portes-interieures", "Portes intérieures", "menuiseries", "porte", "Bloc-porte, coulissante, galandage", "dès 350 € par porte", 10,
    ["n", "Nombre de portes", "", 1, 15, 1, 4, "porte(s)"], [280, 650], "Porte fournie posée", [100, 200],
    [["type", "Type", "", [["battante", "Battante", "", 1], ["coulissante", "Coulissante en applique", "", 1.2], ["galandage", "À galandage", "×2", 2], ["vitree", "Vitrée atelier", "×1,8", 1.8]]]], [["peinture", "Peinture des portes", 90, 170, false]], [40, 100]);
  P("volets", "Volets roulants et battants", "menuiseries", "fenetre", "Pose, motorisation, remplacement", "dès 450 € par volet", 10,
    ["n", "Nombre de volets", "", 1, 20, 1, 5, "volet(s)"], [380, 850], "Volet fourni posé", [150, 300],
    [["type", "Type", "", [["roulant", "Roulant électrique", "", 1], ["solaire", "Roulant solaire", "+20 %", 1.2], ["battant", "Battant", "", 0.9], ["motorisation", "Motorisation seule", "", 0.5]]]],
    [["centralise", "Commande centralisée", 150, 450], ["depose", "Dépose des anciens", 40, 80, false]], [0, 0]);
  P("store", "Store banne et protection solaire", "menuiseries", "soleil", "Store banne, BSO, moustiquaires", "dès 1 200 €", 10,
    ["s", "Largeur", "", 2, 7, 0.5, 4, "m"], [450, 900], "Store fourni posé", [200, 400],
    [["type", "Type", "", [["banne", "Store banne coffre", "", 1], ["bso", "Brise-soleil orientable", "+40 %", 1.4], ["vertical", "Store vertical", "", 0.7]]]], [["motor", "Motorisation", 300, 700], ["capteur", "Capteur vent / soleil", 150, 350]], [0, 0]);
  P("fenetre-toit", "Fenêtre de toit (Velux)", "menuiseries", "toit", "Création ou remplacement", "dès 1 100 €", 10,
    ["n", "Nombre de fenêtres", "", 1, 6, 1, 1, "fenêtre(s)"], [900, 1800], "Fenêtre fournie posée", [200, 400],
    [["travaux", "Travaux", "", [["remplacement", "Remplacement", "", 0.8], ["creation", "Création", "", 1.3]]]], [["volet", "Volet solaire", 450, 900], ["store", "Store occultant", 120, 300]], [0, 0]);
  P("vitrerie", "Vitrerie et remplacement de vitre", "menuiseries", "fenetre", "Vitre cassée, double vitrage, miroir", "dès 150 €", 10,
    ["s", "Surface vitrée", "", 0.3, 10, 0.1, 1, "m²"], [150, 320], "Vitrage fourni posé", [90, 150],
    [["type", "Vitrage", "", [["simple", "Simple", "", 0.6], ["double", "Double vitrage", "", 1], ["securit", "Sécurit / feuilleté", "+30 %", 1.3]]], URG], [["film", "Film solaire", 40, 80, true]], [0, 0]);
  P("serrurerie", "Serrurerie et ouverture de porte", "menuiseries", "cle", "Porte claquée, serrure, blindage", "dès 120 €", 10,
    ["n", "Nombre de serrures", "", 1, 4, 1, 1, "serrure(s)"], [120, 380], "Intervention", [60, 120],
    [["travaux", "Travaux", "", [["ouverture", "Ouverture de porte", "", 0.8], ["cylindre", "Changement de cylindre", "", 1], ["multipoints", "Serrure 3 points", "×2", 2], ["blindage", "Blindage de porte", "×4", 4]]], URG], [], [0, 0]);
  P("garde-corps", "Garde-corps et ferronnerie", "menuiseries", "grille", "Garde-corps verre, inox, fer forgé", "dès 250 €/ml", 10,
    ["s", "Longueur", "", 1, 30, 0.5, 5, "ml"], [250, 550], "Garde-corps fourni posé", [200, 400],
    [["materiau", "Matériau", "", [["alu", "Aluminium", "", 0.9], ["inox", "Inox câbles", "", 1], ["verre", "Verre", "+30 %", 1.3], ["fer", "Fer forgé sur mesure", "+20 %", 1.2]]]], [], [0, 0]);

  // ---------- Toiture et façade ----------
  P("toiture-reparation", "Réparation de toiture et fuite", "toiture", "toit", "Tuiles cassées, infiltration, tempête", "dès 350 €", 10,
    ["s", "Surface à reprendre", "", 1, 40, 1, 5, "m²"], [60, 140], "Remplacement des éléments abîmés", [300, 600],
    [["couverture", "Couverture", "", [["tuile", "Tuiles", "", 1], ["ardoise", "Ardoise", "+30 %", 1.3], ["zinc", "Zinc / bac acier", "", 1.1]]], URG], [["nacelle", "Nacelle", 300, 700], ["bache", "Bâchage provisoire", 200, 500]], [0, 0]);
  P("demoussage", "Démoussage et traitement de toiture", "toiture", "toit", "Nettoyage, anti-mousse, hydrofuge", "dès 15 €/m²", 10,
    ["s", "Surface de toiture", "", 30, 300, 5, 100, "m²"], [15, 30], "Nettoyage et traitement", [150, 300],
    [["traitement", "Traitement", "", [["demoussage", "Démoussage + anti-mousse", "", 1], ["hydrofuge", "+ Hydrofuge", "+40 %", 1.4], ["peinture", "Peinture de toiture", "×1,8", 1.8]]]], [["gouttieres", "Nettoyage des gouttières", 150, 350]], [0, 0]);
  P("gouttieres", "Gouttières et zinguerie", "toiture", "toit", "Gouttières, descentes, bandeaux", "dès 40 €/ml", 10,
    ["s", "Longueur", "", 5, 100, 1, 25, "ml"], [40, 90], "Gouttières posées", [200, 400],
    [["materiau", "Matériau", "", [["pvc", "PVC", "", 0.7], ["alu", "Alu sans soudure", "", 1], ["zinc", "Zinc", "+30 %", 1.3]]]], [["descentes", "Descentes (par unité)", 90, 180, false], ["bandeau", "Habillage bandeaux (par ml)", 35, 70, false]], [80, 200]);
  P("charpente", "Charpente", "toiture", "toit", "Réparation, renforcement, traitement, création", "dès 1 500 €", 10,
    ["s", "Surface de toiture", "", 10, 250, 5, 80, "m²"], [45, 120], "Travaux de charpente", [800, 1500],
    [["travaux", "Travaux", "", [["traitement", "Traitement", "", 0.3], ["renfort", "Renforcement / réparation", "", 1], ["neuve", "Charpente neuve", "×1,8", 1.8]]]], [["expertise", "Diagnostic charpente", 250, 600]], [300, 800]);
  P("etancheite", "Étanchéité de toit-terrasse", "toiture", "toit", "Membrane, résine, balcon, végétalisation", "dès 70 €/m²", 10,
    ["s", "Surface", "", 5, 200, 5, 40, "m²"], [70, 140], "Étanchéité", [400, 900],
    [["systeme", "Système", "", [["bitume", "Bitume bicouche", "", 1], ["epdm", "Membrane EPDM", "", 1.05], ["resine", "Résine liquide", "", 1.1], ["vegetal", "Végétalisée", "+50 %", 1.5]]]], [["isolant", "Isolation", 35, 70, true], ["releves", "Relevés et évacuations", 300, 900]], [200, 500]);
  P("ravalement", "Ravalement de façade", "toiture", "mur", "Nettoyage, enduit, peinture, fissures", "dès 40 €/m²", 10,
    ["s", "Surface de façade", "", 30, 500, 5, 120, "m²"], [40, 95], "Ravalement", [800, 1600],
    [["travaux", "Travaux", "", [["nettoyage", "Nettoyage + hydrofuge", "", 0.5], ["peinture", "Peinture de façade", "", 1], ["enduit", "Nouvel enduit", "+40 %", 1.4], ["pierre", "Pierre de taille", "×1,8", 1.8]]], ETAT],
    [["echafaudage", "Échafaudage", 8, 15, true], ["fissures", "Traitement des fissures", 300, 1200]], [200, 600]);

  // ---------- Extérieur et jardin ----------
  P("allee", "Allée, cour et pavage", "exterieur", "sol", "Pavés, enrobé, béton désactivé, gravier", "dès 45 €/m²", 10,
    ["s", "Surface", "", 10, 400, 5, 50, "m²"], [45, 110], "Revêtement posé", [500, 1000],
    [["materiau", "Revêtement", "", [["gravier", "Gravier stabilisé", "", 0.5], ["enrobe", "Enrobé", "", 0.8], ["desactive", "Béton désactivé", "", 1], ["paves", "Pavés", "+20 %", 1.2]]]], [["bordures", "Bordures (par ml)", 25, 50, false], ["evacuation", "Caniveau et évacuation", 300, 900]], [300, 800]);
  P("cloture", "Clôture et portillon", "exterieur", "grille", "Grillage, panneaux, bois, brise-vue", "dès 45 €/ml", 10,
    ["s", "Longueur", "", 5, 150, 1, 30, "ml"], [45, 140], "Clôture posée", [200, 450],
    [["type", "Type", "", [["grillage", "Grillage souple", "", 0.4], ["rigide", "Panneaux rigides", "", 0.8], ["bois", "Bois / composite", "", 1.2], ["alu", "Aluminium", "+60 %", 1.6]]]], [["portillon", "Portillon", 400, 1100], ["muret", "Muret de soubassement (par ml)", 90, 180, false]], [100, 300]);
  P("portail", "Portail et motorisation", "exterieur", "grille", "Battant, coulissant, motorisé, interphone", "dès 1 500 €", 10,
    ["n", "Nombre de portails", "", 1, 2, 1, 1, "portail(s)"], [1200, 3200], "Portail fourni posé", [400, 900],
    [["type", "Ouverture", "", [["battant", "Battant", "", 1], ["coulissant", "Coulissant", "+15 %", 1.15]]], ["materiau", "Matériau", "", [["pvc", "PVC", "", 0.7], ["alu", "Aluminium", "", 1], ["fer", "Fer / acier", "", 1.1]]]],
    [["motor", "Motorisation", 600, 1500], ["visiophone", "Visiophone", 300, 800], ["piliers", "Piliers maçonnés", 600, 1500]], [0, 0]);
  P("porte-garage", "Porte de garage", "exterieur", "porte", "Sectionnelle, basculante, enroulable", "dès 1 400 €", 10,
    ["n", "Nombre de portes", "", 1, 3, 1, 1, "porte(s)"], [1100, 2600], "Porte fournie posée", [300, 600],
    [["type", "Type", "", [["basculante", "Basculante", "", 0.75], ["sectionnelle", "Sectionnelle", "", 1], ["enroulable", "Enroulable", "", 1.05]]]], [["motor", "Motorisation", 400, 900], ["isolee", "Panneaux isolés", 300, 700]], [80, 200]);
  P("jardin", "Aménagement de jardin", "exterieur", "arbre", "Création, gazon, massifs, arrosage", "dès 25 €/m²", 10,
    ["s", "Surface", "", 20, 2000, 10, 200, "m²"], [25, 60], "Aménagement paysager", [500, 1200],
    [["projet", "Projet", "", [["gazon", "Gazon", "", 0.5], ["creation", "Création complète", "", 1], ["synthetique", "Gazon synthétique", "×1,6", 1.6]]]], [["arrosage", "Arrosage automatique", 8, 16, true], ["plantes", "Haie (par ml)", 25, 60, false], ["entretien", "Entretien annuel", 600, 1800]], [200, 600]);
  P("elagage", "Élagage et abattage", "exterieur", "arbre", "Taille, abattage, dessouchage", "dès 250 €", 10,
    ["n", "Nombre d'arbres", "", 1, 20, 1, 2, "arbre(s)"], [200, 650], "Élagage ou abattage", [100, 250],
    [["hauteur", "Hauteur", "", [["petit", "Moins de 10 m", "", 0.7], ["moyen", "10 à 20 m", "", 1], ["grand", "Plus de 20 m", "+80 %", 1.8]]], ["travaux", "Travaux", "", [["elagage", "Élagage", "", 1], ["abattage", "Abattage", "+40 %", 1.4]]]],
    [["dessouchage", "Dessouchage (par souche)", 150, 450, false], ["evacuation", "Évacuation des végétaux", 150, 400]], [0, 0]);
  P("piscine", "Piscine", "exterieur", "vague", "Coque, béton, liner, rénovation", "dès 20 000 €", 20,
    ["s", "Surface du bassin", "", 10, 60, 1, 32, "m²"], [700, 1300], "Bassin (terrassement, structure, filtration)", [4000, 7000],
    [["type", "Type", "", [["coque", "Coque polyester", "", 0.9], ["beton", "Béton", "", 1.15], ["renov", "Rénovation (liner, filtration)", "", 0.25]]]],
    [["abri", "Abri de piscine", 6000, 18000], ["volet", "Volet roulant", 4000, 9000], ["chauffage", "Pompe à chaleur piscine", 2000, 4500], ["plage", "Plage (par m²)", 90, 180, false]], [0, 0]);
  P("terrassement", "Terrassement et viabilisation", "exterieur", "outil", "Décaissement, nivellement, tranchées", "dès 30 €/m³", 10,
    ["s", "Volume de terre", "", 5, 500, 5, 40, "m³"], [30, 70], "Terrassement", [500, 1000],
    [["sol", "Nature du sol", "", [["meuble", "Terre meuble", "", 1], ["argile", "Argile", "+20 %", 1.2], ["roche", "Roche", "×1,8", 1.8]]]], [["evacuation", "Évacuation des terres (par m³)", 20, 40, false], ["reseaux", "Tranchée réseaux (par ml)", 30, 70, false]], [300, 800]);
  P("abri-jardin", "Abri de jardin, carport, garage bois", "exterieur", "maison", "Abri, carport, studio de jardin", "dès 1 500 €", 20,
    ["s", "Surface", "", 4, 40, 1, 12, "m²"], [200, 650], "Structure fournie posée", [500, 1200],
    [["type", "Type", "", [["abri", "Abri de jardin", "", 0.6], ["carport", "Carport", "", 0.8], ["studio", "Studio / bureau isolé", "×2,2", 2.2]]]], [["dalle", "Dalle béton (par m²)", 70, 130, false], ["elec", "Électricité", 400, 1200]], [0, 0]);

  // ---------- Sécurité et accessibilité ----------
  P("alarme", "Alarme et vidéosurveillance", "securite", "bouclier", "Alarme, caméras, télésurveillance", "dès 700 €", 20,
    ["n", "Nombre de détecteurs ou caméras", "", 2, 20, 1, 6, "élément(s)"], [90, 220], "Équipements posés", [350, 700],
    [["type", "Système", "", [["alarme", "Alarme sans fil", "", 1], ["camera", "Caméras", "+30 %", 1.3], ["mixte", "Alarme + caméras", "+50 %", 1.5]]]], [["telesurveillance", "Télésurveillance (1re année)", 250, 450]], [0, 0]);
  P("monte-escalier", "Monte-escalier et accessibilité", "securite", "escalier", "Siège, plateforme, rampe, MaPrimeAdapt'", "dès 3 500 €", 5.5,
    ["n", "Nombre d'étages", "", 1, 3, 1, 1, "étage(s)"], [3000, 6500], "Équipement posé", [400, 800],
    [["type", "Type", "", [["droit", "Siège escalier droit", "", 1], ["tournant", "Escalier tournant", "×2", 2], ["plateforme", "Plateforme / élévateur", "×3", 3]]]], [["rampe", "Rampe d'accès extérieure", 800, 2500]], [0, 0]);
  P("detecteurs", "Détecteurs de fumée et CO", "securite", "bouclier", "DAAF, monoxyde de carbone", "dès 60 €", 20,
    ["n", "Nombre de détecteurs", "", 1, 10, 1, 2, "détecteur(s)"], [30, 80], "Détecteurs posés", [40, 80], [["type", "Type", "", [["daaf", "Fumée (DAAF)", "", 1], ["co", "Monoxyde de carbone", "", 1.4], ["relies", "Interconnectés", "+60 %", 1.6]]]], [], [0, 0]);

  // ---------- Diagnostics et traitements ----------
  P("diagnostic", "Diagnostics immobiliers", "traitements", "loupe", "Vente, location : DPE, amiante, plomb…", "Estimation dédiée", 20,
    ["n", "Nombre de diagnostics", "", 1, 10, 1, 5, "diagnostic(s)"], [60, 150], "Diagnostics", [0, 0], [], [], [0, 0], "Parcours Diagnostic.dc.html");
  P("traitement-bois", "Termites et insectes du bois", "traitements", "insecte", "Termites, capricornes, mérule", "dès 1 500 €", 10,
    ["s", "Surface traitée", "", 10, 250, 5, 80, "m²"], [18, 45], "Traitement curatif", [500, 1000],
    [["nuisible", "Problème", "", [["xylophages", "Capricornes, vrillettes", "", 0.8], ["termites", "Termites", "", 1], ["merule", "Mérule", "×2,5", 2.5]]]], [["preventif", "Barrière préventive (par ml)", 60, 120, false], ["diagnostic", "Diagnostic", 150, 400]], [100, 300]);
  P("nuisibles", "Nuisibles", "traitements", "insecte", "Rats, frelons, punaises, cafards", "dès 120 €", 10,
    ["n", "Nombre de passages", "", 1, 4, 1, 1, "passage(s)"], [100, 220], "Intervention", [40, 90],
    [["nuisible", "Nuisible", "", [["frelons", "Nid de frelons / guêpes", "", 1], ["rongeurs", "Rats, souris", "", 1.1], ["punaises", "Punaises de lit", "×2,5", 2.5], ["cafards", "Cafards", "", 1.3]]], URG], [["prevention", "Contrat de prévention", 150, 400]], [0, 0]);

  // ---------- Dépannage et petits travaux ----------
  P("petits-travaux", "Petits travaux et bricolage", "depannage", "outil", "Montage, fixations, petites réparations", "dès 45 €/h", 20,
    ["n", "Durée estimée", "", 1, 16, 1, 3, "heure(s)"], [45, 65], "Main-d'œuvre", [30, 60],
    [["nature", "Nature", "", [["montage", "Montage de meubles", "", 1], ["fixation", "Fixations, étagères, TV", "", 1], ["reparation", "Petites réparations", "", 1.1]]]], [["fournitures", "Petites fournitures", 20, 80]], [0, 0]);
  P("nettoyage-chantier", "Nettoyage de fin de chantier", "depannage", "outil", "Après travaux, avant emménagement", "dès 6 €/m²", 20,
    ["s", "Surface", "", 20, 300, 5, 80, "m²"], [6, 12], "Nettoyage", [80, 150], [["niveau", "Niveau", "", [["leger", "Léger", "", 0.8], ["complet", "Complet (vitres comprises)", "", 1], ["gros", "Gros chantier", "+50 %", 1.5]]]], [], [0, 0]);
  P("remise-en-etat", "Remise en état après sinistre", "depannage", "maison", "Dégât des eaux, incendie, inondation", "dès 1 500 €", 10,
    ["s", "Surface touchée", "", 5, 200, 5, 25, "m²"], [80, 220], "Remise en état (séchage, reprises, peinture)", [500, 1200],
    [["sinistre", "Sinistre", "", [["eau", "Dégât des eaux", "", 1], ["incendie", "Incendie / fumée", "+60 %", 1.6], ["inondation", "Inondation", "+30 %", 1.3]]]], [["assechement", "Assèchement", 300, 900], ["rapport", "Devis pour l'assurance", 0, 0]], [200, 600]);

  // ---------- Métiers spécialisés ----------
  P("pierre-marbre", "Pierre de taille, marbre et granit", "gros-oeuvre", "mur", "Restauration de pierre, plans et escaliers en marbre", "dès 150 €/m²", 10,
    ["s", "Surface ou longueur", "", 1, 100, 1, 8, "m²"], [150, 380], "Taille, pose ou restauration", [400, 900],
    [["travaux", "Travaux", "", [["restauration", "Restauration / rejointoiement", "", 0.6], ["pose", "Pose de pierre ou marbre", "", 1], ["sculpture", "Taille sur mesure", "×2", 2]]], GAMME], [["traitement", "Traitement hydrofuge", 12, 25, true]], [150, 400]);
  P("staff", "Moulures, corniches et staff", "interieur", "grille", "Création ou restauration de moulures", "dès 60 €/ml", 10,
    ["s", "Longueur de moulures", "", 2, 80, 1, 15, "ml"], [60, 140], "Moulures posées ou restaurées", [300, 600],
    [["travaux", "Travaux", "", [["pose", "Pose de moulures neuves", "", 1], ["restauration", "Restauration à l'identique", "+50 %", 1.5]]]], [["rosace", "Rosace", 250, 800], ["peinture", "Mise en peinture", 12, 25, true]], [80, 200]);
  P("platrerie", "Plâtrerie traditionnelle", "interieur", "mur", "Enduit plâtre, reprise de murs et plafonds", "dès 35 €/m²", 10,
    ["s", "Surface", "", 5, 200, 5, 30, "m²"], [35, 70], "Enduit plâtre", [250, 500], [ETAT], [["plafond", "Plafonds", 8, 18, true]], [100, 250]);
  P("bornage", "Bornage et relevé de géomètre", "gros-oeuvre", "plan", "Bornage, division, plan topographique", "dès 900 €", 20,
    ["n", "Nombre de limites ou lots", "", 1, 6, 1, 2, "limite(s)"], [350, 700], "Prestation du géomètre-expert", [500, 900],
    [["mission", "Mission", "", [["bornage", "Bornage", "", 1], ["division", "Division parcellaire", "+60 %", 1.6], ["topo", "Plan topographique", "", 0.8]]]], [["pv", "Procès-verbal et publication", 150, 400]], [0, 0]);
  P("etude-structure", "Étude de structure ou de sol", "gros-oeuvre", "plan", "Note de calcul, étude G2, bureau d'études", "dès 500 €", 20,
    ["n", "Nombre d'ouvrages étudiés", "", 1, 5, 1, 1, "ouvrage(s)"], [400, 900], "Étude et note de calcul", [150, 300],
    [["type", "Étude", "", [["structure", "Structure (poutre, mur porteur)", "", 1], ["sol", "Étude de sol G2", "×2,5", 2.5], ["thermique", "Étude thermique RE2020", "", 1.2]]]], [["visite", "Visite sur place", 150, 350]], [0, 0]);
  P("travaux-hauteur", "Travaux en hauteur et accès difficile", "toiture", "escalier", "Cordistes, nacelle, échafaudage", "dès 450 €", 20,
    ["n", "Durée estimée", "", 1, 10, 1, 1, "jour(s)"], [450, 850], "Équipe et matériel", [200, 450],
    [["moyen", "Moyen d'accès", "", [["corde", "Cordistes", "", 1], ["nacelle", "Nacelle", "", 1.1], ["echafaudage", "Échafaudage", "", 0.9]]]], [["autorisation", "Autorisation de voirie", 80, 250]], [0, 0]);
  P("forage", "Forage et puits", "exterieur", "cuve", "Forage domestique, pompe immergée", "dès 3 000 €", 20,
    ["s", "Profondeur", "", 10, 150, 5, 40, "m"], [60, 120], "Forage", [900, 1800],
    [["sol", "Terrain", "", [["meuble", "Sédimentaire", "", 1], ["roche", "Roche", "+40 %", 1.4]]]], [["pompe", "Pompe immergée", 800, 2000], ["declaration", "Déclaration en mairie", 0, 50]], [0, 0]);

  window.PH_CATALOGUE = { FAMILLES, FAMILLE_EXISTANTES, PRESTATIONS: LISTE };
})();
