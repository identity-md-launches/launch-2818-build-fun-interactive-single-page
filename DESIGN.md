# Squeek Tales design system

The implemented idea is a little forest storybook whose weather, hamster pose, and plot follow the real wheel. Warm paper, botanical greens, berry-colored display type, and original textured SVG art carry that idea. This describes the final source, not a proposed redesign.

## Canonical source

- Tokens, typography, layout, and component states: `src/style.css`.
- Screens, story reader, outcome marks, choice controls, chapter book, and ranking: `src/App.tsx`.
- Native dialog pattern: `src/components/Modal.tsx`.
- Connection sheet: `src/components/WalletSheet.tsx`.
- Three illustration templates: `scripts/create-art.mjs`; runtime files: `public/art/`.

## Colors

The primitive cream, olive, and berry values in `src/style.css:15` feed semantic role tokens. There is one light theme.

| Semantic token | Implemented value | Use |
| --- | --- | --- |
| `--color-page` | `#faf6ed` | Page paper |
| `--color-surface` | `#fffcf6` | Storybook, chapter cards, wallet dialog, art-label backgrounds |
| `--color-subtle` | `#f0edde` | Status bar, voting panel, local-data notice, wallet rows |
| `--color-border` | `#e2ddcf` | Structural separators and card outlines |
| `--color-text` | `#343e2f` | Main text and headings |
| `--color-muted` | `#626b55` | Supporting copy and metadata |
| `--color-action` | `#405b39` | Primary action fill, selected controls, functional links |
| `--color-action-hover` | `#334c2d` | Primary hover |
| `--color-heading-accent` | `#855365` | “Big adventures.” in the main heading |
| `--color-focus` | `#744059` | Keyboard focus perimeter |
| `--color-nap` / `--color-nap-bg` | `#64507e` / `#eee7f5` | Moon icon and Nap category |
| `--color-jog` / `--color-jog-bg` | `#48623d` / `#e9eedf` | Footprints icon and Jog category |
| `--color-zoomies` / `--color-zoomies-bg` | `#8a532a` / `#f8e9d0` | Lightning icon and Zoomies category |
| `--color-error` | `#8e3c38` | Recoverable errors |

Outcome colors always accompany a word and icon. They identify story categories, while the filled green button identifies the current primary action. Selected paths also have a checked radio mark and a border. Wheel-result art has its own palette in the generator; those colors are illustration materials, not additional UI action tokens.

Local details include story prose `#555a48`, selected paths `#e9eedd`, the status dot `#527345`, and the art caption's opaque `#4e6545` background with `#fff8e1` text. Labels never rely on the illustration underneath for contrast.

Measured pairs in `artifacts/quality.json`: text/page **10.38:1**, muted/page **5.19:1**, muted/subtle **4.76:1**, primary label/fill **7.39:1**, berry/page **5.69:1**, and art caption **6.04:1**. Focus/page is **7.43:1** and focus/selected path is **6.77:1**. These are identified solid-color pairs, not a claim that every pixel of an illustration was contrast-tested.

## Typography

Two local Latin WOFF2 families are bundled in `public/fonts/` with OFL licenses:

- **Fraunces**, weight 600, then Georgia/serif: brand, main headline, story and section headings, chapter titles, and score numerals.
- **Nunito Sans**, weights 400, 600, and 800, then system-ui/sans-serif: prose, controls, metadata, tables, and help text. No synthesized style is requested.

The six implemented sizes are `--text-xs: .75rem` (12px), `--text-sm: .875rem` (14px), `--text-base: 1rem` (16px), `--text-lg: 1.25rem` (20px), `--text-xl: 1.75rem` (28px), and `--text-display: 2.75rem` (44px), at the default root size. There is no monospace prose or tracked-capital kicker style.

The main headline is 44px on desktop and 28px below 720px. The chapter title is 28px on desktop, 20px at narrower intermediate widths and at 420px or below. The mobile story body is 14px at 420px or below; desktop is 16px. Headings use balanced wrapping, roughly 1.2 line height, and restrained negative tracking. Prose uses 1.7–1.75 line height and a maximum measure of 65ch; supporting text generally uses 1.5–1.65. Natural casing is retained. Changing round numbers and the timer use tabular numerals.

## Layout and responsiveness

The header is at most 1280px wide; the main shell and footer are at most 1200px, including their padding. Shared section edges align within each shell. The main desktop layout is a flexible story column and a 332px voting column with a 26px gap; at 1200px and above the voting column is 342px.

Spacing is defined by the actual component rules: 5–12px within compact groups, 16–26px between related groups, and 30–40px around larger sections. Page padding is 40px normally, 30px at 1060px, 22px at 720px, and 16px at 420px. The header may wrap when text is enlarged; this fixes overflow at 200% text size without shrinking the labels.

