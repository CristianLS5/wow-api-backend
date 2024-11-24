export interface FactionExpansion {
  id: number;
  name: string;
  expansion: string;
}

// Classic Reputations
export const classicFactions: FactionExpansion[] = [
  // Classic General
  { id: 87, name: "Bloodsail Buccaneers", expansion: "Classic" },
  { id: 609, name: "Cenarion Circle", expansion: "Classic" },
  { id: 529, name: "Argent Dawn", expansion: "Classic" },
  { id: 909, name: "Darkmoon Faire", expansion: "Classic" },
  { id: 70, name: "Syndicate", expansion: "Classic" },
  { id: 349, name: "Ravenholdt", expansion: "Classic" },
  { id: 749, name: "Hydraxian Waterlords", expansion: "Classic" },

  // Horde Forces
  { id: 729, name: "Frostwolf Clan", expansion: "Classic" },
  { id: 889, name: "Warsong Outriders", expansion: "Classic" },

  // Horde
  { id: 81, name: "Thunder Bluff", expansion: "Classic" },
  { id: 1133, name: "Bilgewater Cartel", expansion: "Classic" },
  { id: 68, name: "Undercity", expansion: "Classic" },
  { id: 2523, name: "Dark Talons", expansion: "Classic" },
  { id: 911, name: "Silvermoon City", expansion: "Classic" },
  { id: 76, name: "Orgrimmar", expansion: "Classic" },
  { id: 1352, name: "Huojin Pandaren", expansion: "Classic" },
  { id: 530, name: "Darkspear Trolls", expansion: "Classic" },
];

// The Burning Crusade Reputations
export const tbcFactions: FactionExpansion[] = [
  { id: 1012, name: "Ashtongue Deathsworn", expansion: "The Burning Crusade" },
  { id: 967, name: "The Violet Eye", expansion: "The Burning Crusade" },
  { id: 941, name: "The Mag'har", expansion: "The Burning Crusade" },
  { id: 1015, name: "Netherwing", expansion: "The Burning Crusade" },
  { id: 1038, name: "Ogri'la", expansion: "The Burning Crusade" },
  { id: 1031, name: "Sha'tari Skyguard", expansion: "The Burning Crusade" },
  {
    id: 1077,
    name: "Shattered Sun Offensive",
    expansion: "The Burning Crusade",
  },
  { id: 970, name: "Sporeggar", expansion: "The Burning Crusade" },
  { id: 932, name: "The Aldor", expansion: "The Burning Crusade" },
  { id: 933, name: "The Consortium", expansion: "The Burning Crusade" },
  { id: 934, name: "The Scryers", expansion: "The Burning Crusade" },
  { id: 942, name: "Cenarion Expedition", expansion: "The Burning Crusade" },
  { id: 989, name: "Keepers of Time", expansion: "The Burning Crusade" },
  { id: 1011, name: "Lower City", expansion: "The Burning Crusade" },
  { id: 935, name: "The Sha'tar", expansion: "The Burning Crusade" },
  { id: 947, name: "Thrallmar", expansion: "The Burning Crusade" },
];

// Wrath of the Lich King Reputations
export const wotlkFactions: FactionExpansion[] = [
  { id: 1052, name: "Horde Expedition", expansion: "Wrath of the Lich King" },
  {
    id: 1067,
    name: "The Hand of Vengeance",
    expansion: "Wrath of the Lich King",
  },
  { id: 1124, name: "The Sunreavers", expansion: "Wrath of the Lich King" },
  { id: 1064, name: "The Taunka", expansion: "Wrath of the Lich King" },
  { id: 1085, name: "Warsong Offensive", expansion: "Wrath of the Lich King" },
  { id: 1106, name: "Argent Crusade", expansion: "Wrath of the Lich King" },
  { id: 1090, name: "Kirin Tor", expansion: "Wrath of the Lich King" },
  {
    id: 1098,
    name: "Knights of the Ebon Blade",
    expansion: "Wrath of the Lich King",
  },
  {
    id: 1091,
    name: "The Wyrmrest Accord",
    expansion: "Wrath of the Lich King",
  },
  { id: 1156, name: "The Ashen Verdict", expansion: "Wrath of the Lich King" },
  { id: 1104, name: "Frenzyheart Tribe", expansion: "Wrath of the Lich King" },
  { id: 1073, name: "The Kalu'ak", expansion: "Wrath of the Lich King" },
  { id: 1105, name: "The Oracles", expansion: "Wrath of the Lich King" },
];

