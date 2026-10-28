import { normalizeTitle } from './normalize.js';

// Default studio -> program mapping (spec Appendix A).
// A label "X @ host" matches only that admin host; a plain label matches any host.
export const DEFAULT_MAPPING = [
  { studio: 'AD4X', program: 'radicalcash', labels: ['AD4X', 'Casting @ admin.ad4x.com', 'Casting Party @ admin.ad4x.com', 'Pixie Dust @ admin.ad4x.com'], headers: ['AD4X'] },
  { studio: 'Alterotic', program: 'radicalcash', labels: ['Alterotic', 'Kyla Keys @ admin.alterotic.com', 'Madame Ouija @ admin.alterotic.com', 'Maya Romero @ admin.alterotic.com', 'Michelle Masque @ admin.alterotic.com', 'Robin Coffins @ admin.alterotic.com', 'Taylor Nicole @ admin.alterotic.com', 'TigerLilly @ admin.alterotic.com', 'Titi Ramone @ admin.alterotic.com'], headers: ['ALTEROTIC'] },
  { studio: 'AmazingFilms', program: 'radicalcash', labels: ['Amazing Films'], headers: ['AMAZING FILMS'] },
  { studio: 'BJRaw', program: 'radicalcash', labels: ['BJ Raw', 'BJ Raw BTS', 'BJ Raw Interviews', 'Reels @ admin.bjraw.com'], headers: ['BJ RAW'] },
  { studio: 'DickHDdaily', program: 'radicalcash', labels: ['Dick Hd Daily'], headers: ['DICK HD DAILY'] },
  { studio: 'DireDesires', program: 'radicalcash', labels: ['Dire Desires', 'Premium @ admin.diredesires.com', 'Sale @ admin.diredesires.com'], headers: ['DIRE DESIRES'] },
  { studio: 'GotFilled', program: 'radicalcash', labels: ['Gotfilled', 'Gotfilled BTS', 'Gotfilled Interviews', 'Reels @ admin.gotfilled.com'], headers: ['GOTFILLED'] },
  { studio: 'Hardwerk', program: 'radicalcash', labels: ['Hard Werk'], headers: ['HARDWERK'] },
  { studio: 'Inserted', program: 'radicalcash', labels: ['Inserted'], headers: ['INSERTED'] },
  { studio: 'JAV888', program: 'radicalcash', labels: ['JAV 888'], headers: ['JAV 888'] },
  { studio: 'JazztheStallion', program: 'radicalcash', labels: ['jazzthestallion', 'mobile content MA @ admin.jazzthestallion.com'], headers: ['JAZZ THE STALLION'] },
  { studio: 'Lezkey', program: 'radicalcash', labels: ['Lezkey'], headers: ['LEZKEY'] },
  { studio: 'LucidFlix', program: 'radicalcash', labels: ['Lucid flix'], headers: ['LUCID FLIX'] },
  { studio: 'NikkiZee', program: 'radicalcash', labels: ['Nikki Zee'], headers: ['NIKKI ZEE'] },
  { studio: 'Pervect', program: 'radicalcash', labels: ['Pervect'], headers: ['PERVECT'] },
  { studio: 'PurgatoryX', program: 'radicalcash', labels: ['Purgatory X'], headers: ['PURGATORY X'] },
  { studio: "Ricky'sRoom", program: 'radicalcash', labels: ["Ricky's Room", "Ricky's Room BTS"], headers: ["RICKY'S ROOM"] },
  { studio: 'Sextapes', program: 'radicalcash', labels: ['Sex Tapes @ admin.sextapes.com'], headers: ['SEX TAPES'] },
  { studio: 'YesGirlz', program: 'radicalcash', labels: ['Yes Girlz'], headers: ['YES GIRLZ'] },
  { studio: 'LegendaryX', program: 'radicalcash', labels: ['Legendaryx'], headers: ['LEGENDARYX'] },
  { studio: 'ZFilmz', program: 'radicalcash', labels: ['Z Filmz Originals'], headers: ['Z FILMZ ORIGINALS'] },
  { studio: 'MyBoobs', program: 'radicalcash', labels: ['My Boobs EU'], headers: ['MY BOOBS'] },
  { studio: 'MyBoobsUncensored', program: 'radicalcash', labels: ['My Boobs Uncensored'], headers: ['MY BOOBS UNCENSORED'] },
  { studio: 'Bemefi', program: 'radicalcash', labels: ['Bemefi'], headers: ['BEMEFI'] },
  { studio: 'POVPerv', program: 'radicalcash', labels: ['POV Perv'], headers: ['POV PERV'] },
  { studio: 'FantasyPOV', program: 'radicalcash', labels: ['FantasyPov'], headers: ['FANTASY POV'] },
  { studio: 'FreakMobMedia', program: 'radicalcash', labels: ['FreakMobMedia'], headers: ['FREAK MOB MEDIA'] },
  { studio: 'FreakMobHardcore', program: 'radicalcash', labels: ['FreakMobHardcore'], headers: ['FREAK MOB HARDCORE'] },
  { studio: 'SexyModernBull', program: 'radicalcash', labels: ['Sexy Modern Bull'], headers: ['SEXY MODERN BULL'] },
  { studio: 'WankItNow', program: 'radicalcash', labels: ['WankItNow'], headers: ['WANKITNOW'] },
  { studio: 'Javhub', program: 'radicalcash', labels: ['JavHub'], headers: ['JAVHUB'] },
  { studio: 'DripDropProd', program: 'radicalcash', labels: ['Drip Drop Prod', 'Membership Exclusive', 'Stories @ admin.dripdropprod.net', 'VOD Exclusive'], headers: ['DRIP DROP PROD'] },
  { studio: 'LukeCooper', program: 'radicalcash', labels: ['Luke CooperX'], headers: ['LUKE COOPERX'] },
  { studio: 'TheArtemixxx', program: 'radicalcash', labels: ['The Artemixxx'], headers: ['THEARTEMIXXX'] },
  { studio: 'LildPlayHouse', program: 'radicalcash', labels: ['Lildsplayhouse Tour'], headers: ["LIL D'S PLAYHOUSE"] },
  { studio: 'ComeInside', program: 'radicalcash', labels: ['Come Inside'], headers: ['COME INSIDE'] },
  { studio: 'TrashyNeverClassy', program: 'radicalcash', labels: ['trashyneverclassy'], headers: ['TRASHY NEVER CLASSY'] },
  { studio: 'Eroutique', program: 'radicalcash', labels: ['Eroutique'], headers: ['EROUTIQUE'] },
  { studio: 'SevereSex', program: 'radicalcash', labels: ['severesexfilms.com'], headers: ['SEVERE SEX FILMS'] },
  { studio: "Ricky's Resort", program: 'radicalcash', labels: ['rickysresort', 'RickysResort Season 2'], headers: ["RICKY'S RESORT"] },
  { studio: 'Milflicious', program: 'radicalcash', labels: ['Milflicious'], headers: ['MILFLICIOUS'] },
  { studio: 'PoleVixens', program: 'radicalcash', labels: ['PoleVixens'], headers: ['POLE VIXENS'] },
  { studio: 'SheHerGirls', program: 'radicalcash', labels: ['She Her Girls'], headers: ['SHE HER GIRLS'] },
  { studio: 'CollectiveCorruption', program: 'radicalcash', labels: ['CollectiveCorruption'], headers: ['COLLECTIVE CORRUPTION'] },
  { studio: 'MyAsianGFs', program: 'radicalcash', labels: ['Myasiangfs'], headers: ['MY ASIAN GFS'] },
  { studio: 'WydeSyde', program: 'radicalcash', labels: ['WydeSyde'], headers: ['WYDESYDE'] },
  { studio: 'MajestyNasty', program: 'radicalcash', labels: ['Majestynasty', 'mobile Majestynasty MA'], headers: ['MAJESTY NASTY'] },
  { studio: 'CosplayXGirls', program: 'radicalcash', labels: ['Cosplayxgirls'], headers: ['COSPLAYXGIRLS'] },
  { studio: 'BeastNKitty', program: 'radicalcash', labels: ['Beastnkitty'], headers: ['BEASTNKITTY'] },
  { studio: 'DoggNuts', program: 'radicalcash', labels: ['DoggNuts'], headers: ['DOGGNUTS'] },
  { studio: 'DoggVision', program: 'radicalcash', labels: ['Doggvision'], headers: ['DOGGVISION'] },
  { studio: 'GingerVixen', program: 'radicalcash', labels: ['gingervixen'], headers: ['GINGER VIXEN'] },
  { studio: 'GoGoWorldPorn', program: 'radicalcash', labels: ['Gogo World Porn'], headers: ['GOGO WORLD PORN'] },
  { studio: 'LaBellaDX', program: 'radicalcash', labels: ['Labelladx', 'Behind The Scenes @ admin.labelladx.com', 'Femdom Pegging', 'Slutwife Chronicles'], headers: ['LABELLADX'] },
  { studio: 'XXXTryout', program: 'radicalcash', labels: ['xxxtryout'], headers: ['XXXTRYOUT'] },
  { studio: 'InMelanin', program: 'radicalcash', labels: ['Inmelanin'], headers: ['INMELANIN'] },
  { studio: '2Girls1Camera', program: 'radicalcash', labels: ['2girls1camera'], headers: ['2GIRLS1CAMERA'] },
  { studio: 'BigGulpGirls', program: 'radicalcash', labels: ['BigGulpGirls'], headers: ['BIG GULP GIRLS'] },
  { studio: 'CougarSeason', program: 'radicalcash', labels: ['CougarSeason'], headers: ['COUGAR SEASON'] },
  { studio: 'DeepThroatSirens', program: 'radicalcash', labels: ['DeepthroatSirens'], headers: ['DEEPTHROAT SIRENS'] },
  { studio: 'FacialsForever', program: 'radicalcash', labels: ['FacialsForever'], headers: ['FACIALS FOREVER'] },
  { studio: 'PoundedPetite', program: 'radicalcash', labels: ['PoundedPetite'], headers: ['POUNDED PETITE'] },
  { studio: 'ShesBrandNew', program: 'radicalcash', labels: ['ShesBrandNew'], headers: ['SHES BRAND NEW'] },
  { studio: 'TWMClassics', program: 'radicalcash', labels: ['TWM Classics'], headers: ['TWM CLASSICS'] },
  { studio: 'TWMInterviews', program: 'radicalcash', labels: ['TWM Interviews'], headers: ['TWM INTERVIEWS'] },
  { studio: 'HobyBuchanon', program: 'radicalcash', labels: ['hobybuchanon', 'Hoby Buchanon BTS'], headers: ['HOBY BUCHANON'] },
  { studio: 'MariskaX', program: 'kennyspennies', labels: ['MariskaX', 'MariskaX Fans'], headers: ['MARISKA X'] },
  { studio: 'YummyCouple', program: 'kennyspennies', labels: ['Yummy Couple'], headers: ['YUMMY COUPLE'] },
  { studio: 'Red-XXX', program: 'kennyspennies', labels: ['Red-xxx'], headers: ['RED XXX'] },
  { studio: 'MelodyPleasure', program: 'kennyspennies', labels: ['MelodyPleasure'], headers: ['MELODY PLEASURE'] },
  { studio: 'Lady-Lucy', program: 'kennyspennies', labels: ['lady-lucy'], headers: ['LADY-LUCY'] },
  { studio: 'Nicole Dupapillon', program: 'kennyspennies', labels: ['Nicole Dupapillon'], headers: ['NICOLE DUPAPILLON'] },
  { studio: 'Dacada', program: 'kennyspennies', labels: ['Dacada'], headers: ['DACADA'] },
  { studio: 'NylonPerv', program: 'kennyspennies', labels: ['Nylon Perv'], headers: ['NYLON PERV'] },
  { studio: 'JamieYoung', program: 'kennyspennies', labels: ['Jamie-Young'], headers: ['JAMIE-YOUNG'] },
  { studio: 'Lady-Sonia', program: 'kennyspennies', labels: ['Lady Sonia', 'Lady Sonia Mobile'], headers: ['LADY SONIA'], guess: true },
  { studio: 'Katerina Hartlova', program: 'kennyspennies', labels: ['katerina-hartlova'], headers: ['KATERINA HARTLOVA'], guess: true },
  { studio: 'MasterNico', program: 'kennyspennies', labels: ['masternico'], headers: ['MASTERNICO'], guess: true },
  { studio: 'MeanFeetFetish', program: 'kennyspennies', labels: ['Mean Feet Fetish'], headers: ['MEAN FEET FETISH'], guess: true },
  { studio: 'MissMalorieSwitch', program: 'kennyspennies', labels: ['Miss Malorie Switch'], headers: ['MISS MALORIE SWITCH'], guess: true },
];

function labelMatches(label, entry) {
  const at = label.lastIndexOf(' @ ');
  const name = at === -1 ? label : label.slice(0, at);
  if (at !== -1 && entry.adminHost !== label.slice(at + 3).trim()) return false;
  return normalizeTitle(name) === normalizeTitle(entry.label);
}

export function studioForSite(mapping, program, entry) {
  for (const r of mapping) {
    if (r.program === program && r.labels.some((l) => labelMatches(l, entry))) return r.studio;
  }
  return null;
}

export function studioForHeader(mapping, program, header) {
  const h = normalizeTitle(header);
  for (const r of mapping) {
    if (r.program === program && r.headers.some((x) => normalizeTitle(x) === h)) return r.studio;
  }
  return null;
}
