## Why

Recruiters can list job positions but cannot see or manage the candidates of a specific position: the "Ver proceso" button on the positions list leads nowhere. They need a single view to see, at a glance, which interview phase each candidate is in and to advance a candidate without editing forms.

## What Changes

- Add a position detail route `/positions/:id` that renders a **kanban board** of the position's candidates, with one column per interview phase.
- Wire the existing "Ver proceso" button in the positions list to navigate to that route.
- Each candidate appears as a card (full name + average score) in the column of their current phase; columns are ordered by the interview flow.
- Support **drag & drop** to move a candidate card to another phase, with optimistic UI and revert-on-error, persisting the change to the backend.
- Handle loading, error, and empty states (position with no phases, or phases with no candidates).
- Responsive layout: phases stack vertically (full width) on mobile.
- Add a small frontend service layer for the three position/candidate endpoints and a new dependency `@dnd-kit/core`.

## Capabilities

### New Capabilities

- `candidate-kanban`: viewing a position's candidates as a kanban board grouped by interview phase, and moving a candidate between phases via drag & drop (with backend persistence, optimistic update, and error recovery), including navigation to/from the positions list and loading/error/empty states.

### Modified Capabilities

<!-- None. No existing OpenSpec spec-level behavior changes; the positions list is only wired for navigation, which is part of the new capability's scope. -->

## Impact

- **Frontend code** (`frontend/src/`):
  - `App.js` — add the `/positions/:id` route.
  - `components/Positions.tsx` — wire "Ver proceso" to navigate (list still uses mock data; not connected to the API — out of scope).
  - New components for the position detail view, kanban board, columns, and candidate cards (TypeScript `.tsx`).
  - New service module for the position/candidate API calls (native `fetch`).
- **Dependencies**: add `@dnd-kit/core` (and its companions as needed). `axios` remains unused.
- **Backend**: none. This is a frontend-only change consuming the existing, verified API (`/position/:id/interviewflow`, `/position/:id/candidates`, `PUT /candidates/:candidateId`).

## Non-goals

- Modifying the backend or its endpoints.
- Filtering or searching within the board.
- Viewing/editing a candidate's full detail (CV, individual interviews).
- Authentication/authorization.
- Connecting the `/positions` list to the real API (it stays on mock data; only the button navigation is wired).
