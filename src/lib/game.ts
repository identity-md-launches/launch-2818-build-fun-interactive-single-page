export type Outcome = "Nap" | "Jog" | "Zoomies";
export type Chapter = {
  round: number;
  work: number;
  outcome: Outcome;
  transaction: string;
  settledAt: string;
};
export type Choice = {
  address: string;
  installation: string;
  round: number;
  path: Outcome;
  chosenAt: number;
};
export type GameSave = { version: 1; choices: Choice[] };
export const OUTCOMES: Outcome[] = ["Nap", "Jog", "Zoomies"];
export const PATHS = {
  Nap: {
    title: "Build a cozy camp",
    description: "A blanket, a book, a little daydream.",
    hint: "Pick Nap · 0 work",
    color: "nap",
  },
  Jog: {
    title: "Follow the fireflies",
    description: "Small steps into something wonderful.",
    hint: "Pick Jog · 1–499 work",
    color: "jog",
  },
  Zoomies: {
    title: "Chase the falling star",
    description: "Big energy. A very small adventurer.",
    hint: "Pick Zoomies · 500+ work",
    color: "zoomies",
  },
} as const;

export function outcomeFor(work: number): Outcome {
  if (!Number.isSafeInteger(work) || work < 0)
    throw new Error("Invalid settled work");
  return work === 0 ? "Nap" : work < 500 ? "Jog" : "Zoomies";
}

export function roundAt(now: number, genesis: number, duration: number) {
  if (
    !Number.isFinite(now) ||
    !Number.isSafeInteger(genesis) ||
    duration !== 600
  )
    throw new Error("Invalid round clock");
  return now < genesis * 1000
    ? 0
    : Math.floor((now / 1000 - genesis) / duration) + 1;
}
export function closesAt(round: number, genesis: number, duration: number) {
  return (genesis + round * duration) * 1000;
}

export function choosePath(
  save: GameSave,
  choice: Choice,
  now: number,
  deadline: number,
  settled: number,
): GameSave {
  if (now >= deadline || choice.round <= settled || choice.chosenAt !== now)
    throw new Error(
      "This round has closed. Choose a path for the current round.",
    );
  if (!OUTCOMES.includes(choice.path))
    throw new Error("Choose one of the three paths.");
  const choices = save.choices.filter(
    (c) =>
      !(
        c.address.toLowerCase() === choice.address.toLowerCase() &&
        c.installation === choice.installation &&
        c.round === choice.round
      ),
  );
  return { version: 1, choices: [...choices, choice].slice(-2000) };
}

export function scoreChoice(
  choice: Choice,
  chapter: Chapter,
  genesis: number,
  duration: number,
): number {
  if (
    choice.round !== chapter.round ||
    choice.chosenAt >= closesAt(chapter.round, genesis, duration) ||
    choice.chosenAt < closesAt(chapter.round - 1, genesis, duration)
  )
    return 0;
  return 10 + (choice.path === chapter.outcome ? 20 : 0);
}

