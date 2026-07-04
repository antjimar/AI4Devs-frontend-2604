## Context

The frontend is a Create React App project (React 18.3, TypeScript 4.9, React Router v6, React Bootstrap 5). The positions list (`Positions.tsx`) exists but uses mock data and its "Ver proceso" button has no action. There is no drag-and-drop library and no centralized API client; existing calls hardcode `http://localhost:3010` via `fetch` (and one unused `axios` import).

The backend is fixed (frontend-only exercise). Its real contract — verified live with curl — differs from the exercise brief:

- `GET /position/:id/interviewflow` (singular, lowercase) returns a **double-nested** object: `resp.interviewFlow.positionName` and `resp.interviewFlow.interviewFlow.interviewSteps[]` where each step is `{ id, name, orderIndex, ... }`.
- `GET /position/:id/candidates` (singular) returns `[{ fullName, currentInterviewStep (phase NAME string), averageScore, id (candidateId), applicationId }]`.
- `PUT /candidates/:candidateId` (no `/stage`) takes body `{ applicationId, currentInterviewStep: <destination step id, numeric> }`.

## Goals / Non-Goals

**Goals:**

- A `/positions/:id` route rendering a kanban board grouped by interview phase, fed by the real API.
- Drag & drop between columns with optimistic update and revert-on-error.
- Clear loading / error / empty states and a responsive (mobile-stacked) layout.
- A thin, typed service layer isolating the three endpoints and the response-shape quirks.

**Non-Goals:**

- Any backend change; connecting the positions list to the API; filtering/search; candidate detail; auth.

## Decisions

### D1 — Drag & drop: `@dnd-kit/core`

Use `@dnd-kit/core` (with `@dnd-kit/sortable` only if needed for intra-column ordering, which is out of scope). Rationale: React 18 compatible, actively maintained, accessible (keyboard DnD out of the box), no StrictMode warnings. Alternatives rejected: `react-beautiful-dnd` (deprecated, StrictMode warnings), native HTML5 DnD (poor mobile support and accessibility, more manual code). Columns are droppable targets; cards are draggables. On mobile, DnD is secondary to simply viewing the board (see D6).

### D2 — Phase name ↔ id mapping

The candidates endpoint returns the phase as a **name** string, but the PUT requires the numeric phase **id**. Build a `Map<string, number>` (name → id) from `interviewSteps` once the interview flow loads, used to place each candidate card in the right column. For the destination of a drop, do NOT round-trip through the name: columns are keyed by their numeric step **id**, so the drop handler already has the destination id directly (no name lookup). This isolates the naming quirk in one place and keeps moves id-based.

**Assumption & guard**: this assumes phase `name` values are unique within a flow (true for the seed). If two steps shared a name, the name→id map would collapse and cards could land in the wrong column. Mitigation: placement falls back gracefully (see D8) and, because moves are keyed by column id (not name), a dropped card always targets the intended column even under a name clash. Column identity throughout the board is the step `id`, never the name.

### D3 — Column ordering

Sort phases by `orderIndex` ascending, breaking ties by `id` ascending (the seed has two phases sharing `orderIndex: 2`). This yields a stable, deterministic column order. Note this is a data quirk in the seed, not a rule: the true process order is owned by the backend. Where `orderIndex` ties, the id tie-break is arbitrary from a business standpoint (it happens to keep "Manager Interview" last). Fixing the seed is out of scope; the frontend only guarantees a stable, deterministic rendering.

### D4 — Service layer with `fetch`

Add `frontend/src/services/positionService.ts` exposing typed async functions: `getInterviewFlow(positionId)`, `getCandidates(positionId)`, `updateCandidateStage(candidateId, applicationId, stepId)`. Use native `fetch` (avoid adding `axios`). Define `API_BASE_URL` from `process.env.REACT_APP_API_URL` with fallback `http://localhost:3010`. Each function unwraps the backend's shape (notably the double-nested interview flow) and returns clean typed data, so components never see the raw quirks. Throw on non-OK responses for the caller to handle.

### D5 — Component structure and state

New TypeScript components under `frontend/src/components/`:

