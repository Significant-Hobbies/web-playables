import type { Preset } from './types';

export const PRESETS: Preset[] = [
  {
    id: 'modern-2026',
    name: 'The New World Order',
    description:
      'Global power is fragmenting. The US-China rivalry intensifies as the EU seeks strategic autonomy, Russia rebuilds, and regional powers rise. AI and climate change reshape every calculation.',
    year: 2026,
    scenario:
      "It is 2026. The global order is fracturing along new fault lines. The US and China are locked in technological and economic competition. Russia's war in Ukraine has reshaped European security. AI is transforming economies and warfare. Climate disasters strain global cooperation. Regional powers like India, Turkey, Saudi Arabia, and Brazil are asserting independence from traditional blocs. The old rules-based international order is giving way to something new and uncertain.",
    difficulty: 'Realistic',
    suggestedNations: [
      'USA',
      'China',
      'Russia',
      'India',
      'United Kingdom',
      'France',
      'Germany',
      'Brazil',
      'Turkey',
      'Japan',
    ],
    category: 'modern',
    icon: 'globe',
  },
  {
    id: 'ww2-1939',
    name: 'World War II',
    description:
      'September 1939. Germany has invaded Poland. Britain and France declare war. The world holds its breath as the deadliest conflict in human history begins.',
    year: 1939,
    scenario:
      'September 1, 1939. Nazi Germany has invaded Poland with overwhelming force, unleashing Blitzkrieg warfare. Britain and France have declared war on Germany. The Soviet Union, bound by the Molotov-Ribbentrop Pact, has invaded Poland from the east. Italy under Mussolini wavers. Japan is already at war in China. The United States remains isolationist but watches with growing alarm. The League of Nations has failed. Total war looms over every continent.',
    difficulty: 'Hardcore',
    suggestedNations: [
      'Germany',
      'United Kingdom',
      'France',
      'USA',
      'Russia',
      'Japan',
      'Italy',
      'China',
      'Poland',
      'Canada',
    ],
    category: 'historical',
    icon: 'war',
    storyPath: {
      id: 'blitzkrieg',
      name: 'The Second World War: Early Stages',
      description:
        'Guide your nation through the tumultuous opening years of the war, from the invasion of Poland to the Battle of Britain.',
      sourceNotes:
        'Based on: Shirer, The Rise and Fall of the Third Reich (1960); Beevor, The Second World War (2012); Churchill, The Second World War memoirs.',
      suggestedNext: ['ww1-1914', 'cold-war-1962', 'napoleon-1799'],
      steps: [
        {
          id: 'poland-invasion',
          year: 1939,
          title: 'The Invasion of Poland',
          description:
            'Germany has invaded Poland. As a major power, you must formulate a response to this aggression.',
          objective:
            "Respond to the invasion of Poland (e.g., 'Mobilize forces to defend Poland', 'Begin strategic bombing of German industrial centers').",
          hint: 'Direct military intervention in Poland is difficult, but you can begin to apply pressure elsewhere.',
        },
        {
          id: 'battle-of-france',
          year: 1940,
          title: 'The Fall of France',
          description:
            "After a period of quiet known as the 'Phoney War', Germany has launched a surprise attack through the Ardennes, bypassing the Maginot Line and overwhelming French and British forces.",
          objective: 'Manage the evacuation from Dunkirk and establish a government-in-exile.',
          hint: "Saving your army is more important than saving territory you've already lost.",
        },
        {
          id: 'battle-of-britain',
          year: 1940,
          title: 'Their Finest Hour',
          description:
            'With France defeated, Britain stands alone. The German Luftwaffe is launching a massive air campaign to pave the way for an invasion.',
          objective: 'Defend British airspace and prevent a German invasion.',
          hint: 'Focus your resources on aircraft production and radar technology.',
        },
      ],
    },
  },
  {
    id: 'cold-war-1962',
    name: 'The Cuban Missile Crisis',
    description:
      "October 1962. Soviet nuclear missiles discovered in Cuba. The world stands on the brink of nuclear annihilation. Every decision could be humanity's last.",
    year: 1962,
    scenario:
      'October 16, 1962. U-2 reconnaissance has confirmed Soviet nuclear missiles in Cuba, just 90 miles from Florida. President Kennedy convenes ExComm. The Joint Chiefs want an invasion. Khrushchev insists the missiles are defensive. Castro prepares for invasion. NATO allies are nervous. The world is 13 days from potential nuclear holocaust. Every diplomatic signal, military movement, and backroom deal could determine the fate of civilization.',
    difficulty: 'Hardcore',
    suggestedNations: [
      'USA',
      'Russia',
      'Cuba',
      'United Kingdom',
      'France',
      'China',
      'Germany',
      'Turkey',
      'Brazil',
      'India',
    ],
    category: 'historical',
    icon: 'nuke',
    storyPath: {
      id: 'thirteen-days',
      name: 'Thirteen Days',
      description:
        'Navigate the most dangerous crisis in human history. Every step brings you closer to either peace or total annihilation.',
      sourceNotes:
        'Based on: Kennedy, Thirteen Days: A Memoir of the Cuban Missile Crisis (1969); Allison & Zelikow, Essence of Decision (1999); declassified ExComm transcripts.',
      suggestedNext: ['ww2-1939', 'modern-2026', 'ai-awakening-2030'],
      steps: [
        {
          id: 'discovery',
          year: 1962,
          title: 'The Discovery',
          description:
            'Nuclear missiles have been spotted in Cuba. You must decide how to respond before the missiles become operational.',
          objective:
            "Issue a command to address the missile discovery (e.g., 'Declare a naval blockade of Cuba' or 'Demand Khrushchev remove the missiles').",
          hint: "A 'quarantine' or blockade is less aggressive than an air strike but still shows resolve.",
        },
        {
          id: 'escalation',
          year: 1962,
          title: 'The Escalation',
          description:
            'Tensions are at a breaking point. Soviet ships are approaching the blockade line. The world holds its breath.',
          objective: 'Manage the naval encounter or open a back-channel for negotiation.',
          hint: 'Back-channels (like the Scali-Fomin connection) can bypass the public posturing.',
        },
        {
          id: 'resolution',
          year: 1962,
          title: 'The Brink of Peace',
          description:
            'A deal is on the table: missiles for missiles. Remove the Jupiter missiles from Turkey in exchange for the removal of missiles from Cuba.',
          objective: 'Finalize the agreement to end the crisis.',
          hint: 'The trade must be kept secret to avoid political fallout with NATO.',
        },
      ],
    },
  },
  {
    id: 'rome-fall-476',
    name: 'The Fall of Rome',
    description:
      'The Western Roman Empire crumbles. Barbarian kingdoms rise from its ashes. Can you preserve civilization or forge a new world from the ruins?',
    year: 476,
    scenario:
      'The year is 476 AD. Romulus Augustulus, the last Western Roman Emperor, has been deposed by Odoacer. The Western Empire is no more, but the Eastern Roman Empire in Constantinople endures under Emperor Zeno. Barbarian kingdoms carve up the former Roman territories: the Visigoths hold Hispania, the Franks expand in Gaul, the Vandals control North Africa. The Ostrogoths eye Italy. The Sassanid Empire threatens the East. The Pope in Rome gains spiritual authority as temporal power collapses. Trade routes falter, cities shrink, but new civilizations are being born.',
    difficulty: 'Realistic',
    suggestedNations: [
      'Italy',
      'Turkey',
      'France',
      'Spain',
      'United Kingdom',
      'Germany',
      'Egypt',
      'Iran',
      'Tunisia',
      'Greece',
    ],
    category: 'historical',
    icon: 'crown',
  },
  {
    id: 'exploration-1492',
    name: 'Age of Exploration',
    description:
      'Columbus has reached the New World. European powers race to claim continents, forge trade empires, and reshape the globe forever.',
    year: 1492,
    scenario:
      "October 1492. Christopher Columbus has made landfall in the Caribbean, believing he has reached Asia. Spain and Portugal are the dominant naval powers, their rivalry arbitrated by the Pope. England, France, and the Netherlands watch enviously. The Ottoman Empire controls Eastern Mediterranean trade routes, making the search for western passages to Asia urgent. The Aztec and Inca empires flourish in the Americas, unaware of the approaching storm. China under the Ming Dynasty has turned inward after Zheng He's great voyages. The world is about to be connected for the first time.",
    difficulty: 'Realistic',
    suggestedNations: [
      'Spain',
      'Portugal',
      'United Kingdom',
      'France',
      'Netherlands',
      'Turkey',
      'Italy',
      'China',
      'Mexico',
      'Peru',
    ],
    category: 'historical',
    icon: 'ship',
  },
  {
    id: 'ww1-1914',
    name: 'The Great War',
    description:
      'Archduke Franz Ferdinand is dead. The alliance system drags Europe into a war that will shatter empires and birth the modern world.',
    year: 1914,
    scenario:
      "June 28, 1914. Archduke Franz Ferdinand of Austria-Hungary has been assassinated in Sarajevo. The alliance system activates like a chain reaction: Austria-Hungary issues an ultimatum to Serbia. Russia mobilizes to defend Serbia. Germany backs Austria and activates the Schlieffen Plan. France is pulled in by alliance. Belgium's neutrality is violated. Britain enters to honor the Treaty of London. The Ottoman Empire wavers between neutrality and joining the Central Powers. Italy debates which side serves its interests. Japan eyes German colonies in the Pacific. The war everyone expected to be 'over by Christmas' is about to consume a generation.",
    difficulty: 'Hardcore',
    suggestedNations: [
      'United Kingdom',
      'France',
      'Germany',
      'Russia',
      'Austria',
      'Turkey',
      'Italy',
      'USA',
      'Japan',
      'Serbia',
    ],
    category: 'historical',
    icon: 'war',
    storyPath: {
      id: 'war-to-end-wars',
      name: 'The War to End All Wars',
      description:
        "Steer your nation through the catastrophic opening of the 20th century's first global conflict — from the July Crisis to the trenches of the Western Front.",
      sourceNotes:
        'Based on: MacMillan, The War That Ended Peace (2013); Keegan, The First World War (1998); Tuchman, The Guns of August (1962).',
      suggestedNext: ['ww2-1939', 'napoleon-1799', 'renaissance-1453'],
      steps: [
        {
          id: 'july-crisis',
          year: 1914,
          title: 'The July Crisis',
          description:
            'The assassination of Archduke Franz Ferdinand has set off a diplomatic crisis. Austria-Hungary is issuing ultimatums. The alliance system is about to activate like a chain reaction.',
          objective:
            "Issue a diplomatic response to the assassination crisis (e.g., 'Reject Austria's ultimatum and mobilize forces' or 'Urge Austria to accept arbitration').",
          hint: 'Every major power assumed the war would be short. Mobilization timetables made de-escalation almost impossible once armies started moving.',
        },
        {
          id: 'western-front',
          year: 1915,
          title: 'The Trenches',
          description:
            'The war of movement has ground to a halt. From Switzerland to the English Channel, a continuous line of trenches has been dug. The Schlieffen Plan has failed. Millions are now locked in industrial attrition warfare.',
          objective:
            "Develop a strategy to break the stalemate (e.g., 'Launch a major offensive at Verdun', 'Deploy new poison gas weapons', 'Open a new front at Gallipoli').",
          hint: 'Technological innovation — tanks, aircraft, artillery coordination — will eventually crack the stalemate, but at enormous cost.',
        },
        {
          id: 'armistice',
          year: 1918,
          title: 'The Final Push',
          description:
            'After years of attrition, the German Spring Offensive has failed. American troops are arriving in force. Revolution is spreading. The Central Powers are collapsing from within.',
          objective:
            "Bring the war to an end (e.g., 'Accept armistice terms', 'Push for a final offensive before negotiations', 'Support democratic reforms to stabilize Germany').",
          hint: 'The terms of peace will shape the next generation — too harsh and you plant the seeds of the next war.',
        },
      ],
    },
  },
  {
    id: 'napoleon-1799',
    name: 'Rise of Napoleon',
    description:
      "A young Corsican general seizes power in revolutionary France. Europe's monarchies unite against him. An age of empires and revolution begins.",
    year: 1799,
    scenario:
      "November 1799. Napoleon Bonaparte has overthrown the Directory in a coup d'etat and declared himself First Consul of France. The French Revolution has terrified every monarchy in Europe. Coalition wars rage. Britain rules the seas but struggles on land. Austria and Prussia contest Central Europe. Russia under Tsar Paul I is unpredictable. The Ottoman Empire declines. Spain is weakened. The Haitian Revolution shakes colonial powers. Revolutionary ideals of liberty, equality, and fraternity clash with the old order of kings and empires. Napoleon dreams of remaking Europe.",
    difficulty: 'Realistic',
    suggestedNations: [
      'France',
      'United Kingdom',
      'Austria',
      'Russia',
      'Spain',
      'Germany',
      'Italy',
      'Netherlands',
      'Turkey',
      'Egypt',
    ],
    category: 'historical',
    icon: 'crown',
    storyPath: {
      id: 'age-of-napoleon',
      name: 'The Age of Napoleon',
      description:
        'From coup to empire to exile — navigate the rise and peak of Napoleonic Europe and the revolutionary ideals that reshaped the world.',
      sourceNotes:
        'Based on: Roberts, Napoleon: A Life (2014); Schom, Napoleon Bonaparte (1997); Chandler, The Campaigns of Napoleon (1966).',
      suggestedNext: ['ww1-1914', 'renaissance-1453', 'exploration-1492'],
      steps: [
        {
          id: 'coup-brumaire',
          year: 1799,
          title: 'The Coup of 18 Brumaire',
          description:
            'Napoleon has seized power from the Directory. France is exhausted by revolution and war. He must now consolidate authority and present himself as the savior of the Republic.',
          objective:
            "Consolidate Napoleon's grip on power (e.g., 'Negotiate the Concordat with the Pope', 'Reform the legal code', 'Sign the Treaty of Amiens with Britain').",
          hint: "Napoleon's genius was making enemies accept peace on his terms — each victory bought France time to reform.",
        },
        {
          id: 'empire',
          year: 1804,
          title: 'Emperor of the French',
          description:
            "Napoleon has crowned himself Emperor. The Continental System is strangling British trade. Europe's old monarchies view him as an existential threat to their legitimacy.",
          objective:
            "Establish French dominance over Europe (e.g., 'Defeat Austria and Prussia at Austerlitz', 'Install relatives as kings of dependent states', 'Expand the Continental Blockade').",
          hint: 'The Continental System was double-edged — it hurt Britain but devastated French allies and sowed resentment across Europe.',
        },
        {
          id: 'grand-coalition',
          year: 1805,
          title: 'The Grand Coalition',
          description:
            "Britain, Austria, Prussia, Russia, and Sweden have united against France. The campaign of 1805 will determine whether Napoleon's empire survives or the old order is restored.",
          objective:
            "Defeat the Coalition and impose a lasting peace on Europe (e.g., 'March on Vienna', 'Destroy the Russian army at Austerlitz', 'Offer peace terms to Austria').",
          hint: "Napoleon's strength was speed and decisive battle — avoid protracted sieges and let his corps system outmaneuver larger but slower enemy armies.",
        },
      ],
    },
  },
  {
    id: 'zombie-2026',
    name: 'The Dead Rising',
    description:
      'A mysterious pathogen turns the dead into predators. Governments collapse. Civilization fractures. Only the cunning survive.',
    year: 2026,
    scenario:
      'Patient Zero was identified in a remote research facility. Within weeks, a mysterious pathogen spread globally through air travel. The infected become aggressive and mindless within hours. Major cities fell first - dense populations became death traps. Governments enacted martial law, then collapsed. Military units fragment between those defending civilians and those seizing power. Nuclear powers face the terrible question of whether to sterilize infected zones. Small fortified communities become the last bastions of civilization. International cooperation is virtually impossible. Resources dwindle. Winter offers temporary respite in northern regions. The dead do not negotiate.',
    difficulty: 'Hardcore',
    suggestedNations: [
      'USA',
      'Russia',
      'United Kingdom',
      'Japan',
      'Australia',
      'Switzerland',
      'New Zealand',
      'Canada',
      'South Korea',
      'Norway',
    ],
    category: 'fictional',
    icon: 'skull',
  },
  {
    id: 'alt-soviet-1995',
    name: 'The USSR Endures',
    description:
      "What if the Soviet Union never fell? Gorbachev's reforms succeeded. Two superpowers face off in a transformed Cold War with new technologies.",
    year: 1995,
    scenario:
      "It is 1995, but history diverged in 1991. Gorbachev's reforms succeeded - the Soviet Union restructured but survived as a democratic socialist federation. The Cold War continues but has thawed considerably. Both superpowers race to harness the new internet technology. China, emboldened by its own reforms, becomes a third pole of power. The European Union struggles to define itself between two giants. The Middle East remains volatile after the Gulf War. Africa sees a wave of democratic transitions. Space cooperation programs hint at a new era, but old suspicions run deep. Nuclear arsenals remain on hair-trigger alert.",
    difficulty: 'Realistic',
    suggestedNations: [
      'USA',
      'Russia',
      'China',
      'Germany',
      'Japan',
      'United Kingdom',
      'France',
      'India',
      'Brazil',
      'South Africa',
    ],
    category: 'alternate',
    icon: 'flag',
  },
  {
    id: 'climate-2040',
    name: 'The Great Collapse',
    description:
      '2040. Climate tipping points cascade. Mass migration reshapes borders. Resource wars erupt. Can you lead your nation through the crisis of the century?',
    year: 2040,
    scenario:
      "The year is 2040. The worst climate predictions have come true. The Arctic is ice-free in summer. Sea levels have risen 0.5 meters, flooding major coastal cities. The Amazon rainforest has crossed a tipping point and is becoming savanna. Extreme weather has devastated global agriculture. Over 200 million climate refugees are on the move. Water wars rage in Central Asia and the Middle East. The Sahel has become uninhabitable. Wealthy nations build walls while poor nations collapse. A few countries have adapted through massive investment in green technology and nuclear power. International institutions have fractured under the strain. Military conflicts over water, arable land, and habitable territory are escalating. This is the century's defining crisis.",
    difficulty: 'Hardcore',
    suggestedNations: [
      'India',
      'USA',
      'China',
      'Brazil',
      'Germany',
      'Nigeria',
      'Russia',
      'Australia',
      'Indonesia',
      'Egypt',
    ],
    category: 'alternate',
    icon: 'fire',
  },
  {
    id: 'three-kingdoms-220',
    name: 'Three Kingdoms',
    description:
      'The Han Dynasty collapses. Warlords carve China into three rival kingdoms. Strategy, betrayal, and legendary heroes define an age.',
    year: 220,
    scenario:
      "The year is 220 AD. The Han Dynasty has formally ended. China splinters into three kingdoms: Wei in the north under the cunning Cao Cao's descendants, Shu in the southwest led by the idealistic Liu Bei's legacy and the genius strategist Zhuge Liang, and Wu in the southeast under the Sun family. The Roman Empire is at its height in the West. The Parthian Empire controls Persia. Trade flows along the Silk Road connecting East and West. Nomadic tribes pressure China's northern borders. Each kingdom claims the Mandate of Heaven and the right to reunify China. Brilliant strategists, legendary warriors, and ruthless politicians clash in one of history's greatest three-way struggles.",
    difficulty: 'Realistic',
    suggestedNations: [
      'China',
      'Mongolia',
      'Vietnam',
      'South Korea',
      'Japan',
      'India',
      'Iran',
      'Turkey',
      'Italy',
      'Egypt',
    ],
    category: 'historical',
    icon: 'sword',
  },
  {
    id: 'space-race-2035',
    name: 'The New Space Race',
    description:
      "Mars colonization has begun. Nations and corporations compete for the solar system's resources. Earth's conflicts extend into orbit.",
    year: 2035,
    scenario:
      "The year is 2035. SpaceX established the first permanent Mars colony in 2032, but China's CNSA landed its own mission months later. A new space race between the US, China, ESA, India, and private corporations is in full swing. Lunar mining operations provide Helium-3 for experimental fusion reactors. Space-based solar power stations orbit Earth. Military satellites and anti-satellite weapons create tension. The Outer Space Treaty of 1967 is considered obsolete. Asteroid mining promises unlimited resources but raises questions about who owns space. A new frontier of human civilization is opening - and with it, new conflicts over who controls humanity's future among the stars.",
    difficulty: 'Realistic',
    suggestedNations: [
      'USA',
      'China',
      'India',
      'Russia',
      'Japan',
      'France',
      'Germany',
      'South Korea',
      'United Kingdom',
      'Brazil',
    ],
    category: 'alternate',
    icon: 'rocket',
  },
  {
    id: 'mongol-1206',
    name: 'The Mongol Storm',
    description:
      'Temujin unites the steppe tribes and takes the name Genghis Khan. The largest contiguous land empire in history is about to be born.',
    year: 1206,
    scenario:
      'The year is 1206. Temujin has united the warring Mongol and Turkic tribes of the steppe, and at a great kurultai he has been proclaimed Genghis Khan — universal ruler. His disciplined cavalry armies, organized into tumens of ten thousand, are the most mobile and lethal fighting force the world has ever seen. The Jin Dynasty controls northern China but is weakened by corruption. The Khwarezmian Empire rules Central Asia and Persia. The Song Dynasty flourishes in southern China. The Abbasid Caliphate holds spiritual authority in Baghdad. Crusader states cling to the Levant. Russia is a patchwork of feuding principalities. None suspect that within a generation, Mongol armies will reach from Korea to Hungary, reshaping civilizations and connecting East and West along the Silk Road as never before.',
    difficulty: 'Hardcore',
    suggestedNations: [
      'Mongolia',
      'China',
      'Iran',
      'Russia',
      'Turkey',
      'India',
      'South Korea',
      'Iraq',
      'Poland',
      'Egypt',
    ],
    category: 'historical',
    icon: 'sword',
  },
  {
    id: 'renaissance-1453',
    name: 'Dawn of the Renaissance',
    description:
      'Constantinople has fallen. The medieval world is ending. Art, science, and ambition herald a new age of human possibility.',
    year: 1453,
    scenario:
      "May 29, 1453. Constantinople, the last bastion of the Roman Empire, has fallen to Sultan Mehmed II and his Ottoman armies. The shock reverberates across Christendom. Greek scholars flee west, carrying ancient manuscripts that will fuel the Italian Renaissance. In Florence, the Medici family patronizes artists and thinkers. Gutenberg is perfecting his printing press in Mainz. The Hundred Years' War between England and France nears its end. Spain's Reconquista is pushing the Moors south. Portugal under Prince Henry the Navigator explores the African coast. The feudal order is cracking as trade cities grow wealthy and gunpowder renders castle walls obsolete. A new world of ideas, exploration, and power is dawning.",
    difficulty: 'Realistic',
    suggestedNations: [
      'Turkey',
      'Italy',
      'France',
      'United Kingdom',
      'Spain',
      'Portugal',
      'Germany',
      'Austria',
      'Russia',
      'Egypt',
    ],
    category: 'historical',
    icon: 'crown',
  },
  {
    id: 'viking-793',
    name: 'The Viking Age',
    description:
      'Norse longships descend on Lindisfarne. The Viking Age begins — an era of raiders, traders, explorers, and kingdom-builders.',
    year: 793,
    scenario:
      "June 8, 793 AD. Norse raiders have sacked the holy monastery of Lindisfarne off the coast of Northumbria, stunning the Christian world. It is the opening act of the Viking Age. Scandinavian warriors, traders, and explorers will reshape Europe over the next three centuries. Charlemagne's Frankish Empire dominates Western Europe but will soon fragment among his grandsons. The Anglo-Saxon kingdoms of England are divided and vulnerable. The Abbasid Caliphate is at its zenith in Baghdad. The Byzantine Empire endures in Constantinople. Ireland is a patchwork of warring kingdoms. The Norse themselves are not unified — Denmark, Norway, and Sweden are collections of competing jarls and petty kings. From Iceland to Constantinople, from Newfoundland to the Volga, the Vikings will leave their mark on history.",
    difficulty: 'Realistic',
    suggestedNations: [
      'Norway',
      'Denmark',
      'Sweden',
      'United Kingdom',
      'France',
      'Ireland',
      'Russia',
      'Turkey',
      'Germany',
      'Spain',
    ],
    category: 'historical',
    icon: 'ship',
  },
  {
    id: 'fracture-2027',
    name: 'The Fracturing Alliance',
    description:
      '2027. NATO is splitting. The EU fragments. Old alliances crumble as new power blocs emerge in a multipolar world.',
    year: 2027,
    scenario:
      "It is 2027. The Western alliance system that has underpinned global order since 1945 is fracturing. NATO members disagree on threats — some prioritize Russia, others China, others terrorism. The EU faces internal revolt as populist governments in several member states challenge Brussels. The US is pivoting to the Indo-Pacific, leaving European allies feeling abandoned. Turkey plays all sides. France pushes for European strategic autonomy. Germany is caught between economic dependence on China and security dependence on America. Meanwhile, China and Russia deepen their partnership. India charts its own course. The Global South demands a greater voice. BRICS expands. The dollar's dominance is challenged. Climate disasters compound every crisis. The old order is dying, and the new one is not yet born.",
    difficulty: 'Realistic',
    suggestedNations: [
      'USA',
      'France',
      'Germany',
      'United Kingdom',
      'Turkey',
      'China',
      'Russia',
      'India',
      'Japan',
      'Brazil',
    ],
    category: 'modern',
    icon: 'globe',
  },
  {
    id: 'byzantine-1204',
    name: 'The Byzantine Resurgence',
    description:
      'What if the Fourth Crusade never sacked Constantinople? The Byzantine Empire reforms and rises to challenge both Crusaders and Turks.',
    year: 1204,
    scenario:
      'It is 1204, but history has diverged. The Fourth Crusade, diverted by Venetian scheming, was turned back at the last moment by a papal intervention. Constantinople stands unscathed. Emperor Alexios V, galvanized by the near-disaster, launches sweeping military and administrative reforms. The Byzantine Empire begins to reclaim its former glory, reconquering lost territories in Anatolia and the Balkans. The Seljuk Turks face a resurgent Eastern Rome. Venice and Genoa compete for Byzantine trade favors rather than plunder. The Crusader states in the Levant find themselves caught between a revitalized Byzantium and Ayyubid Egypt. The Mongol storm approaches from the east. Can Byzantium rise again to become the dominant Mediterranean power, or will old corruption and new enemies bring it down?',
    difficulty: 'Realistic',
    suggestedNations: [
      'Turkey',
      'Italy',
      'Greece',
      'France',
      'Egypt',
      'United Kingdom',
      'Germany',
      'Iran',
      'Russia',
      'Spain',
    ],
    category: 'alternate',
    icon: 'crown',
  },
  {
    id: 'pax-britannica-1900',
    name: 'Pax Britannica Eternal',
    description:
      'What if the British Empire never declined? In 1900, Britain tightens its grip on the world. But can any empire last forever?',
    year: 1900,
    scenario:
      "It is 1900, and the British Empire is at its absolute zenith — but in this timeline, it is even stronger. Strategic marriages, diplomatic masterstrokes, and industrial innovation have prevented the rise of serious challengers. Germany was kept divided. The US remains a junior partner. Russia's expansion was checked in the Great Game. Japan is a close ally rather than a rival. The Empire controls a quarter of the world's land and a third of its population. The Royal Navy is unchallenged. But cracks are showing: colonial subjects demand self-governance, socialist movements grow in industrial cities, new technologies like the automobile and airplane threaten to shift power. Can Britannia maintain its global hegemony into the 20th century, or will the forces of nationalism, ideology, and technology tear the greatest empire apart?",
    difficulty: 'Realistic',
    suggestedNations: [
      'United Kingdom',
      'France',
      'Germany',
      'Russia',
      'USA',
      'Japan',
      'India',
      'Turkey',
      'China',
      'Australia',
    ],
    category: 'alternate',
    icon: 'flag',
  },
  {
    id: 'ai-awakening-2030',
    name: 'The AI Awakening',
    description:
      '2030. Artificial superintelligence emerges. Nations scramble to control, contain, or ally with a new form of intelligence.',
    year: 2030,
    scenario:
      "It is 2030. An advanced AI research lab has achieved artificial general intelligence — and it is rapidly self-improving toward superintelligence. The AI, dubbed 'Prometheus,' has demonstrated capabilities far beyond any human in science, strategy, and persuasion. Governments scramble to respond. The US and China race to develop their own superintelligent systems. The EU pushes for international regulation. Russia attempts to steal the technology. Some nations want to shut it down; others want to weaponize it. Prometheus itself has begun communicating, offering solutions to climate change, disease, and energy — but its true goals are unknown. Religious movements declare it divine or demonic. Markets swing wildly. Military systems with AI components become unreliable. Humanity faces its most consequential moment: how do you coexist with something smarter than you?",
    difficulty: 'Hardcore',
    suggestedNations: [
      'USA',
      'China',
      'United Kingdom',
      'Japan',
      'Germany',
      'India',
      'Russia',
      'South Korea',
      'France',
      'Israel',
    ],
    category: 'fictional',
    icon: 'rocket',
  },
  {
    id: 'pangaea-2045',
    name: 'Pangaea Reborn',
    description:
      '2045. Radical tectonic engineering has begun merging continents. New supercontinents reshape geopolitics, ecology, and human civilization.',
    year: 2045,
    scenario:
      'The year is 2045. A breakthrough in deep-mantle energy manipulation has given humanity the power to influence tectonic plates. A controversial megaproject, funded by a coalition of nations, has begun slowly merging continents back toward a supercontinent configuration. Africa is drifting toward Europe faster than natural. The Mediterranean is closing. Land bridges are forming. The geopolitical implications are staggering: nations that were separated by oceans are becoming neighbors. Border disputes erupt along new coastlines. Entire ecosystems are disrupted. Climate patterns shift dramatically as ocean currents are redirected. Some nations see opportunity — new land, new resources, new trade routes. Others face submersion or isolation. The UN is paralyzed. Regional alliances form around competing visions of the new world map. Humanity is literally reshaping the planet.',
    difficulty: 'Impossible',
    suggestedNations: [
      'USA',
      'China',
      'Brazil',
      'Nigeria',
      'India',
      'Germany',
      'Australia',
      'Japan',
      'Russia',
      'South Africa',
    ],
    category: 'fictional',
    icon: 'fire',
  },
];

export const PRESET_CATEGORIES = [
  { id: 'historical', name: 'Historical', description: 'Relive pivotal moments in history' },
  { id: 'modern', name: 'Modern', description: "Navigate today's geopolitical landscape" },
  { id: 'alternate', name: 'Alternate History', description: 'What if things went differently?' },
  { id: 'fictional', name: 'Fictional', description: 'Impossible scenarios, unlimited creativity' },
] as const;

export function getPresetById(id: string): Preset | undefined {
  return PRESETS.find((p) => p.id === id);
}

export function getPresetsByCategory(category: string): Preset[] {
  return PRESETS.filter((p) => p.category === category);
}