// Cataclysm Reputations
export const cataclysmFactions: FactionExpansion[] = [
  { id: 1204, name: "Avengers of Hyjal", expansion: "Cataclysm" },
  { id: 1172, name: "Dragonmaw Clan", expansion: "Cataclysm" },
  { id: 1158, name: "Guardians of Hyjal", expansion: "Cataclysm" },
  { id: 1178, name: "Hellscream's Reach", expansion: "Cataclysm" },
  { id: 1173, name: "Ramkahen", expansion: "Cataclysm" },
  { id: 1135, name: "The Earthen Ring", expansion: "Cataclysm" },
];

// Mists of Pandaria Reputations
export const mopFactions: FactionExpansion[] = [
  { id: 1492, name: "Emperor Shaohao", expansion: "Mists of Pandaria" },
  { id: 1269, name: "Golden Lotus", expansion: "Mists of Pandaria" },
  { id: 1270, name: "Shado-Pan", expansion: "Mists of Pandaria" },
  { id: 1388, name: "Sunreaver Onslaught", expansion: "Mists of Pandaria" },
  { id: 1359, name: "The Black Prince", expansion: "Mists of Pandaria" },
  { id: 1345, name: "The Lorewalkers", expansion: "Mists of Pandaria" },
];

// Warlords of Draenor Reputations
export const wodFactions: FactionExpansion[] = [
  { id: 1445, name: "Frostwolf Orcs", expansion: "Warlords of Draenor" },
];

// Legion Reputations
export const legionFactions: FactionExpansion[] = [
  { id: 2170, name: "Argussian Reach", expansion: "Legion" },
  { id: 2045, name: "Armies of Legionfall", expansion: "Legion" },
  { id: 2165, name: "Army of the Light", expansion: "Legion" },
  { id: 1900, name: "Court of Farondis", expansion: "Legion" },
  { id: 1883, name: "Dreamweavers", expansion: "Legion" },
  { id: 1828, name: "Highmountain Tribe", expansion: "Legion" },
  { id: 1859, name: "The Nightfallen", expansion: "Legion" },
  { id: 1894, name: "The Wardens", expansion: "Legion" },
  { id: 1948, name: "Valarjar", expansion: "Legion" },
];

// Battle for Azeroth Reputations
export const bfaFactions: FactionExpansion[] = [
  { id: 2164, name: "Champions of Azeroth", expansion: "Battle for Azeroth" },
  { id: 2415, name: "Rajani", expansion: "Battle for Azeroth" },
  { id: 2391, name: "Rustbolt Resistance", expansion: "Battle for Azeroth" },
  { id: 2156, name: "Talanji's Expedition", expansion: "Battle for Azeroth" },
  { id: 2157, name: "The Honorbound", expansion: "Battle for Azeroth" },
  { id: 2373, name: "The Unshackled", expansion: "Battle for Azeroth" },
  { id: 2163, name: "Tortollan Seekers", expansion: "Battle for Azeroth" },
  { id: 2417, name: "Uldum Accord", expansion: "Battle for Azeroth" },
  { id: 2158, name: "Voldunai", expansion: "Battle for Azeroth" },
  { id: 2103, name: "Zandalari Empire", expansion: "Battle for Azeroth" },
];

// Shadowlands Reputations
export const shadowlandsFactions: FactionExpansion[] = [
  { id: 2465, name: "The Wild Hunt", expansion: "Shadowlands" },
  { id: 2407, name: "The Ascended", expansion: "Shadowlands" },
  { id: 2410, name: "The Undying Army", expansion: "Shadowlands" },
  { id: 2413, name: "Court of Harvesters", expansion: "Shadowlands" },
  { id: 2432, name: "Ve'nari", expansion: "Shadowlands" },
  { id: 2439, name: "The Avowed", expansion: "Shadowlands" },
  { id: 2445, name: "The Ember Court", expansion: "Shadowlands" },
  { id: 2464, name: "Court of Night", expansion: "Shadowlands" },
  { id: 2462, name: "Stitchmasters", expansion: "Shadowlands" },
  { id: 2470, name: "Death's Advance", expansion: "Shadowlands" },
  { id: 2472, name: "The Archivists' Codex", expansion: "Shadowlands" },
  { id: 2478, name: "The Enlightened", expansion: "Shadowlands" },
];

