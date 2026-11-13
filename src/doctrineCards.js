// CIVITAS v1.9 — doctrine cards (docs/CARD_DESIGN.md §6). These join the 54
// classic cards in doctrine (era-mode) cities only; classic games keep 54.
// Shape matches src/turningPoints.js cards. Hybrids get two doctrines in
// src/doctrines.js; `civic` cards have none.
const card=(id,name,domain,rarity,kind,description,effects={},opts={})=>({id,name,domain,rarity,kind,description,effects,eraOnly:true,...opts});

// Today's basic buildings as cards: buying and playing one awards a free
// project of that building (it answers needs like any other building).
const building=(id,kind,name,domain,rarity,description,opts={})=>card(id,name,domain,rarity,'landmark',description,{},{building:kind,...opts});
export const BUILDING_CARDS=[
  building('b_chapel','chapel','Parish Chapel','religion','common','Build a parish chapel: it serves the homes around it and counts for Faith.'),
  building('b_market','market','Market Square','trade','common','Build a market square: homes around it have a market, shops nearby thrive.'),
  building('b_granary','granary','Stone Granary','population','common','Build a granary: food reserves steady housing and draw settlers.'),
  building('b_guildhall','guildhall','Guild Hall','trade','uncommon','Build a guild hall: crafts and commerce gather around it.',{minYear:1500,maxYear:1749}),
  building('b_school','school','Public School','education','common','Build a school: it serves the homes around it and counts for Learning.',{minYear:1500,maxYear:1749}),
  building('b_garden','garden','Public Gardens','culture','common','Build public gardens: they clear the smoke around them and lift land value.',{minYear:1750}),
  building('b_powerworks','powerworks','Power Works','industry','uncommon','Build a power works: industry and transport gain reliable power.',{minYear:1850,maxYear:1949}),
  building('b_museum','museum','City Museum','culture','uncommon','Build a museum: heritage and prestige become a civic asset.',{minYear:1950}),
  building('b_town_hall','town_hall','Town Hall','civic','common','Build a town hall: administration lifts treasury income.',{minYear:1500,maxYear:1749}),
  building('b_clinic','clinic','City Clinic','civic','common','Build a clinic: it serves the homes around it.',{minYear:1750,maxYear:1849}),
  building('b_waterworks','waterworks','Waterworks','civic','uncommon','Build waterworks: services and resilience improve.',{minYear:1750,maxYear:1849}),
  building('b_station','station','Rail Station','civic','uncommon','Build a station: transport improves and shops gather around it.',{minYear:1850,maxYear:1949}),
  building('b_hospital','hospital','Public Hospital','civic','uncommon','Build a hospital: it serves the homes around it.',{minYear:1850,maxYear:1949}),
  building('b_library','library','Civic Library','civic','common','Build a library: it serves the homes around it.',{minYear:1950})
];

