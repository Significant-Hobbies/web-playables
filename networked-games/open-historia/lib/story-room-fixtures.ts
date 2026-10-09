// Story Room — local fixtures only (no API, no tokens). StoryTunes / Symphony prototype.

export type StoryRoomPrompt = {
  id: string;
  title: string;
  short: string;
  seed: string;
  bank: string[];
  aiBank: string[];
};

export type AiPersona = {
  id: string;
  name: string;
  tagline: string;
};

export const STORY_ROOM_PROMPTS: StoryRoomPrompt[] = [
  {
    id: 'alexandria',
    title: 'CANON FORGE // The Library',
    short: 'Alexandria, 48 BC — the night the flames were stopped',
    seed: "Flames licked the Great Library's shelves. Smoke curled around the scrolls of Euclid and Aristotle. Then a shout from the docks, a thrown cloak, a stranger who should not have been there.",
    bank: [
      'A dockworker from Tyre had been paid in gold by a scholar who feared the end of memory. He smothered the nearest brazier with his own body.',
      'The fire was no accident. A rival library in Pergamum had sent agents — but one of them switched sides at the last moment and sounded the alarm.',
      "Cleopatra herself arrived with a cohort of guards and a single order: 'Save the books or do not return.' The soldiers formed a human chain to the harbor.",
      'An earthquake the night before had opened a cistern beneath the stacks. The flood that followed the fire saved more than it destroyed.',
      'A young poet who would one day be called Virgil was visiting. He recited verses so moving that the mob paused — and in the pause the fire was contained.',
    ],
    aiBank: [
      'The fire never reached the inner stacks because the librarians had already moved the most dangerous texts to a hidden temple of Serapis weeks earlier — for entirely different reasons.',
      "A Roman centurion who secretly loved Greek philosophy ordered his men to 'secure the building' and then quietly directed the flames toward the empty wing.",
    ],
  },
  {
    id: 'ides',
    title: 'CANON FORGE // The Ides',
    short: 'Rome, 44 BC — what if the dagger missed?',
    seed: 'The senators smiled. The statue of Pompey watched. Brutus raised the knife. In that instant the entire future of the Republic balanced on the edge of bronze.',
    bank: [
      'Caesar turned at the last second — not from warning, but because a messenger from Gaul had just arrived with news of a new victory. The blade caught only his cloak.',
      "The conspirators had one among them who lost his nerve and shouted 'Beware the Ides!' a heartbeat too late for silence, too early for the blow.",
      'A gladiator in the crowd — bought by no one — saw the glint and tackled Brutus. The senators fled. Caesar lived, and the Republic died anyway, just more slowly.',
      'Caesar had already named his heir in a sealed will hidden in the temple of Vesta. The attack only made the succession public and inevitable.',
      "The knife struck true, but Caesar's last words were not 'Et tu' — they were a coded order to his loyalists outside. Civil war began before his body cooled.",
    ],
    aiBank: [
      "History's most famous assassination failed because the 'dictator' was already planning to abdicate that afternoon and sail for Egypt with Cleopatra. The senators killed a man who was already leaving.",
      "Brutus's mother had warned him in a dream the night before. He arrived late, the circle was broken, and the moment passed into awkward silence instead of blood.",
    ],
  },
  {
    id: 'columbus',
    title: 'CANON FORGE // The Horizon',
    short: '1492 — Columbus turns back, or finds something else',
    seed: 'Three ships, a horizon that would not end, crews on the edge of mutiny. The admiral promised India. The men only wanted to see land before they threw him overboard.',
    bank: [
      'On the 33rd day they sighted not the Indies but a chain of islands inhabited by people who already knew the shape of the world — because they had crossed from the other direction centuries earlier.',
      'A storm turned them north. They made landfall in a cold green place where the trees grew taller than any cathedral and the natives traded furs for beads that looked exactly like ones from Venice.',
      "They turned back. The story of the 'western ocean that has no end' became a cautionary tale told in every port for two generations.",
      'One ship was lost in fog. When the other two returned, their logs described mermaids, floating cities of ice, and a current that pulled ships toward a sun that never set.',
      'They found land — but the land already had horses, steel, and writing. The meeting was polite, brief, and ended with the Europeans being told never to return.',
    ],
    aiBank: [
      "The crews mutinied on the 30th day and sailed south instead. They discovered a continent so vast that even the idea of 'India' became a joke told by cartographers.",
      "Columbus's secret Jewish and converso financiers had instructed him to find a new refuge, not a trade route. The 'Indies' he sought were always meant to be a sanctuary.",
    ],
  },
  {
    id: 'berlin',
    title: 'CANON FORGE // The Wall',
    short: 'Berlin, 9 November 1989 — what if the guards fired?',
    seed: 'The checkpoints were overwhelmed. The crowds chanted. A confused border guard radioed for orders that never came clearly. The world held its breath.',
    bank: [
      'A single nervous shot rang out. The crowd surged anyway. By morning the wall was rubble and twenty-three people were dead — martyrs who made the end of the Cold War irreversible.',
      "The order came down: 'Hold the line.' The guards obeyed for six hours. Then their own families appeared on the other side and the line dissolved without a single further order.",
      'The wall never fell that night. Instead, a new checkpoint regime lasted another three years — long enough for the Soviet Union to collapse from within first.',
      'Western journalists who had been tipped off broadcast the confusion live. The images of unarmed civilians simply walking through made any violent response politically impossible.',
      "One guard, later known only as 'the man in tower three,' laid down his rifle, opened the gate, and walked into the West with the first wave. No one stopped him.",
    ],
    aiBank: [
      "The 'fall' was a managed illusion. The East German leadership had already decided the wall was too expensive to maintain. The crowds were the excuse they needed to save face while opening the gates.",
      "A low-level KGB officer on the scene recognized the moment and countermanded the local order to fire. His name was never recorded. The 20th century changed because of one mid-level bureaucrat's cold calculation.",
    ],
  },
];