const titles: Record<Outcome, string[]> = {
  Nap: [
    "A very small pause",
    "The moon keeps watch",
    "Dreams under the mushrooms",
    "A pocket full of quiet",
    "The softest place to land",
    "A sleepy little secret",
  ],
  Jog: [
    "Where the fireflies go",
    "The winding way home",
    "A trail of tiny wonders",
    "One paw after another",
    "A friend along the creek",
    "The other side of the hill",
  ],
  Zoomies: [
    "A star worth chasing",
    "The great acorn dash",
    "Faster than a falling leaf",
    "The sky is the limit",
    "A whirlwind of wonders",
    "The midnight moon sprint",
  ],
};
const plots: Record<Outcome, string[]> = {
  Nap: [
    "Squeektoshi tucked a fallen leaf around his shoulders. The forest could wait; the little mushroom house had a very important nap to offer.",
    "The moon hung like a sunflower seed above the clearing. Squeektoshi curled up beside his lantern and dreamed of a map with no wrong turns.",
    "A tiny snail offered a cup of chamomile. Squeektoshi listened to the leaves, and discovered that even the quiet chapters have something to say.",
    "Under a mushroom umbrella, Squeektoshi found a notebook. On its first page: “Rest is part of the adventure.” He added a very sleepy pawprint.",
    "The fireflies dimmed their lanterns. Squeektoshi made a pillow of moss, keeping one precious acorn safe beneath his paw until morning.",
    "A breeze turned the pages of his little book. Somewhere between a yawn and a dream, Squeektoshi heard the forest whisper the next part of the tale.",
  ],
  Jog: [
    "One careful pawstep at a time, Squeektoshi followed the fireflies along the creek. Around the bend, a wooden bridge led to a place missing from his map.",
    "A ribbon of golden light wound between the ferns. Squeektoshi packed an acorn for the road and followed it, humming a song only hamsters know.",
    "Squeektoshi met a beetle carrying a very large leaf. Together they crossed the stream, discovering that adventures are better with a little company.",
    "The path climbed gently into the blueberry hills. At the top, Squeektoshi found a little sign: “You are exactly where the story needs you.”",
    "Someone had left a trail of sunflower seeds. Squeektoshi followed them through the ferns until a familiar lantern glowed between the trees.",
    "The creek had a story of its own. Squeektoshi walked beside it, listening, until the water pointed him toward a secret garden of moonflowers.",
  ],
  Zoomies: [
    "A star slipped from the sky. Squeektoshi launched himself down the hill, scarf flying, and caught its tiny spark in his acorn lantern. What a night!",
    "With a whoosh of leaves, Squeektoshi raced across the clearing. The world became a blur of gold, and a hidden gate swung open just for him.",
    "The moonlit meadow became a racetrack. Squeektoshi bounded over a log, sailed past a surprised owl, and landed beside a treasure chest of sunflower seeds.",
    "Squeektoshi sprinted toward the comet’s glow. Every pawstep lit a new firefly until the whole forest sparkled like a sky turned upside down.",
    "A gust swept the map into the air. Squeektoshi chased it over three hills, caught it mid-leap, and spotted an island no one had drawn before.",
    "The acorn express was leaving! Squeektoshi dashed along the track, hopped onto the last leaf, and watched a new adventure rush into view.",
  ],
};
export function storyFor(
  chapter: Chapter,
  previous?: Chapter,
  choice?: Choice,
) {
  const index = chapter.round % titles[chapter.outcome].length;
  let lead = "";
  if (
    previous &&
    previous.round === chapter.round - 1 &&
    previous.outcome !== chapter.outcome
  ) {
    lead =
      chapter.outcome === "Nap"
        ? "After all that exploring, it was time to slow down. "
        : previous.outcome === "Nap"
          ? "Refreshed from his rest, Squeektoshi set off again. "
          : "The forest had a new surprise in store. ";
  }
  const personal = choice
    ? choice.path === chapter.outcome
      ? `Your plan to ${PATHS[choice.path].title.toLowerCase()} was just what this chapter needed.`
      : `You had hoped to ${PATHS[choice.path].title.toLowerCase()}, but the wheel wrote a different twist. Squeektoshi saved your idea for another day.`
    : "";
  return {
    title: titles[chapter.outcome][index],
    text: lead + plots[chapter.outcome][index],
    personal,
  };
}

export function leaderboard(
  save: GameSave,
  chapters: Chapter[],
  installation: string,
  genesis: number,
  duration: number,
) {
  const byRound = new Map(chapters.map((c) => [c.round, c]));
  const people = new Map<
    string,
    { address: string; votes: number; score: number; matches: number }
  >();
  for (const choice of save.choices.filter(
    (c) => c.installation === installation,
  )) {
    const key = choice.address.toLowerCase();
    const person = people.get(key) ?? {
      address: choice.address,
      votes: 0,
      score: 0,
      matches: 0,
    };
    person.votes++;
    const chapter = byRound.get(choice.round);
    if (chapter) {
      const points = scoreChoice(choice, chapter, genesis, duration);
      person.score += points;
      if (points === 30) person.matches++;
    }
    people.set(key, person);
  }
  return [...people.values()].sort(
    (a, b) =>
      b.score - a.score ||
      b.votes - a.votes ||
      a.address.localeCompare(b.address),
  );
}

export function parseSave(value: string | null): GameSave {
  try {
    const data = JSON.parse(value ?? "{}") as GameSave;
    if (data.version !== 1 || !Array.isArray(data.choices))
      return { version: 1, choices: [] };
    const unique = new Map<string, Choice>();
    for (const c of data.choices) {
      if (
        !/^0x[\da-f]{40}$/i.test(c.address) ||
        typeof c.installation !== "string" ||
        !Number.isSafeInteger(c.round) ||
        c.round < 1 ||
        !OUTCOMES.includes(c.path) ||
        !Number.isSafeInteger(c.chosenAt)
      )
        continue;
      unique.set(`${c.installation}:${c.address.toLowerCase()}:${c.round}`, c);
    }
    return { version: 1, choices: [...unique.values()].slice(-2000) };
  } catch {
    return { version: 1, choices: [] };
  }
}