| Breakpoint | Implemented behavior |
| --- | --- |
| 1200px and above | 342px vote column, story text reserves enough height to align the footer comfortably |
| 1060px and below | Tighter header/nav spacing; 310px vote column; five recent round markers |
| 850px and below | 290px vote column; compact path text, scene badges, and header navigation |
| 720px and below | Single story column; navigation moves beneath status; vote panel follows the story; the in-story primary button scrolls to it; four recent round markers; dialogs become bottom sheets |
| 420px and below | Compact header, 14px story prose, 20px chapter heading, smaller art overlays; chapter book becomes illustrated horizontal rows |
| 350px and below | Wordmark stays while the logo image drops out; controls and section headings adapt to the narrower space |

No route needs server rewriting: `#story`, `#chapters`, and `#trailblazers` switch the same page. At 390×844, the product, real chapter, illustration, and “Choose the next path” action are visible; the measured action rectangle starts at y=657.58 and is 44px high. The finished export was checked at 320, 390, 600, 720, 850, 1060, and 1440 CSS pixels with no page overflow. The story screen also reflows without horizontal overflow at 200% root text size at 390 and 1440; this is text enlargement, not browser-native zoom.

## Surfaces and shapes

- Radius tokens: `--radius-sm: 10px`, `--radius-md: 16px`, `--radius-lg: 22px`.
- Storybook: a 1px structural border and 22px corners; the scene's top corners are 21px to account for the border. No shadow.
- Voting panel: a flat tonal surface with 16px corners. Path labels use 10px corners and a 1px selection/structure border.
- The scene's chapter and outcome labels are opaque paper-colored shapes. The tiny forest caption has its own opaque dark surface.
- Dialogs alone use elevation: `0 24px 80px #252f2a33`, no border. Their backdrop is `#28362b80` with 4px blur. Mobile sheets have rounded top corners and safe-area bottom padding.
- No gradients are used in UI text, and no content surface combines a shadow and a border. SVG lantern glow and paper noise are confined to the art.

## Components and states

| Component or pattern | Source and behavior |
| --- | --- |
| Header / navigation | `src/App.tsx`; home wordmark, current-page links, help, and one wallet control. Hash links keep browser Back/Forward usable; the skip link focuses the main content without changing the selected view. |
| `OutcomeMark` | `src/App.tsx:96`; Nap/Jog/Zoomies word plus Lucide icon; `small` uses metadata size. |
| Storybook | `src/App.tsx`; confirmed-round scene, chapter prose, transaction link, previous/next, return-to-latest, and mobile path action. History selection does not change the current voting round. Initial, empty, historical, and new-chapter states have distinct truthful copy. |
| Live bar | `src/App.tsx`; current round from published genesis, last confirmed outcome, and official livestream link. Offline/paused labels and Retry disclose feed failures. A brief hidden status announces a newly settled chapter without moving focus. |
| Path option | Native radio inside `.path-option`; one of three plans. Hover, selected border/check, focus, and disabled submission states remain visible. Selecting a radio does not request a wallet; saving can. |
| Primary / secondary / text buttons | `.primary`, `.secondary`, `.text-button`, `.icon-button`, `.wallet-button` in `src/style.css`; the primary action is filled forest green. Secondary controls use a border or stable text-link placement. Disabled actions use native `disabled` and 55% opacity; wallet rows use the same visible pending state. |
| `Modal` | `src/components/Modal.tsx`; native `dialog.showModal()` supplies modal focus containment and an inert background. Escape, backdrop, and the close button dismiss it; cleanup returns focus to the trigger and restores scrolling. |
| `WalletSheet` | `src/components/WalletSheet.tsx`; installed-wallet names/icons, mobile app rows, Coinbase, pending, rejection, connected address, disconnect, and switch-chain states. Full addresses wrap in the account view. |
| Chapter book | `src/App.tsx`; outcome filters use `aria-pressed`; selecting a chapter returns to the reader. An empty filter offers a clear route back to all chapters. |
| Local leaderboard | `src/App.tsx`; a semantic table with a caption and headers, an explicit device-local notice, empty-state action, and score explanation. No seeded people or rankings. |

Keyboard focus is a 2px berry outline with 4px offset; the radio label uses `:has(input:focus-visible)` so the whole choice is highlighted. Motion is limited to 150ms color transitions and an opt-in 0.96 press scale. Reduced-motion visitors receive no transform animation or smooth scroll. There is no autoplay, perpetual animation, or sound. Forced-colors styles retain structural selection borders.

## Extending the site

Reuse the shell, type tokens, native controls, outcome marks, and dialog before inventing new patterns. Add a story variant in `src/lib/game.ts` under the actual outcome, and keep runtime illustrations in `public/art/`. Never turn an unconfirmed estimate into a chapter or imply the browser leaderboard is shared. Keep the current voting round independent of the chapter being read. Add new shared colors by semantic role, keep the six-size scale, and recheck phone controls and text enlargement after layout changes.

The six-domain review, fixed findings, screenshots, and unperformed checks are recorded in `artifacts/validation.md`. Design guidance attribution is in `THIRD_PARTY.md`.