- `PositionKanban.tsx` — container for `/positions/:id`. Reads `:id` via `useParams`, fetches flow + candidates in `useEffect`, owns state: `loading`, `error`, `positionName`, `steps` (sorted), and `candidates`. Renders header (title + back arrow via `useNavigate`), the board, and loading/error/empty states.
- `KanbanColumn.tsx` — a droppable column for one phase; renders its candidate cards or an empty placeholder.
- `CandidateCard.tsx` — a draggable card showing full name and average score.

State is local (React hooks), consistent with the codebase (no global store). The board derives per-column candidate lists from `candidates` + the name→id map.

### D6 — Optimistic update with revert

On drop: (1) compute destination step id; if same as current (or dropped outside any column), no-op. (2) Update `candidates` state immediately via a functional update (move the card). (3) Call `updateCandidateStage`. (4) On success, keep it. On failure, revert and show a non-intrusive error (React Bootstrap dismissible `Alert`); clear any prior error on `onDragStart`.

**Revert scope (important):** revert **only the affected candidate**, not a whole-array snapshot. Capture the candidate's `previousStepName` before the optimistic move, and on failure use a functional update that restores just that candidate's `currentInterviewStep`. A whole-list snapshot would clobber a concurrent in-flight move of a *different* candidate (e.g. move A, then move B, then A's PUT fails and its stale snapshot erases B). Per-candidate functional updates for both the move and the revert make concurrent moves safe.

### D7 — Routing and navigation hook

Add `<Route path="/positions/:id" element={<PositionKanban />} />` in `App.js` (the real router; `App.tsx` is dead boilerplate). In `Positions.tsx`, wire "Ver proceso" to `navigate(\`/positions/${position.id}\`)` (or a `Link`). The list stays on mock data; only navigation is wired.

### D8 — Edge cases: unavailable title, unknown phase, score formatting

- **Fallback title**: the position name only comes from `interviewflow` (`interviewFlow.positionName`). If the flow is empty/missing, `positionName` is absent. The header then shows a fallback derived from the route id (e.g. `Position #{id}`) so the header never renders blank. `getInterviewFlow` returns `positionName: string | null` and the component decides the fallback.
- **Candidate in an unknown phase**: a candidate's `currentInterviewStep` (name) may not match any column. When the board HAS phase columns, any candidate that does not resolve to a known column id is collected into a clearly-labeled "Unknown phase" grouping alongside the columns rather than being dropped silently. This keeps the count of rendered candidates equal to the count returned by the API (a cheap invariant to assert during verification).
- **Position with no phases configured** (empty interview flow): do NOT render a board — a lone "Unknown phase" column is confusing. Instead show an informational message ("no interview phases configured") and list the position's candidates read-only (via the presentational `CandidateCardView`, no drag), so candidates are still visible. This is the common real trigger; the unknown-phase grouping above is for per-candidate drift when a board does exist.
- **Average score formatting**: `averageScore` is a mean and may be fractional. Display it rounded to **one decimal place** (e.g. `4.5`, `0.0`). A value of `0` is a real value (candidate with no interviews) and is shown, not hidden.

## Risks / Trade-offs

- **Mock list ids may not match real position ids** → For manual/E2E verification, navigate directly to `/positions/1` (Senior Full-Stack Engineer, the seeded position with 3 candidates and 3 phases). Document this; the button wiring is still correct for when the list is connected later.
- **Double-nested response is easy to mis-read** → Isolated entirely in `positionService` (D4); components consume clean data.
- **`orderIndex` ties** → Deterministic tie-break by id (D3); business order is backend-owned and out of scope to fix.
- **Duplicate phase names** → Column identity is the step id, not the name; moves are id-based (D2), so a name clash cannot misroute a drop.
- **Candidate in an unknown phase** → Collected in an "unknown phase" grouping, never dropped silently (D8); verify rendered count == API count.
- **DnD on mobile can be finicky** → @dnd-kit supports touch sensors; if touch DnD proves unreliable in the time available, the board still fulfills viewing/loading/empty/responsive requirements, and DnD remains functional on desktop (the primary recruiter environment).
- **Average score formatting** → Rounded to one decimal (D8); `0` is a real value and is shown, not hidden.

## Migration Plan

Not applicable — additive frontend feature on a feature branch, no data migration. Rollback = revert the branch/PR.

## Open Questions

- None blocking. Intra-column ordering and persistence of card order within a phase are intentionally out of scope.
