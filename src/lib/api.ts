import { outcomeFor, type Chapter } from "./game.ts";

export const API = "https://api.squeekchain.com/v1";
export const OFFICIAL_LIVE = "https://sepolia.squeekchain.com/";
export type ChainSnapshot = {
  installation: string;
  coreAddress: string;
  genesis: number;
  duration: number;
  frontier: number;
  safeBlock: number;
  paused: boolean;
  chapters: Chapter[];
  fetchedAt: number;
  gaps: number;
};
type RawEvent = {
  contractAddress: string;
  eventName: string;
  blockNumber: string;
  transactionHash: string;
  blockTimestamp: string;
  arguments: { name: string; value: string }[];
};
function uint(value: unknown): number {
  if (typeof value !== "string" || !/^\d+$/.test(value))
    throw new Error("Unexpected round data");
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 0)
    throw new Error("Round data is out of range");
  return n;
}
function address(value: unknown): value is string {
  return typeof value === "string" && /^0x[\da-f]{40}$/i.test(value);
}
function hash(value: unknown): value is string {
  return typeof value === "string" && /^0x[\da-f]{64}$/i.test(value);
}

/** Decode only complete, safe SqueekCore settlements. Omitted active records are unknown, never Nap. */
export function parseCore(raw: unknown, fetchedAt = Date.now()): ChainSnapshot {
  if (!raw || typeof raw !== "object")
    throw new Error("Squeekchain returned an unreadable response");
  const a = raw as Record<string, any>;
  if (a.status !== "available")
    throw new Error(
      "Settled rounds are temporarily unavailable. Try again shortly.",
    );
  if (
    a.schemaVersion !== 1 ||
    a.chain?.chainId !== "11155111" ||
    a.chain?.target !== "sepolia"
  )
    throw new Error(
      "This response is not a supported Sepolia settlement feed.",
    );
  if (!address(a.identities?.core) || typeof a.installationId !== "string")
    throw new Error("The settlement feed is missing its identity.");
  const coreAddress = a.identities.core as string;
  const genesis = uint(a.configuration?.genesisTimestamp);
  const duration = uint(a.configuration?.roundDuration);
  if (duration !== 600 || genesis === 0)
    throw new Error("This deployment does not use 10-minute rounds.");
  const frontier = uint(a.core?.settledThroughRound);
  const safeBlock = uint(a.chain?.safeThroughBlock);
  if (!Array.isArray(a.events))
    throw new Error("The settlement feed has no event history.");
  const events: RawEvent[] = a.events.filter(
    (e: RawEvent) =>
      address(e.contractAddress) &&
      e.contractAddress.toLowerCase() === coreAddress.toLowerCase() &&
      uint(e.blockNumber) <= safeBlock &&
      hash(e.transactionHash) &&
      Array.isArray(e.arguments),
  );
  const chapters = new Map<number, Chapter>();
  let gaps = 0;
  for (const event of events.filter((e) => e.eventName === "BatchSettled")) {
    const args = Object.fromEntries(
      event.arguments.map((x) => [x.name, x.value]),
    );
    const previous = uint(args.previousSettledThroughRound);
    const through = uint(args.settledThroughRound);
    const count = uint(args.activeRoundCount);
    if (through > frontier || through <= previous || through - previous > 10000)
      continue;
    const active = events.filter(
      (e) =>
        e.eventName === "RoundRecorded" &&
        e.transactionHash === event.transactionHash,
    );
    if (active.length !== count) {
      gaps += through - previous;
      continue;
    }
    const workByRound = new Map<number, number>();
    for (const record of active) {
      const values = Object.fromEntries(
        record.arguments.map((x) => [x.name, x.value]),
      );
      const round = uint(values.roundId);
      const work = uint(values.work);
      if (
        round <= previous ||
        round > through ||
        work === 0 ||
        work > 10000 ||
        workByRound.has(round)
      )
        throw new Error("The settled round records are inconsistent.");
      workByRound.set(round, work);
    }
    for (let round = previous + 1; round <= through; round++) {
      const work = workByRound.get(round) ?? 0;
      const timestamp = uint(event.blockTimestamp) * 1000;
      if (timestamp < (genesis + round * duration) * 1000)
        throw new Error("A settlement predates the end of its round.");
      chapters.set(round, {
        round,
        work,
        outcome: outcomeFor(work),
        transaction: event.transactionHash,
        settledAt: new Date(timestamp).toISOString(),
      });
    }
  }
  return {
    installation: a.installationId,
    coreAddress,
    genesis,
    duration,
    frontier,
    safeBlock,
    paused: a.core.paused === true,
    chapters: [...chapters.values()].sort((a, b) => a.round - b.round),
    fetchedAt,
    gaps,
  };
}
export async function fetchCore(signal?: AbortSignal): Promise<ChainSnapshot> {
  const boundedSignal = signal
    ? AbortSignal.any([signal, AbortSignal.timeout(12000)])
    : AbortSignal.timeout(12000);
  let response: Response;
  try {
    response = await fetch(`${API}/core`, {
      signal: boundedSignal,
      cache: "no-cache",
      credentials: "omit",
    });
  } catch {
    if (signal?.aborted)
      throw new DOMException("Request cancelled", "AbortError");
    throw new Error(
      "Cannot reach the round feed. Check your connection and retry.",
    );
  }
  if (!response.ok)
    throw new Error(
      response.status === 429
        ? "The round feed is busy. Please retry in a minute."
        : "Cannot reach Squeekchain. Check your connection and retry.",
    );
  return parseCore(await response.json());
}

export function mergeChapters(current: Chapter[], snapshot: ChainSnapshot) {
  // Re-read overlapping rounds, drop anything above a receding confirmed frontier.
  const map = new Map(
    current
      .filter((c) => c.round <= snapshot.frontier)
      .map((c) => [c.round, c]),
  );
  for (const chapter of snapshot.chapters) map.set(chapter.round, chapter);
  return [...map.values()].sort((a, b) => a.round - b.round).slice(-512);
}
