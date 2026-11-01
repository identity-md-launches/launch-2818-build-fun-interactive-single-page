import test from "node:test";
import assert from "node:assert/strict";
import {
  outcomeFor,
  roundAt,
  closesAt,
  choosePath,
  scoreChoice,
  storyFor,
  parseSave,
  leaderboard,
  type Chapter,
  type Choice,
} from "../src/lib/game.ts";
import { parseCore, mergeChapters } from "../src/lib/api.ts";

// Public deployment identities; fixture rounds are confined to tests, never runtime data.
const core = "0x980b4424c007caf7a1f3670b48c8eaef7ebc3d44";
const tx = "0x60e1afd4e724bf3be73f6442880a085585d96aa48d93371ff0b29873f8af1f35";
const genesis = 1793022600;
const event = (name: string, args: Record<string, string>, overrides = {}) => ({
  contractAddress: core,
  eventName: name,
  blockNumber: "100",
  transactionHash: tx,
  blockTimestamp: String(genesis + 6000 + 36),
  arguments: Object.entries(args).map(([name, value]) => ({ name, value })),
  ...overrides,
});
const batch = event("BatchSettled", {
  previousSettledThroughRound: "7",
  settledThroughRound: "10",
  activeRoundCount: "2",
});
const active = [
  event("RoundRecorded", { roundId: "8", work: "499" }),
  event("RoundRecorded", { roundId: "10", work: "500" }),
];
const fixture = (events = [batch, ...active]) => ({
  schemaVersion: 1,
  installationId: "test-fixture",
  status: "available",
  chain: { chainId: "11155111", target: "sepolia", safeThroughBlock: "100" },
  identities: { core },
  configuration: { genesisTimestamp: String(genesis), roundDuration: "600" },
  core: { settledThroughRound: "10", paused: false },
  events,
});
const chapter: Chapter = {
  round: 10,
  work: 500,
  outcome: "Zoomies",
  transaction: tx,
  settledAt: new Date((genesis + 6036) * 1000).toISOString(),
};
const choice: Choice = {
  address: core,
  installation: "test-fixture",
  round: 10,
  path: "Zoomies",
  chosenAt: (genesis + 5700) * 1000,
};