export const NEW_DOCTRINE_CARDS=[
  // Faith
  card('pilgrim_road','Pilgrim Road','religion','common','temporary','Pilgrims walk to your shrines for 40 years: settlers and trade follow.',{migration:.06,pilgrimage:.15,trade:.04},{durationPoints:2}),
  card('tithe_barn','Tithe Barn','religion','common','permanent','The parish collects its tithe: faith and the treasury grow.',{faith:.12,treasury:.06}),
  card('relic_saint','Relic of the Saint','religion','uncommon','temporary','A saint\'s relic draws the faithful for 40 years.',{faith:.2,pilgrimage:.25},{durationPoints:2}),
  card('confraternity','Confraternity','religion','uncommon','permanent','Lay brotherhoods care for the poor: services and prosperity improve.',{services:.15,faith:.1,prosperity:1}),
  // Industry
  card('water_mill','Water Mills','industry','common','permanent','Mills on every stream: manufacturing grows.',{industry:.15,industrialDevelopment:.1},{maxYear:1849}),
  card('tannery_row','Tanners\' Row','industry','common','permanent','Tanneries and dyers by the water: early manufacturing and revenue.',{industry:.12,treasury:.04}),
  card('rope_walk','Rope Walk','industry','common','permanent','A long rope walk by the quays: crafts and transport grow.',{industry:.1,transport:.06}),
  card('coal_wharf','Coal Wharf','industry','common','permanent','Coal by barge: factories run harder, and smokier.',{industry:.18,transport:.05,pollution:.1},{minYear:1750}),
  // Trade
  card('toll_bridge','Toll Bridges','trade','common','permanent','Tolls on the crossings: transport and the treasury grow.',{transport:.12,treasury:.06}),
  card('letters_credit','Letters of Credit','trade','uncommon','permanent','Merchants trust the city\'s paper: commerce and the treasury grow.',{trade:.15,treasury:.08}),
  card('bourse','The Bourse','trade','epic','synergy','The exchange of the realm: commerce grows with every Trade card.',{trade:.1}),
  // Arts (two early commons: Arts needs cards before 1750)
  card('mystery_plays','Mystery Plays','culture','common','temporary','The guilds stage the town\'s plays for 40 years: art, visitors and settlers.',{arts:.12,migration:.04,tourismIncome:.05},{durationPoints:2}),
  card('painters_guild','Painters\' Guild','culture','common','permanent','A guild of painters and carvers: the arts and their trade grow.',{arts:.12,trade:.05}),
  card('theatre_district','Theatre District','culture','uncommon','permanent','Stages and taverns: arts, visitors and good humour.',{arts:.18,tourismIncome:.1,prosperity:1}),
  // Learning
  card('printing_press','Printing Press','education','common','permanent','Books for the town: learning and new ideas spread.',{education:.12,innovation:.04}),
  card('almanac','The Almanac','education','common','permanent','Calendars, tides and harvests in print: a wiser, steadier town.',{education:.08,prosperity:1}),
  card('learned_society','Learned Society','education','uncommon','permanent','Physicians and astronomers meet weekly: learning and invention grow.',{education:.15,innovation:.06},{minYear:1600}),
  card('observatory','The Observatory','education','rare','permanent','A tower for the stars: learning and invention grow fast.',{education:.2,innovation:.1},{minYear:1600}),
  // People
  card('vertical_metropolis','Vertical Metropolis','population','epic','synergy','Tenements and towers: housing grows with every People card.',{housing:.1})
];

// Hybrids: two doctrines each (see OVERRIDES in src/doctrines.js).
export const HYBRID_CARDS=[
  card('workshop_renaissance','Workshop Renaissance','industry','rare','permanent','Craftsmen become artists: industry and the arts grow together.',{industry:.12,arts:.12}),
  card('pilgrim_fairs','Pilgrim Fairs','religion','uncommon','permanent','Feast days become fairs: faith and trade grow together.',{faith:.1,trade:.1}),
  card('model_village','Model Village','industry','uncommon','permanent','A factory town with gardens: industry and housing grow together.',{industry:.08,housing:.08,prosperity:1},{minYear:1750}),
  card('modernization_plan','Plan of Modernization','education','rare','permanent','Engineers redraw the city: renewal, services and housing.',{renewal:.2,services:.15,housing:.06},{minYear:1850}),
  card('cathedral_school','Cathedral School','religion','uncommon','permanent','The chapter teaches the town: faith and learning grow together.',{faith:.08,education:.1}),
  card('opera_house','Opera House','culture','rare','permanent','A grand house for music: the arts and new citizens.',{arts:.15,migration:.05},{minYear:1600}),
  card('patent_office','Patent Office','education','rare','permanent','Inventors protected: invention and industry grow together.',{innovation:.08,industry:.1},{minYear:1750})
];

export const DOCTRINE_ONLY_CARDS=[...BUILDING_CARDS,...NEW_DOCTRINE_CARDS,...HYBRID_CARDS];
