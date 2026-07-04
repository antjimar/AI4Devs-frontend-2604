// Service layer for the candidate kanban feature.
// Isolates the real backend API quirks (singular routes, double-nested interview
// flow, name-vs-id phase) so components consume clean, typed data.

import { Candidate, InterviewFlow, InterviewStep } from '../types/kanban';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3010';

/**
 * Fetch and normalize a position's interview flow.
 * The backend response is double-nested:
 *   { interviewFlow: { positionName, interviewFlow: { interviewSteps: [...] } } }
 * Steps are sorted by orderIndex, breaking ties by id (the seed has ties).
 */
export async function getInterviewFlow(positionId: number | string): Promise<InterviewFlow> {
  const response = await fetch(`${API_BASE_URL}/position/${positionId}/interviewflow`);
  if (!response.ok) {
    throw new Error(`Failed to load interview flow (HTTP ${response.status})`);
  }
  const data = await response.json();
  const outer = data?.interviewFlow;
  const positionName: string | null = outer?.positionName ?? null;
  const rawSteps: InterviewStep[] = outer?.interviewFlow?.interviewSteps ?? [];

  const steps = rawSteps
    .map((step) => ({ id: step.id, name: step.name, orderIndex: step.orderIndex }))
    .sort((a, b) => a.orderIndex - b.orderIndex || a.id - b.id);

  return { positionName, steps };
}

/** Fetch the candidates (applications) of a position. */
export async function getCandidates(positionId: number | string): Promise<Candidate[]> {
  const response = await fetch(`${API_BASE_URL}/position/${positionId}/candidates`);
  if (!response.ok) {
    throw new Error(`Failed to load candidates (HTTP ${response.status})`);
  }
  const data = await response.json();
  return (Array.isArray(data) ? data : []) as Candidate[];
}

/**
 * Move a candidate to a different interview phase.
 * Note: the path param is the candidateId and the body carries the numeric
 * destination step id (not its name).
 */
export async function updateCandidateStage(
  candidateId: number,
  applicationId: number,
  interviewStepId: number,
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/candidates/${candidateId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ applicationId, currentInterviewStep: interviewStepId }),
  });
  if (!response.ok) {
    throw new Error(`Failed to update candidate stage (HTTP ${response.status})`);
  }
}

/**
 * Build a phase name -> step id map from the interview flow steps.
 * Used to place each candidate (which carries the phase NAME) into the right
 * column (keyed by numeric step id). Assumes phase names are unique within a flow.
 */
export function buildStepNameToId(steps: InterviewStep[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const step of steps) {
    map.set(step.name, step.id);
  }
  return map;
}
