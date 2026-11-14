export const JOURNEY = [
  {
    title: "The last lit window",
    opening:
      "My father left a lantern in the old watchtower. He said the dark wins when we stop answering. Rook, bring that light home. I will keep a place for it in the window.",
    discovery:
      "Blue thread on a raider’s cloak. They were keepers once, like Father. Something on this road has made them forget what they guarded.",
    resolve:
      "The watchtower lantern is warm. Inside its frame: a bell, a name, and an arrow pointing toward the monastery. Father left us a way through.",
    outcome: "One lantern answers from the ruins. Someone is still waiting beyond the bell.",
    goal: "Recover the watchtower’s light and find the way to the monastery.",
  },
  {
    title: "The bell that remembers",
    opening:
      "The bell tolls without a rope. Father used to ring it for travelers lost after dusk. Listen between the strokes. There is a name in the silence.",
    discovery:
      "Silas. His name is cut into the bell with hundreds of others. He did not walk this road alone. Neither will you.",
    resolve:
      "The Bellkeeper stands where the ropes once met. His last task was to keep the signal alive. Let him rest; carry the signal onward.",
    outcome:
      "The bell falls quiet. Across the marsh, small lights begin to answer. The lost names have a road again.",
    goal: "Release the bell’s keeper and follow the answering lights.",
  },
  {
    title: "A light for every name",
    opening:
      "The marsh repeats the voices of people we miss. Do not follow the loudest one. Father taught me to leave a light for anyone who comes after us.",
    discovery:
      "A child’s shoe on the causeway. Beside it, a lamp still burning. Someone crossed here and wanted the next person to be less afraid.",
    resolve:
      "The Mire King has gathered every lost light beneath the water. Bring them back to the road. A memory should guide us, not hold us here.",
    outcome:
      "Lights rise from the water. One by one they show the path toward the winter keep. You can hear the wind again.",
    goal: "Free the marsh lights and open the winter road.",
  },
  {
    title: "What the cold kept",
    opening:
      "His gauntlet is fixed to the gate. I know the dent in its thumb. Father held this place through the winter, long after there was anyone left to relieve him.",
    discovery:
      "The windows are dark, but a coal glows beneath the regent’s armor. His oath kept the fire alive. The cold made him forget who it was for.",
    resolve:
      "Do not let his watch become yours. Break the frost around that ember. Carry home what he protected, not the burden that trapped him.",
    outcome:
      "His hand opens at last. A coal rests inside, warm as a heartbeat. The watch is over. There is only one road left.",
    goal: "Release the Iron Regent’s ember from the frozen keep.",
  },
  {
    title: "The window at home",
    opening:
      "I can see the threshold from our roof. Tonight it is red against the sky. If the last guardian asks what you carry, tell it: a light that was never meant for a crown.",
    discovery:
      "Beyond the gate, the valley is still dark. But the lamps behind you have not gone out. Every road you opened is waiting for this one.",
    resolve:
      "The Crownless keeps the last door closed. The light belongs in a window, not a throne. Bring it through.",
    outcome:
      "Mira sets the lantern in the window. Across the valley, one beacon answers. Then another. Rook rests his sword beside the door. They are not the last.",
    goal: "Cross the last threshold and bring the light home.",
  },
] as const;

export function journeyStory(chapter: number) {
  return JOURNEY[chapter - 1] ?? JOURNEY[0];
}
