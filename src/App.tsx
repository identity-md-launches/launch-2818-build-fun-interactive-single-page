import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAccount, useSwitchChain } from "wagmi";
import { getAddress } from "viem";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock3,
  ExternalLink,
  Flower2,
  Footprints,
  Leaf,
  Moon,
  Radio,
  RefreshCw,
  Sparkles,
  Trophy,
  Wallet,
  Zap,
} from "lucide-react";
import { Modal } from "./components/Modal";
import { WalletSheet } from "./components/WalletSheet";
import {
  fetchCore,
  mergeChapters,
  OFFICIAL_LIVE,
  type ChainSnapshot,
} from "./lib/api";
import {
  choosePath,
  closesAt,
  leaderboard,
  OUTCOMES,
  parseSave,
  PATHS,
  roundAt,
  storyFor,
  type Chapter,
  type GameSave,
  type Outcome,
} from "./lib/game";
import { chain, shortAddress } from "./lib/wallet";

type Tab = "story" | "chapters" | "trailblazers";
const SAVE_KEY = "squeek-tales:choices:v1";
const ARCHIVE_KEY = "squeek-tales:chapters:v1";
const asset = (name: string) => `./art/${name}`;
const iconFor = { Nap: Moon, Jog: Footprints, Zoomies: Zap };
const readTab = (): Tab =>
  location.hash === "#chapters"
    ? "chapters"
    : location.hash === "#trailblazers"
      ? "trailblazers"
      : "story";