test("thresholds use exactly 0, 1–499, and 500+", () => {
  assert.deepEqual([0, 1, 499, 500, 10000].map(outcomeFor), [
    "Nap",
    "Jog",
    "Jog",
    "Zoomies",
    "Zoomies",
  ]);
  for (const invalid of [-1, NaN, Infinity, 0.5])
    assert.throws(() => outcomeFor(invalid));
});
test("round one begins at genesis; boundaries advance without settling", () => {
  assert.equal(roundAt(genesis * 1000 - 1, genesis, 600), 0);
  assert.equal(roundAt(genesis * 1000, genesis, 600), 1);
  assert.equal(roundAt(closesAt(1, genesis, 600) - 1, genesis, 600), 1);
  assert.equal(roundAt(closesAt(1, genesis, 600), genesis, 600), 2);
});
test("batched active records are per-round, and certified omissions are Nap", () => {
  const result = parseCore(fixture());
  assert.deepEqual(
    result.chapters.map((c) => [c.round, c.work, c.outcome]),
    [
      [8, 499, "Jog"],
      [9, 0, "Nap"],
      [10, 500, "Zoomies"],
    ],
  );
  assert.ok(!result.chapters.some((c) => c.round === 11));
});
test("a truncated active batch is unknown, never a zero-work result", () => {
  const result = parseCore(fixture([batch, active[0]]));
  assert.equal(result.chapters.length, 0);
  assert.equal(result.gaps, 3);
});
test("unsafe events, other contracts, and rounds beyond frontier never write chapters", () => {
  assert.equal(
    parseCore(
      fixture([
        event(
          "BatchSettled",
          {
            previousSettledThroughRound: "9",
            settledThroughRound: "10",
            activeRoundCount: "0",
          },
          { blockNumber: "101" },
        ),
      ]),
    ).chapters.length,
    0,
  );
  assert.equal(
    parseCore(
      fixture([
        event(
          "BatchSettled",
          {
            previousSettledThroughRound: "9",
            settledThroughRound: "10",
            activeRoundCount: "0",
          },
          { contractAddress: "0xcd46990f8349057335289ef282c276204b6cdc62" },
        ),
      ]),
    ).chapters.length,
    0,
  );
  assert.equal(
    parseCore(
      fixture([
        event("BatchSettled", {
          previousSettledThroughRound: "10",
          settledThroughRound: "11",
          activeRoundCount: "0",
        }),
      ]),
    ).chapters.length,
    0,
  );
});
test("unavailable, wrong-chain, unknown schema and invalid work fail closed", () => {
  assert.throws(() => parseCore({ ...fixture(), status: "unavailable" }));
  assert.throws(() => parseCore({ ...fixture(), schemaVersion: 2 }));
  assert.throws(() => parseCore({ ...fixture(), chain: { chainId: "1" } }));
  assert.throws(() =>
    parseCore(
      fixture([
        batch,
        active[0],
        event("RoundRecorded", { roundId: "10", work: "10001" }),
      ]),
    ),
  );
});
test("an unfinished round cannot be represented as a settled chapter", () => {
  assert.throws(() =>
    parseCore(
      fixture([
        event(
          "BatchSettled",
          {
            previousSettledThroughRound: "9",
            settledThroughRound: "10",
            activeRoundCount: "0",
          },
          { blockTimestamp: String(genesis + 5999) },
        ),
      ]),
    ),
  );
});
test("one saved choice per wallet, deployment and round; changes replace it", () => {
  const empty = { version: 1 as const, choices: [] };
  const initial = choosePath(
    empty,
    choice,
    choice.chosenAt,
    closesAt(10, genesis, 600),
    9,
  );
  const changed = {
    ...choice,
    path: "Nap" as const,
    chosenAt: choice.chosenAt + 1,
  };
  const result = choosePath(
    initial,
    changed,
    changed.chosenAt,
    closesAt(10, genesis, 600),
    9,
  );
  assert.equal(result.choices.length, 1);
  assert.equal(result.choices[0].path, "Nap");
});
test("choices close at the boundary and cannot target settled rounds", () => {
  const deadline = closesAt(10, genesis, 600);
  assert.throws(() =>
    choosePath(
      { version: 1, choices: [] },
      { ...choice, chosenAt: deadline },
      deadline,
      deadline,
      9,
    ),
  );
  assert.throws(() =>
    choosePath(
      { version: 1, choices: [] },
      choice,
      choice.chosenAt,
      deadline,
      10,
    ),
  );
});
test("only settled participation scores; matching is a 20-point bonus", () => {
  assert.equal(scoreChoice(choice, chapter, genesis, 600), 30);
  assert.equal(
    scoreChoice({ ...choice, path: "Jog" }, chapter, genesis, 600),
    10,
  );
  assert.equal(scoreChoice({ ...choice, round: 11 }, chapter, genesis, 600), 0);
  assert.equal(
    scoreChoice(
      { ...choice, chosenAt: closesAt(10, genesis, 600) },
      chapter,
      genesis,
      600,
    ),
    0,
  );
  assert.equal(
    leaderboard(
      { version: 1, choices: [choice] },
      [],
      choice.installation,
      genesis,
      600,
    )[0].score,
    0,
  );
  assert.equal(
    leaderboard(
      { version: 1, choices: [choice] },
      [chapter],
      choice.installation,
      genesis,
      600,
    )[0].score,
    30,
  );
});
test("story text and illustrations follow the actual outcome; choice adds a personal path", () => {
  const story = storyFor(chapter, undefined, { ...choice, path: "Nap" });
  assert.match(story.personal, /different twist/);
  assert.notEqual(
    story.title,
    storyFor({ ...chapter, work: 0, outcome: "Nap" }).title,
  );
  assert.match(
    storyFor(
      { ...chapter, outcome: "Jog", work: 1 },
      { ...chapter, round: 9, outcome: "Nap", work: 0 },
    ).text,
    /Refreshed/,
  );
});
test("storage corruption and duplicates cannot crash or double-score a choice", () => {
  assert.deepEqual(parseSave("{broken"), { version: 1, choices: [] });
  assert.equal(
    parseSave(
      JSON.stringify({
        version: 1,
        choices: [choice, choice, { ...choice, address: "invalid" }],
      }),
    ).choices.length,
    1,
  );
});
test("polling is idempotent, corrects overlap, and removes a receding frontier", () => {
  const snapshot = parseCore(fixture());
  const first = mergeChapters([], snapshot);
  assert.equal(mergeChapters(first, snapshot).length, 3);
  assert.equal(
    mergeChapters(first, { ...snapshot, frontier: 9, chapters: [] }).at(-1)
      ?.round,
    9,
  );
  assert.equal(
    mergeChapters(first, {
      ...snapshot,
      chapters: [{ ...chapter, work: 0, outcome: "Nap" }],
    }).at(-1)?.outcome,
    "Nap",
  );
});