export const STORY_ROOM_PARTICIPANTS = {
  you: 'You (TimeWeaver)',
  scribe1: 'Cassandra of the Fork',
  scribe2: 'The Byzantine What-If',
} as const;

export const AI_PERSONAS: AiPersona[] = [
  {
    id: 'grok',
    name: 'Grok • Speculative Engine',
    tagline: 'outsider takes from the margins of history',
  },
  {
    id: 'clio',
    name: 'Clio the Unreliable Narrator',
    tagline: 'beautiful lies that rhyme with the canon',
  },
];

export function pickUnused(bank: string[], used: string[]): string {
  const available = bank.filter((t) => !used.includes(t));
  if (available.length === 0) return bank[Math.floor(Math.random() * bank.length)]!;
  return available[Math.floor(Math.random() * available.length)]!;
}

/** Fixture-only co-author suggestion from prompt banks + canon context (no network). */
export function suggestCoAuthorBranch(
  prompt: StoryRoomPrompt,
  runningCanon: string[],
  usedTexts: string[],
  personaId: string
): { text: string; rationale: string } {
  const contextBlob = [prompt.seed, ...runningCanon].join(' ').toLowerCase();
  const pool = [...prompt.aiBank, ...prompt.bank];

  const scored = pool
    .filter((t) => !usedTexts.includes(t))
    .map((text) => {
      const words = text
        .toLowerCase()
        .split(/\W+/)
        .filter((w) => w.length > 4);
      const overlap = words.filter((w) => contextBlob.includes(w)).length;
      return { text, score: overlap + Math.random() * 0.35 };
    })
    .sort((a, b) => b.score - a.score);

  const pick = scored[0]?.text ?? pickUnused(prompt.aiBank, usedTexts);
  const persona = AI_PERSONAS.find((p) => p.id === personaId) ?? AI_PERSONAS[0]!;

  const rationale =
    persona.id === 'clio'
      ? `${persona.name} whispers a telling that rhymes with the canon — plausible, unverifiable, irresistible.`
      : `${persona.name} offers one branch from the fixture scrolls, weighted toward what the hall has already sealed.`;

  return { text: pick, rationale };
}
