# Frontend standards (LTI ATS frontend)

Conventions for the React frontend under `frontend/`. Companion to the root `CLAUDE.md`.

## Technology stack

- **React 18.3** with functional components and hooks.
- **TypeScript 4.9** for new code (`.tsx`). Legacy `.js` components can stay until refactored.
- **Create React App 5** (`react-scripts`) — build tooling and dev server. Not Vite/Next.
- **React Router DOM v6** — routing (`<Routes>/<Route element>`, `useNavigate`, `useParams`).
- **React Bootstrap 5** + `react-bootstrap-icons` — UI. No styled-components/MUI.
- **@dnd-kit/core** — drag & drop (accessible, React 18 compatible). Chosen over the deprecated `react-beautiful-dnd`. Key droppable columns by a stable domain id. For collision detection, compose `pointerWithin` with a `rectIntersection` fallback: `pointerWithin` gives predictable board-style drops for mouse/touch, but returns nothing for `KeyboardSensor` (no pointer coordinates), so falling back to `rectIntersection` keeps keyboard drags working.
- **fetch** — HTTP client. Note: `axios` is imported by `services/candidateService.js` but is NOT installed; prefer `fetch` for new code.

## Codebase traps (read before editing)

- **Edit `App.js`, not `App.tsx`**: `index.tsx` imports `./App`, which resolves to `App.js` (the real router). `App.tsx` is dead CRA boilerplate.
- **`Positions.tsx` uses mock data**, not the API, and its "Ver proceso" button has no action. That button is the navigation hook point to the position detail view.
- **No centralized API client**: existing calls hardcode `http://localhost:3010`. New code may introduce a small service module and optionally `REACT_APP_API_URL` (fallback `http://localhost:3010`).

## Project structure

```
frontend/src/
├── components/    # UI components (PascalCase files, .tsx preferred)
├── services/      # API service layer (camelCase + "Service" suffix)
├── assets/        # images, static resources
├── App.js         # main app + routes (edit THIS)
└── index.tsx      # entry point
```

## Coding standards

- **Naming**: PascalCase components (`CandidateCard.tsx`), camelCase variables/functions (`fetchCandidates`), UPPER_SNAKE_CASE constants (`API_BASE_URL`), PascalCase types/interfaces (`CandidateCardProps`), kebab-case CSS classes, `useX` custom hooks.
- **Components**: functional + hooks; `useState` for local state; `useEffect` for fetching/side effects; destructure props with a typed interface; React Bootstrap for UI.
- **Services**: pure async functions with try/catch and error propagation; group per domain.
- **State**: local hooks only (no global store); explicit `loading`/`error` handling; React Bootstrap `Spinner`/`Alert` for feedback.
- **All code, comments, and UI/error strings in English.**

## Backend API contract (verified live — the exercise brief documents a different, incorrect contract; trust this one)

Base URL: `http://localhost:3010`

| Purpose | Method & path | Notes |
|---|---|---|
| Phases of the process | `GET /position/:id/interviewflow` | singular, lowercase. **Double-nested**: `resp.interviewFlow.positionName`, `resp.interviewFlow.interviewFlow.interviewSteps[]` (`{id, name, orderIndex}`). Sort columns by `orderIndex` then `id` (ties exist in seed). |
| Candidates of a position | `GET /position/:id/candidates` | singular. Array of `{fullName, currentInterviewStep (step NAME), averageScore, id (candidateId), applicationId}`. |
| Move candidate to a phase | `PUT /candidates/:candidateId` | no `/stage`. Body `{applicationId, currentInterviewStep: <destination step id, numeric>}`. Cards carry the phase NAME, but the PUT needs the numeric step id → build a name→id map from the interview flow. |

## UI/UX standards

- **Bootstrap**: use React Bootstrap components (`Container`, `Row`, `Col`, `Card`, `Button`, `Spinner`, `Alert`). Grid for layout.
- **Navigation**: React Router; back-navigation via `useNavigate`.
- **Optimistic UI**: for drag & drop, move the card immediately and revert on API failure, showing a non-intrusive error.
- **Responsive**: kanban degrades to vertical (one full-width column per phase) on mobile.
- **Accessibility**: `aria-label` on interactive elements, semantic HTML, keyboard support (@dnd-kit provides keyboard DnD).

## Testing

- **E2E with Playwright MCP** for user-facing workflows: the agent drives the browser itself (navigate, click, drag, snapshot) and verifies outcomes; restore data state after mutating checks.
  - **Testing @dnd-kit drags**: Playwright's `dragTo` (single mouse jump) does not reliably trigger dnd-kit's PointerSensor. Use stepped mouse moves instead: `mouse.move(start)` → `mouse.down()` → a small move to pass the activation constraint → `mouse.move(end, { steps: N })` → `mouse.up()`.
  - **Forcing failure paths**: to test revert-on-error without touching the backend, intercept the request with `page.route(...)` and `route.abort()`.
- **Manual API checks with `curl`** against the running backend to confirm integration.
- Component unit tests are optional for this exercise; if added, use React Testing Library (CRA's `react-scripts test`; note the current `npm test` script is misconfigured and points to a non-existent `jest.config.js`).
