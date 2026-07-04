// Shared types for the candidate kanban feature.
// Field names mirror the real backend API (verified live), not the exercise brief.

/** A phase of a position's interview flow (one kanban column). */
export interface InterviewStep {
  id: number;
  name: string;
  orderIndex: number;
}

/** A candidate/application shown as a card on the board. */
export interface Candidate {
  /** candidateId — used as the :candidateId path param when updating the stage. */
  id: number;
  /** applicationId — required in the update-stage request body. */
  applicationId: number;
  fullName: string;
  /** Current phase as a NAME string (not an id), as returned by the API. */
  currentInterviewStep: string;
  /** Mean interview score; may be fractional; 0 means "no interviews yet". */
  averageScore: number;
}

/** Interview flow of a position, already unwrapped and normalized. */
export interface InterviewFlow {
  /** Position title, or null when the flow is empty/missing. */
  positionName: string | null;
  /** Phases, sorted by orderIndex then id. */
  steps: InterviewStep[];
}
