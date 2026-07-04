## 0. Setup

- [x] 0.1 Confirm work is on the existing feature branch `feature/kanban-candidates-AJM` (never commit to `main`)
- [x] 0.2 Ensure backend (:3010), frontend (:3000) and Postgres (:5432) are running; reseed if needed
- [x] 0.3 Install `@dnd-kit/core` (and `@dnd-kit/utilities`) in `frontend/`

## 1. Types and service layer

- [x] 1.1 Define TypeScript types: `InterviewStep` (`{ id, name, orderIndex }`), `Candidate` (`{ id, applicationId, fullName, currentInterviewStep, averageScore }`)
- [x] 1.2 Create `frontend/src/services/positionService.ts` with `API_BASE_URL` from `process.env.REACT_APP_API_URL` (fallback `http://localhost:3010`)
- [x] 1.3 Implement `getInterviewFlow(positionId)` — unwrap the double-nested response into `{ positionName: string | null, steps }` with steps sorted by `orderIndex` then `id`
- [x] 1.4 Implement `getCandidates(positionId)` — return the candidates array typed
- [x] 1.5 Implement `updateCandidateStage(candidateId, applicationId, stepId)` — `PUT /candidates/:candidateId` with body `{ applicationId, currentInterviewStep: stepId }`; throw on non-OK
- [x] 1.6 Build the phase name→id map helper from the loaded steps (columns are keyed by numeric step id, not name)

## 2. Components

- [x] 2.1 Create `CandidateCard.tsx` — draggable card showing full name and average score
- [x] 2.2 Create `KanbanColumn.tsx` — droppable column for one phase; renders its cards or an empty placeholder
- [x] 2.3 Create `PositionKanban.tsx` — container for `/positions/:id`: read `:id` (`useParams`), fetch flow + candidates (`useEffect`), own `loading`/`error`/`positionName`/`steps`/`candidates` state
- [x] 2.4 Render header: position title with a back arrow (`react-bootstrap-icons`) that navigates to `/positions` (`useNavigate`); when `positionName` is null, show a fallback title `Position #{id}`
- [x] 2.5 Render the board: one column per sorted phase, each candidate card placed in its current phase via the name→id map; render `averageScore` rounded to one decimal
- [x] 2.6 Handle candidates whose phase is not in the flow: collect them in a labeled "Unknown phase" grouping (never drop silently); rendered candidate count must equal the API count

## 3. Drag & drop

- [x] 3.1 Wrap the board in a `@dnd-kit` `DndContext`; make columns droppable (keyed by numeric step id) and cards draggable
- [x] 3.2 On drop: destination is the target column's step id; no-op (no backend call, no state change) if dropped on its own column or outside any valid column; otherwise update `candidates` optimistically
- [x] 3.3 Call `updateCandidateStage`; on failure, revert to the pre-move snapshot and show a non-intrusive error (dismissible `Alert`)

## 4. States and responsiveness

- [x] 4.1 Loading indicator (`Spinner`) while fetching; error state when flow/candidates fail to load
- [x] 4.2 Empty handling: position with no phases and phases with no candidates render cleanly (empty column placeholder)
- [x] 4.3 Responsive layout: columns side-by-side on desktop, stacked full-width and scrollable on mobile

## 5. Routing and navigation wiring

- [x] 5.1 Add `<Route path="/positions/:id" element={<PositionKanban />} />` in `App.js` (not `App.tsx`)
- [x] 5.2 Wire the "Ver proceso" button in `Positions.tsx` to navigate to `/positions/:id`

## 6. Verification (AGENT MUST EXECUTE — do not delegate to the user)

- [x] 6.1 `tsc`/build check: no TypeScript or compile errors; no console errors in the browser
- [x] 6.2 Manual API checks with `curl` for the three endpoints against `:3010`; after any PUT, restore the candidate's original phase
- [x] 6.3 E2E happy path with Playwright MCP on `/positions/1`: verify columns/cards render (CA-3, CA-4), title + back navigation (CA-2), average score shown with one decimal, and a successful drag persists the move (CA-5 success); restore DB state afterwards
- [x] 6.4 E2E revert-on-error (CA-5 failure): force the PUT to fail WITHOUT touching the backend — intercept/abort the `PUT /candidates/:id` request via Playwright network routing (or use a non-existent candidate id) — then confirm the card returns to its origin column and a non-intrusive error is shown
- [x] 6.5 Verify no-op drops (drop on same column / outside any column): no backend call, no state change, no error
- [x] 6.6 Verify responsive/mobile layout (CA-6) and loading/empty states (CA-7) via Playwright snapshots at a narrow viewport
- [x] 6.7 Verify edge cases: fallback title when a position has no interview flow; a candidate in an unknown phase is not silently dropped (rendered count == API count)
- [x] 6.8 Cross-check every acceptance criterion (CA-1…CA-7) from the user story against observed behavior. Note: CA-1 (click "Ver proceso" → correct board) is exercised with a mock position whose id exists in the backend, or via direct navigation to `/positions/1`, since the list still uses mock data

## 7. Documentation

- [x] 7.1 Update `docs/frontend-standards.md` only if a new convention was introduced
- [x] 7.2 Record the prompts used in `prompts/prompts-AJM.md` (Spanish, for delivery)
