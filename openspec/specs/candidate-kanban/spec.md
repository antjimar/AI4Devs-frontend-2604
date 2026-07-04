# candidate-kanban Specification

## Purpose
TBD - created by archiving change add-candidate-kanban-board. Update Purpose after archive.
## Requirements
### Requirement: Navigate from positions list to the position detail board
The system SHALL provide a position detail view at route `/positions/:id` and SHALL navigate to it when the user activates the "Ver proceso" button of a position in the positions list.

#### Scenario: Open a position process from the list
- **WHEN** the user is on the positions list `/positions` and activates "Ver proceso" on a position
- **THEN** the application navigates to `/positions/:id` for that position
- **AND** the candidate kanban board for that position begins to load

### Requirement: Position detail header with title and back navigation
The position detail view SHALL display the position title at the top and a back control to its left that returns the user to the positions list. When the position name is unavailable (e.g. the interview flow is empty or missing), the view SHALL display a fallback title derived from the position id.

#### Scenario: Header shows title and back control
- **WHEN** the position detail view is displayed and a position name is available
- **THEN** the position title is shown at the top of the view
- **AND** a back arrow control is shown to the left of the title

#### Scenario: Title falls back when the position name is unavailable
- **WHEN** the position detail view loads but no position name is available (empty or missing interview flow)
- **THEN** a fallback title derived from the position id is shown (for example, "Position #{id}")
- **AND** the back arrow control is still shown

#### Scenario: Back control returns to the list
- **WHEN** the user activates the back control
- **THEN** the application navigates back to the positions list `/positions`

### Requirement: One column per interview phase, ordered by the process
The board SHALL render exactly one column per interview phase of the position's interview flow, labeled with the phase name, ordered by the process order.

#### Scenario: Columns match the interview flow phases
- **WHEN** the position's interview flow defines N phases
- **THEN** the board renders exactly N columns, one per phase
- **AND** each column header shows the phase name

#### Scenario: Columns are ordered stably
- **WHEN** two phases share the same order index
- **THEN** the columns are ordered by order index and, on ties, by phase id ascending

### Requirement: Candidate cards placed in their current phase
Each candidate SHALL be shown as a card in the column of their current phase, displaying the candidate's full name and average score. The average score SHALL be shown rounded to one decimal place. A candidate whose current phase does not match any column of the interview flow SHALL NOT be dropped silently; the board SHALL still render without error.

#### Scenario: Card placement and content
- **WHEN** the board has loaded a position's candidates
- **THEN** each candidate appears as a card in the column matching their current phase
- **AND** each card shows the candidate's full name and their average score rounded to one decimal place

#### Scenario: Candidate whose phase is not in the interview flow
- **WHEN** the board has phase columns and a candidate's current phase name does not match any of them
- **THEN** the board renders without error and does not crash
- **AND** that candidate is not silently discarded (it is shown in an "Unknown phase" grouping alongside the phase columns)

### Requirement: Move a candidate to another phase via drag and drop
The system SHALL let the user drag a candidate card to another phase column, update the UI optimistically, persist the new phase to the backend, and revert with a non-intrusive error message if persistence fails.

#### Scenario: Successful move
- **WHEN** the user drags a candidate card and drops it on a different phase column
- **THEN** the card is shown immediately in the target column (optimistic update)
- **AND** the backend is called to update the candidate's phase
- **AND** the card remains in the target column when the backend confirms success

#### Scenario: Move fails on the backend
- **WHEN** the backend call to update the phase fails
- **THEN** the card returns to its original column
- **AND** the user is informed of the error in a non-intrusive way

#### Scenario: Drop with no effective phase change
- **WHEN** the user drops a card on its own phase column, or outside any valid phase column
- **THEN** no backend call is made
- **AND** the card remains in its original column with no error

### Requirement: Responsive mobile layout
On narrow (mobile) viewports, the board SHALL present phases stacked vertically, each occupying the full width, and remain scrollable.

#### Scenario: Board on a narrow viewport
- **WHEN** the board is displayed on a narrow (mobile) viewport
- **THEN** the phases are shown stacked vertically, each taking the full width
- **AND** the user can scroll to see all phases and candidates

### Requirement: Loading, error, and empty states
The position detail view SHALL show a loading indicator while fetching, handle a position with no configured phases with a clear message rather than an empty board, render columns without candidates as clearly empty, and surface a clear error state when data cannot be loaded.

#### Scenario: Loading indicator while fetching
- **WHEN** the user enters the position detail view and data is being fetched
- **THEN** a loading indicator is shown until the data is available

#### Scenario: Position with no interview phases configured
- **WHEN** a position's interview flow has no phases
- **THEN** the view shows an informational message that no phases are configured
- **AND** it lists the position's candidates (read-only) instead of rendering an empty draggable board

#### Scenario: Empty column within a board
- **WHEN** a position has phases but a given phase has no candidates
- **THEN** that phase's column still renders and is clearly represented as empty

#### Scenario: Data cannot be loaded
- **WHEN** fetching the interview flow or candidates fails
- **THEN** the view shows a clear error state instead of an empty or broken board