export const shadowlandsEmberCourtFactions: FactionExpansion[] = [
  { id: 2446, name: "Baroness Vashj", expansion: "Shadowlands" },
  { id: 2447, name: "Lady Moonberry", expansion: "Shadowlands" },
  { id: 2448, name: "Mikanikos", expansion: "Shadowlands" },
  { id: 2449, name: "The Countess", expansion: "Shadowlands" },
  { id: 2450, name: "Alexandros Mograine", expansion: "Shadowlands" },
  { id: 2451, name: "Hunt-Captain Korayn", expansion: "Shadowlands" },
  { id: 2452, name: "Polemarch Adrestes", expansion: "Shadowlands" },
  { id: 2453, name: "Rendle and Cudgelface", expansion: "Shadowlands" },
  { id: 2454, name: "Choofa", expansion: "Shadowlands" },
  { id: 2455, name: "Cryptkeeper Kassir", expansion: "Shadowlands" },
  { id: 2456, name: "Droman Aliothe", expansion: "Shadowlands" },
  { id: 2457, name: "Grandmaster Vole", expansion: "Shadowlands" },
  { id: 2458, name: "Kleia and Pelagos", expansion: "Shadowlands" },
  { id: 2459, name: "Sika", expansion: "Shadowlands" },
  { id: 2460, name: "Stonehead", expansion: "Shadowlands" },
  { id: 2461, name: "Plague Deviser Marileth", expansion: "Shadowlands" },
];

// Dragonflight Reputations
export const dragonflightFactions: FactionExpansion[] = [
  { id: 2507, name: "Dragonscale Expedition", expansion: "Dragonflight" },
  { id: 2510, name: "Valdrakken Accord", expansion: "Dragonflight" },
  { id: 2511, name: "Iskaara Tuskarr", expansion: "Dragonflight" },
  { id: 2503, name: "Maruuk Centaur", expansion: "Dragonflight" },
  { id: 2517, name: "Wrathion", expansion: "Dragonflight" },
  { id: 2518, name: "Sabellian", expansion: "Dragonflight" },
  { id: 2550, name: "Cobalt Assembly", expansion: "Dragonflight" },
  { id: 2553, name: "Soridormi", expansion: "Dragonflight" },
  { id: 2574, name: "Dream Wardens", expansion: "Dragonflight" },
  { id: 2564, name: "Loamm Niffen", expansion: "Dragonflight" },
  { id: 2523, name: "Dark Talons", expansion: "Dragonflight" },
  {
    id: 2544,
    name: "Artisan's Consortium - Dragon Isles Branch",
    expansion: "Dragonflight",
  },
  { id: 2526, name: "Winterpelt Furbolg", expansion: "Dragonflight" },
  { id: 2568, name: "Glimmerogg Racer", expansion: "Dragonflight" },
  { id: 2615, name: "Azerothian Archives", expansion: "Dragonflight" },
];

// The War Within Reputations
export const warWithinFactions: FactionExpansion[] = [
  { id: 2590, name: "Council of Dornogal", expansion: "The War Within" },
  { id: 2570, name: "Hallowfall Arathi", expansion: "The War Within" },
  { id: 2594, name: "The Assembly of the Deeps", expansion: "The War Within" },
  { id: 2601, name: "The Weaver", expansion: "The War Within" },
  { id: 2605, name: "The General", expansion: "The War Within" },
  { id: 2607, name: "The Vizier", expansion: "The War Within" },
  { id: 2640, name: "Brann Bronzebeard", expansion: "The War Within" },
  { id: 2600, name: "The Severed Threads", expansion: "The War Within" },
];

export const factionExpansions: FactionExpansion[] = [
  ...classicFactions,
  ...tbcFactions,
  ...wotlkFactions,
  ...cataclysmFactions,
  ...mopFactions,
  ...wodFactions,
  ...legionFactions,
  ...bfaFactions,
  ...shadowlandsFactions,
  ...shadowlandsEmberCourtFactions,
  ...dragonflightFactions,
  ...warWithinFactions,
];