function loadSave() {
  try {
    return parseSave(localStorage.getItem(SAVE_KEY));
  } catch {
    return { version: 1, choices: [] } as GameSave;
  }
}
function loadArchive(snapshot: ChainSnapshot): Chapter[] {
  try {
    const raw = JSON.parse(localStorage.getItem(ARCHIVE_KEY) ?? "{}");
    if (
      raw.installation !== snapshot.installation ||
      raw.core !== snapshot.coreAddress ||
      !Array.isArray(raw.chapters)
    )
      return [];
    return raw.chapters
      .filter(
        (c: Chapter) =>
          Number.isSafeInteger(c.round) &&
          c.round > 0 &&
          c.round <= snapshot.frontier &&
          Number.isSafeInteger(c.work) &&
          c.work >= 0 &&
          c.work <= 10000 &&
          c.outcome ===
            (c.work === 0 ? "Nap" : c.work < 500 ? "Jog" : "Zoomies") &&
          /^0x[\da-f]{64}$/i.test(c.transaction) &&
          Number.isFinite(Date.parse(c.settledAt)),
      )
      .slice(-512);
  } catch {
    return [];
  }
}
function OutcomeMark({
  outcome,
  small = false,
}: {
  outcome: Outcome;
  small?: boolean;
}) {
  const Icon = iconFor[outcome];
  return (
    <span
      className={`outcome-mark ${outcome.toLowerCase()} ${small ? "small" : ""}`}
    >
      <Icon size={small ? 15 : 18} aria-hidden="true" />
      {outcome}
    </span>
  );
}
function timeLeft(ms: number) {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export default function App() {
  const { address, isConnected, chainId } = useAccount();
  const {
    switchChain,
    isPending: switching,
    error: switchError,
  } = useSwitchChain();
  const [tab, setTab] = useState<Tab>(readTab);
  const [help, setHelp] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const closeWallet = useCallback(() => setWalletOpen(false), []);
  const [now, setNow] = useState(Date.now());
  const [save, setSave] = useState<GameSave>(loadSave);
  const [archive, setArchive] = useState<{
    installation: string;
    chapters: Chapter[];
  }>({ installation: "", chapters: [] });
  const [storageError, setStorageError] = useState("");
  const [viewRound, setViewRound] = useState<number | null>(null);
  const [path, setPath] = useState<Outcome | null>(null);
  const [feedback, setFeedback] = useState("");
  const [filter, setFilter] = useState<Outcome | "All">("All");
  const voteRef = useRef<HTMLElement>(null);
  const roundState = useQuery({
    queryKey: ["squeek-core"],
    queryFn: ({ signal }) => fetchCore(signal),
    refetchInterval: 15000,
    refetchIntervalInBackground: false,
    staleTime: 10000,
  });
  const data = roundState.data;
  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    const hash = () => setTab(readTab());
    const storage = (e: StorageEvent) => {
      if (e.key === SAVE_KEY) setSave(parseSave(e.newValue));
    };
    addEventListener("hashchange", hash);
    addEventListener("storage", storage);
    return () => {
      clearInterval(tick);
      removeEventListener("hashchange", hash);
      removeEventListener("storage", storage);
    };
  }, []);
  useEffect(() => {
    if (!data) return;
    setArchive((previous) => {
      const old =
        previous.installation === data.installation
          ? previous.chapters
          : loadArchive(data);
      const chapters = mergeChapters(old, data);
      try {
        localStorage.setItem(
          ARCHIVE_KEY,
          JSON.stringify({
            installation: data.installation,
            core: data.coreAddress,
            chapters,
          }),
        );
      } catch {
        setStorageError(
          "Browser storage is unavailable. Choices and chapters will last only for this visit.",
        );
      }
      return { installation: data.installation, chapters };
    });
  }, [data]);
  const chapters =
    archive.installation === data?.installation
      ? archive.chapters
      : (data?.chapters ?? []);
  const latest = chapters.at(-1);
  const currentRound = data ? roundAt(now, data.genesis, data.duration) : 0;
  const deadline = data
    ? closesAt(currentRound, data.genesis, data.duration)
    : 0;
  const fresh = !!data && now - data.fetchedAt < 45000 && !roundState.isError;
  const canChoose =
    fresh &&
    !data?.paused &&
    currentRound > (data?.frontier ?? 0) &&
    currentRound > 0;
  const savedChoice = save.choices.find(
    (c) =>
      c.installation === data?.installation &&
      c.round === currentRound &&
      c.address.toLowerCase() === address?.toLowerCase(),
  );
  useEffect(() => {
    // A draft plan survives connecting; a saved plan or new round replaces it.
    setPath(savedChoice?.path ?? null);
    setFeedback("");
  }, [currentRound, savedChoice?.path]);
  const chapter =
    viewRound === null
      ? latest
      : (chapters.find((c) => c.round === viewRound) ?? latest);
  const previous = chapters.find((c) => c.round === (chapter?.round ?? 0) - 1);
  const myChapterChoice = save.choices.find(
    (c) =>
      c.installation === data?.installation &&
      c.round === chapter?.round &&
      c.address.toLowerCase() === address?.toLowerCase(),
  );
  const story = chapter
    ? storyFor(chapter, previous, myChapterChoice)
    : undefined;
  const ranks = useMemo(
    () =>
      data
        ? leaderboard(
            save,
            chapters,
            data.installation,
            data.genesis,
            data.duration,
          )
        : [],
    [save, chapters, data],
  );
  const me = ranks.find(
    (r) => r.address.toLowerCase() === address?.toLowerCase(),
  );
  const chapterIndex = chapters.findIndex((c) => c.round === chapter?.round);
  const navigate = (next: Tab) => {
    location.hash = next;
    setTab(next);
  };
  const choose = () => {
    if (!path) {
      setFeedback("Choose one of the three paths first.");
      return;
    }
    if (!isConnected || !address) {
      setWalletOpen(true);
      return;
    }
    if (chainId !== chain.id) {
      switchChain({ chainId: chain.id });
      return;
    }
    if (!data || !canChoose) {
      setFeedback(
        "The round feed needs to refresh before you can choose. Use Retry in the status bar.",
      );
      return;
    }
    try {
      const actualNow = Date.now();
      // Recompute from the real clock when clicked, including at a 10-minute boundary.
      if (roundAt(actualNow, data.genesis, data.duration) !== currentRound)
        throw new Error(
          "A new round just started. Choose a path for the new round.",
        );
      let currentSave = save;
      try {
        const stored = localStorage.getItem(SAVE_KEY);
        if (stored) currentSave = parseSave(stored);
      } catch {
        /* retain this visit’s progress */
      }
      const updated = choosePath(
        currentSave,
        {
          address: getAddress(address),
          installation: data.installation,
          round: currentRound,
          path,
          chosenAt: actualNow,
        },
        actualNow,
        deadline,
        data.frontier,
      );
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(updated));
      } catch {
        setStorageError(
          "Your choice is saved for this visit only. Enable browser storage to keep your progress.",
        );
      }
      setSave(updated);
      setFeedback(
        `Path saved for round ${currentRound}. You can change it until the timer ends.`,
      );
    } catch (e) {
      setFeedback(
        e instanceof Error
          ? e.message
          : "Could not save your path. Please retry.",
      );
    }
  };
  const jumpToVote = () => {
    voteRef.current?.scrollIntoView({
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "start",
    });
    voteRef.current?.focus({ preventScroll: true });
  };

  return (
    <>
      <a
        className="skip-link"
        href="#main"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById("main")?.focus();
        }}
      >
        Skip to content
      </a>
      <header className="site-header">
        <a className="brand" href="#story">
          <img src={asset("favicon.svg")} width="42" height="42" alt="" />
          <span>
            Squeek Tales
            <span className="brand-note">a little wheel, a whole world</span>
          </span>
        </a>
        <nav aria-label="Main navigation" className="desktop-nav">
          <a href="#story" aria-current={tab === "story" ? "page" : undefined}>
            <BookOpen size={17} />
            The story
          </a>
          <a
            href="#chapters"
            aria-current={tab === "chapters" ? "page" : undefined}
          >
            Chapter book
          </a>
          <a
            href="#trailblazers"
            aria-current={tab === "trailblazers" ? "page" : undefined}
          >
            Trailblazers
          </a>
        </nav>
        <div className="header-actions">
          <button
            type="button"
            className="icon-button"
            aria-label="How to play"
            onClick={() => setHelp(true)}
          >
            <CircleHelp size={21} />
          </button>
          <button
            type="button"
            className="wallet-button"
            onClick={() => {
              if (isConnected && chainId !== chain.id)
                switchChain({ chainId: chain.id });
              else setWalletOpen(true);
            }}
            disabled={switching}
          >
            <Wallet size={17} />
            <span>
              {switching
                ? "Switching…"
                : isConnected && chainId !== chain.id
                  ? "Switch to Sepolia"
                  : address
                    ? shortAddress(getAddress(address))
                    : "Connect wallet"}
            </span>
          </button>
        </div>
      </header>

      <main id="main" className="page-shell" tabIndex={-1}>
        <section className="intro" aria-labelledby="page-title">
          <div className="intro-doodle" aria-hidden="true">
            <Leaf size={22} />
            <span className="doodle-line" />
          </div>
          <h1 id="page-title">
            Tiny paws. <span>Big adventures.</span>
          </h1>
          <p>A living story powered by a real hamster’s wheel.</p>
          <div className="intro-doodle right" aria-hidden="true">
            <Sparkles size={26} />
          </div>
        </section>
        <section
          className={`live-bar ${!fresh && !roundState.isPending ? "disconnected" : ""}`}
          aria-label="Squeekchain round status"
        >
          <div className="live-source">
            <span className={`status-dot ${fresh ? "online" : ""}`} />
            <span>
              {roundState.isPending
                ? "Finding the story…"
                : fresh
                  ? data?.paused
                    ? "Settlement paused"
                    : "Squeekchain · Sepolia"
                  : "Round feed offline"}
            </span>
          </div>
          <div className="live-details">
            <span>
              Round{" "}
              <strong>{data ? currentRound.toLocaleString() : "—"}</strong>
            </span>
            <span className="last-outcome">
              Last settled{" "}
              {latest ? (
                <OutcomeMark outcome={latest.outcome} small />
              ) : (
                <strong>—</strong>
              )}
            </span>
          </div>
          <a
            className="live-link"
            href={OFFICIAL_LIVE}
            target="_blank"
            rel="noreferrer"
          >
            <Radio size={16} />
            <span>Watch live</span>
            <ArrowUpRight size={15} />
          </a>
        </section>
        <p className="sr-only" role="status" aria-atomic="true">
          {latest
            ? `Chapter ${latest.round} has settled: ${latest.outcome}. A new story is ready to read.`
            : ""}
        </p>
        {(roundState.isError || (!fresh && data)) && (
          <div className="feed-note" role="status">
            <span>
              {roundState.error?.message ??
                "The last check is stale. Saved chapters are still here."}
            </span>
            <button
              onClick={() => void roundState.refetch()}
              disabled={roundState.isFetching}
            >
              <RefreshCw size={15} />
              {roundState.isFetching ? "Retrying…" : "Retry"}
            </button>
          </div>
        )}
        {switchError && (
          <p className="error-note" role="status">
            Could not switch networks. Select Sepolia in your wallet and try
            again.
          </p>
        )}
        {storageError && (
          <p className="error-note" role="status">
            {storageError}
          </p>
        )}
        <nav aria-label="Story views" className="mobile-nav">
          <a href="#story" aria-current={tab === "story" ? "page" : undefined}>
            The story
          </a>
          <a
            href="#chapters"
            aria-current={tab === "chapters" ? "page" : undefined}
          >
            Chapter book
          </a>
          <a
            href="#trailblazers"
            aria-current={tab === "trailblazers" ? "page" : undefined}
          >
            Trailblazers
          </a>
        </nav>

        {tab === "story" && (
          <>
            <div className="game-grid">
              <article
                className="storybook"
                aria-label="Current story chapter"
                aria-busy={roundState.isPending}
              >
                <div
                  className={`story-art ${chapter?.outcome.toLowerCase() ?? "jog"}`}
                >
                  <img
                    className="scene"
                    src={asset(
                      `${chapter?.outcome.toLowerCase() ?? "jog"}.svg`,
                    )}
                    alt={
                      chapter?.outcome === "Nap"
                        ? "Squeektoshi reads a tiny book beside a mushroom cottage under the moon."
                        : chapter?.outcome === "Zoomies"
                          ? "Squeektoshi races through the forest with his lantern as a star streaks overhead."
                          : "Squeektoshi carries a lantern along a forest trail beside a winding creek."
                    }
                    width="1000"
                    height="430"
                    fetchPriority="high"
                  />
                  <div className="scene-label">
                    <BookOpen size={15} />
                    {chapter
                      ? `Chapter ${chapter.round.toLocaleString()}`
                      : "Once upon a wheel"}
                  </div>
                  {chapter && (
                    <div className="scene-outcome">
                      <OutcomeMark outcome={chapter.outcome} small />
                      <span>· {chapter.work.toLocaleString()} work</span>
                    </div>
                  )}
                  <span className="art-caption">
                    The little forest chronicles
                  </span>
                </div>
                <div className="story-content">
                  <div className="story-heading">
                    <h2>
                      {story?.title ??
                        (roundState.isPending
                          ? "Opening the little storybook…"
                          : "Every adventure starts somewhere")}
                    </h2>
                    <Flower2 size={25} className="flower" aria-hidden="true" />
                  </div>
                  <p className="story-prose">
                    {story?.text ??
                      (roundState.isPending
                        ? "Fetching confirmed rounds from Squeekchain. Your next adventure is almost here."
                        : "The forest is ready, but its next chapter needs a confirmed round. Retry the round feed to begin.")}
                  </p>
                  {story?.personal && (
                    <p className="personal-story">
                      <Leaf size={16} />
                      {story.personal}
                    </p>
                  )}
                  <button
                    className="primary mobile-choose"
                    onClick={jumpToVote}
                  >
                    Choose the next path
                    <ArrowDown size={17} />
                  </button>
                  <div className="chapter-footer">
                    <span>
                      {chapter ? (
                        <>
                          <Check size={14} />
                          Settled on Sepolia{" "}
                          <a
                            href={`https://sepolia.etherscan.io/tx/${chapter.transaction}`}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`View round ${chapter.round} settlement on Etherscan`}
                          >
                            <ExternalLink size={13} />
                          </a>
                        </>
                      ) : (
                        <>
                          <Clock3 size={14} />
                          Only confirmed rounds write chapters
                        </>
                      )}
                    </span>
                    <div className="chapter-pager">
                      <button
                        className="icon-button"
                        aria-label="Read previous chapter"
                        disabled={chapterIndex <= 0}
                        onClick={() =>
                          setViewRound(chapters[chapterIndex - 1].round)
                        }
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <button
                        className="icon-button"
                        aria-label="Read next chapter"
                        disabled={chapterIndex >= chapters.length - 1}
                        onClick={() =>
                          setViewRound(
                            chapterIndex + 1 === chapters.length - 1
                              ? null
                              : chapters[chapterIndex + 1].round,
                          )
                        }
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  </div>
                  {viewRound !== null && (
                    <button
                      className="text-button latest-button"
                      onClick={() => setViewRound(null)}
                    >
                      Return to latest chapter
                      <ArrowRight size={15} />
                    </button>
                  )}
                </div>
              </article>

              <section
                className="vote-panel"
                ref={voteRef}
                tabIndex={-1}
                aria-labelledby="vote-title"
              >
                <div className="vote-top">
                  <span className="round-indicator">
                    <span className="status-dot online" />
                    {data
                      ? `Round ${currentRound.toLocaleString()}`
                      : "Next round"}
                  </span>
                  <span className="timer">
                    <Clock3 size={15} />
                    {data ? timeLeft(deadline - now) : "—:—"}
                  </span>
                </div>
                <h2 id="vote-title">Where to, little one?</h2>
                <p className="vote-description">
                  Choose a plan. The wheel writes the twist.
                </p>
                <fieldset className="path-options">
                  <legend className="sr-only">
                    Choose your next story path
                  </legend>
                  {OUTCOMES.map((outcome) => {
                    const Icon = iconFor[outcome];
                    return (
                      <label
                        className={`path-option ${outcome.toLowerCase()} ${path === outcome ? "selected" : ""}`}
                        key={outcome}
                      >
                        <input
                          type="radio"
                          name="story-path"
                          value={outcome}
                          checked={path === outcome}
                          onChange={() => {
                            setPath(outcome);
                            setFeedback("");
                          }}
                        />
                        <span className="path-icon">
                          <Icon size={22} />
                        </span>
                        <span className="path-copy">
                          <strong>{PATHS[outcome].title}</strong>
                          <span>{PATHS[outcome].hint}</span>
                        </span>
                        <span className="radio-mark">
                          {path === outcome && (
                            <Check size={12} strokeWidth={3} />
                          )}
                        </span>
                      </label>
                    );
                  })}
                </fieldset>
                <button
                  className="primary full"
                  onClick={choose}
                  disabled={!canChoose || switching}
                >
                  {switching ? (
                    "Switching network…"
                  ) : isConnected && chainId !== chain.id ? (
                    "Switch to Sepolia"
                  ) : savedChoice && path === savedChoice.path ? (
                    <>
                      <Check size={17} />
                      Path saved
                    </>
                  ) : savedChoice ? (
                    <>
                      Update my path
                      <ArrowRight size={17} />
                    </>
                  ) : (
                    <>
                      Choose this path
                      <ArrowRight size={17} />
                    </>
                  )}
                </button>
                <p className="vote-help">
                  {savedChoice
                    ? "Change your mind until the round ends."
                    : isConnected
                      ? "10 points for joining. +20 for matching the outcome."
                      : "Connect your wallet to save. No gas or signature."}
                </p>
                <p
                  className={`vote-feedback ${feedback ? "visible" : ""}`}
                  role="status"
                >
                  {feedback ||
                    (!canChoose && !roundState.isPending
                      ? data?.paused
                        ? "Settlement is paused. Read the story while we wait."
                        : "Waiting for a fresh round check."
                      : "\u00a0")}
                </p>
                <div className="next-note">
                  <BookOpen size={17} />
                  <span>
                    A new chapter after this round settles.
                    <br />
                    <span className="muted">
                      Usually a few minutes after the timer.
                    </span>
                  </span>
                </div>
              </section>
            </div>

            <section className="trail-strip" aria-labelledby="trail-title">
              <div className="section-heading">
                <h2 id="trail-title">Little steps so far</h2>
                <button
                  className="text-button"
                  onClick={() => navigate("chapters")}
                >
                  Open chapter book
                  <ArrowRight size={15} />
                </button>
              </div>
              {chapters.length ? (
                <div className="round-trail">
                  {chapters.slice(-7).map((c) => (
                    <button
                      key={c.round}
                      className={`trail-step ${c.outcome.toLowerCase()} ${chapter?.round === c.round ? "active" : ""}`}
                      onClick={() =>
                        setViewRound(c.round === latest?.round ? null : c.round)
                      }
                      aria-pressed={chapter?.round === c.round}
                    >
                      <span className="trail-icon">
                        {(() => {
                          const Icon = iconFor[c.outcome];
                          return <Icon size={20} />;
                        })()}
                      </span>
                      <span>
                        <strong>{c.outcome}</strong>
                        <span>Round {c.round}</span>
                      </span>
                      {chapter?.round === c.round && (
                        <span className="trail-current" aria-hidden="true" />
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="muted">
                  The trail begins with the first confirmed chapter.
                </p>
              )}
            </section>
            <div className="under-story">
              <span>
                <Leaf size={16} />
                Real wheel. Real rounds. A little make-believe.
              </span>
              <button className="text-button" onClick={() => setHelp(true)}>
                How does it work?
                <CircleHelp size={16} />
              </button>
            </div>
          </>
        )}

        {tab === "chapters" && (
          <section className="book-view">
            <div className="view-header">
              <div>
                <h2>The chapter book</h2>
                <p className="muted">
                  Every settled round leaves a little story.
                </p>
              </div>
              <span className="book-count">
                <BookOpen size={18} />
                {chapters.length} saved{" "}
                {chapters.length === 1 ? "chapter" : "chapters"}
              </span>
            </div>
            <div
              className="filters"
              role="group"
              aria-label="Filter chapters by outcome"
            >
              {(["All", ...OUTCOMES] as const).map((o) => (
                <button
                  key={o}
                  aria-pressed={filter === o}
                  onClick={() => setFilter(o)}
                >
                  {o === "All" ? "All chapters" : o}
                </button>
              ))}
            </div>
            {chapters.filter((c) => filter === "All" || filter === c.outcome)
              .length ? (
              <div className="chapter-grid">
                {[...chapters]
                  .reverse()
                  .filter((c) => filter === "All" || filter === c.outcome)
                  .map((c) => (
                    <button
                      className="chapter-card"
                      key={c.round}
                      onClick={() => {
                        setViewRound(
                          c.round === latest?.round ? null : c.round,
                        );
                        navigate("story");
                      }}
                    >
                      <img
                        src={asset(`${c.outcome.toLowerCase()}.svg`)}
                        width="1000"
                        height="430"
                        alt=""
                        loading="lazy"
                      />
                      <span className="chapter-card-content">
                        <span className="chapter-card-meta">
                          Chapter {c.round}
                          <OutcomeMark outcome={c.outcome} small />
                        </span>
                        <strong>{storyFor(c).title}</strong>
                        <span className="muted">
                          {c.work.toLocaleString()} work units
                          <ArrowRight size={17} />
                        </span>
                      </span>
                    </button>
                  ))}
              </div>
            ) : (
              <div className="empty-state">
                <BookOpen size={38} />
                <h3>No {filter === "All" ? "" : `${filter} `}chapters yet</h3>
                <p>The next confirmed round may write one.</p>
                <button
                  className="secondary"
                  onClick={() =>
                    filter === "All" ? navigate("story") : setFilter("All")
                  }
                >
                  {filter === "All" ? "Back to the story" : "Show all chapters"}
                </button>
              </div>
            )}
            <p className="archive-note">
              Chapters are saved in this browser, up to 512. New visits start
              with the API’s recent confirmed history.
              {data?.gaps
                ? " Some older records are incomplete and have been left out."
                : ""}
            </p>
          </section>
        )}

        {tab === "trailblazers" && (
          <section className="leaderboard-view">
            <div className="view-header">
              <div>
                <h2>The trailblazers</h2>
                <p className="muted">Big imaginations. Tiny pawprints.</p>
              </div>
              <Trophy size={32} className="trophy" />
            </div>
            <div className="local-notice">
              <span className="local-icon">
                <Leaf size={20} />
              </span>
              <div>
                <strong>Your browser’s leaderboard</strong>
                <p>
                  Only wallets that have chosen paths here appear. Scores are
                  personal, saved on this device, and have no token value.
                </p>
              </div>
            </div>
            {ranks.length ? (
              <div className="leaderboard-table">
                <table>
                  <caption className="sr-only">
                    Most active story voters saved in this browser
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Place</th>
                      <th scope="col">Adventurer</th>
                      <th scope="col">Choices</th>
                      <th scope="col">Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranks.map((r, i) => (
                      <tr
                        key={r.address}
                        className={
                          r.address.toLowerCase() === address?.toLowerCase()
                            ? "my-rank"
                            : ""
                        }
                      >
                        <td>{i + 1}</td>
                        <th scope="row">
                          <span className="rank-hamster">
                            <img
                              src={asset("favicon.svg")}
                              width="32"
                              height="32"
                              alt=""
                            />
                            {shortAddress(r.address)}
                            {r.address.toLowerCase() ===
                              address?.toLowerCase() && (
                              <span className="you-label">You</span>
                            )}
                          </span>
                        </th>
                        <td>{r.votes}</td>
                        <td>
                          <strong>{r.score}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <img src={asset("favicon.svg")} width="64" height="64" alt="" />
                <h3>The first pawprint could be yours</h3>
                <p>Choose a path in the current round to join.</p>
                <button
                  className="primary"
                  onClick={() => {
                    navigate("story");
                    setTimeout(jumpToVote, 50);
                  }}
                >
                  Choose a path
                  <ArrowRight size={17} />
                </button>
              </div>
            )}
            <div className="score-explainer">
              <span>
                <strong>10</strong>points for each settled choice
              </span>
              <span>
                <strong>+20</strong>if your path matches the wheel
              </span>
              <span>
                <strong>{me?.score ?? 0}</strong>your story points
              </span>
            </div>
            <p className="archive-note">
              Points settle with chapters, never with a countdown. Scores cover
              the confirmed chapters saved here. Clearing site data resets your
              progress.
            </p>
          </section>
        )}
      </main>
      <footer className="site-footer">
        <span className="footer-brand">
          <img src={asset("favicon.svg")} width="22" height="22" alt="" />
          Squeek Tales<span>Made for the little moments.</span>
        </span>
        <div>
          <a
            href="https://docs.squeekchain.com/developers/api/"
            target="_blank"
            rel="noreferrer"
          >
            Round data
            <ArrowUpRight size={13} />
          </a>
          <button className="text-button" onClick={() => setHelp(true)}>
            How to play
          </button>
          <span>Sepolia testnet</span>
        </div>
      </footer>
      <WalletSheet open={walletOpen} onClose={closeWallet} />
      <Modal
        open={help}
        onClose={() => setHelp(false)}
        title="A little guide to the adventure"
        className="help-modal"
      >
        <div className="help-intro">
          <img src={asset("favicon.svg")} width="54" height="54" alt="" />
          <p>
            Squeektoshi is a real hamster. His wheel powers Squeekchain, and its
            confirmed rounds power this story.
          </p>
        </div>
        <ol className="help-steps">
          <li>
            <strong>Pick the next path</strong>
            <p>
              Connect a wallet on Sepolia, then choose Nap, Jog, or Zoomies
              before the 10-minute round ends. You can change your mind until
              then.
            </p>
          </li>
          <li>
            <strong>Let the wheel write</strong>
            <p>
              Once a round is confirmed, 0 work means Nap, 1–499 means Jog, and
              500+ means Zoomies. Each result adds a chapter and changes the
              adventure.
            </p>
          </li>
          <li>
            <strong>Collect a few pawprints</strong>
            <p>
              Earn 10 story points for a settled choice and 20 extra if you
              match the outcome. Your plan appears in your version of the
              chapter.
            </p>
          </li>
        </ol>
        <div className="help-facts">
          <h3>Your own little storybook</h3>
          <p>
            Choices and this device’s leaderboard live in browser storage. They
            are not shared votes or onchain transactions. No gas, signature, or
            tokens are needed.
          </p>
          <p>
            The timer marks the round’s end. Settlement can take longer. We read
            only confirmed SqueekCore events from the public API every 15
            seconds; live wheel estimates never become chapters.
          </p>
        </div>
        <button className="primary full" onClick={() => setHelp(false)}>
          Back to the adventure
          <ArrowRight size={17} />
        </button>
      </Modal>
    </>
  );
}
