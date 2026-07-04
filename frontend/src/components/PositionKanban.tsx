import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Container, Spinner, Alert, Button } from 'react-bootstrap';
import { ArrowLeft } from 'react-bootstrap-icons';
import {
  CollisionDetection,
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { Candidate, InterviewStep } from '../types/kanban';
import {
  buildStepNameToId,
  getCandidates,
  getInterviewFlow,
  updateCandidateStage,
} from '../services/positionService';
import KanbanColumn from './KanbanColumn';
import CandidateCardView from './CandidateCardView';
import './PositionKanban.css';

const UNKNOWN_COLUMN_ID = 'unknown';

// Pointer-based detection for mouse/touch, falling back to rectangle
// intersection so KeyboardSensor drags (which provide no pointer coordinates)
// can still resolve a drop target.
const collisionDetectionStrategy: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);
  return pointerCollisions.length > 0 ? pointerCollisions : rectIntersection(args);
};

/** Position detail view: a kanban board of a position's candidates by interview phase. */
const PositionKanban: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [positionName, setPositionName] = useState<string | null>(null);
  const [steps, setSteps] = useState<InterviewStep[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [moveError, setMoveError] = useState<string | null>(null);

  // Latest intended destination phase per candidate, so a failed move that has
  // already been superseded by a newer move of the same candidate does not
  // revert the newer (still-applied) state.
  const pendingMoveRef = useRef(new Map<number, string>());

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [flow, cands] = await Promise.all([
          getInterviewFlow(id!),
          getCandidates(id!),
        ]);
        if (cancelled) return;
        setPositionName(flow.positionName);
        setSteps(flow.steps);
        setCandidates(cands);
      } catch (e) {
        if (!cancelled) {
          setError('Unable to load the position board. Please try again later.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const stepNameToId = useMemo(() => buildStepNameToId(steps), [steps]);

  // Group candidates into columns by their current phase; anything that does not
  // map to a known phase goes to the "unknown phase" bucket (never dropped silently).
  const { byColumn, unknown } = useMemo(() => {
    const grouped = new Map<number, Candidate[]>();
    steps.forEach((step) => grouped.set(step.id, []));
    const unassigned: Candidate[] = [];
    for (const candidate of candidates) {
      const stepId = stepNameToId.get(candidate.currentInterviewStep);
      if (stepId != null && grouped.has(stepId)) {
        grouped.get(stepId)!.push(candidate);
      } else {
        unassigned.push(candidate);
      }
    }
    return { byColumn: grouped, unknown: unassigned };
  }, [candidates, steps, stepNameToId]);

  const handleDragStart = useCallback(() => setMoveError(null), []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const overId = event.over?.id;
      if (overId == null) return; // dropped outside any column → no-op

      const destStepId = Number(overId);
      const destStep = steps.find((step) => step.id === destStepId);
      if (!destStep) return; // not a real phase column → no-op

      const candidateId = Number(event.active.id);
      const candidate = candidates.find((c) => c.id === candidateId);
      if (!candidate) return;

      const currentStepId = stepNameToId.get(candidate.currentInterviewStep);
      if (currentStepId === destStepId) return; // dropped on its own column → no-op

      // Optimistic move. Revert only THIS candidate on failure (functional
      // update) so a concurrent in-flight move of another candidate is not
      // clobbered by a stale whole-list snapshot.
      const previousStepName = candidate.currentInterviewStep;
      pendingMoveRef.current.set(candidateId, destStep.name);
      setCandidates((prev) =>
        prev.map((c) =>
          c.id === candidateId ? { ...c, currentInterviewStep: destStep.name } : c,
        ),
      );

      updateCandidateStage(candidateId, candidate.applicationId, destStepId).catch(() => {
        // Skip the revert if a newer move of the same candidate has superseded
        // this one, to avoid clobbering the newer (still-applied) state.
        if (pendingMoveRef.current.get(candidateId) !== destStep.name) return;
        setCandidates((prev) =>
          prev.map((c) =>
            c.id === candidateId ? { ...c, currentInterviewStep: previousStepName } : c,
          ),
        );
        setMoveError(
          `Could not move ${candidate.fullName} to "${destStep.name}". The change was reverted.`,
        );
      });
    },
    [candidates, steps, stepNameToId],
  );

  const title = positionName ?? `Position #${id}`;

  return (
    <Container fluid className="mt-4 mb-5">
      <div className="d-flex align-items-center mb-4">
        <Button
          variant="link"
          className="p-0 me-3 text-decoration-none"
          onClick={() => navigate('/positions')}
          aria-label="Back to positions list"
        >
          <ArrowLeft size={28} />
        </Button>
        <h2 className="m-0">{title}</h2>
      </div>

      {loading && (
        <div className="text-center my-5">
          <Spinner animation="border" role="status" aria-label="Loading" />
          <div className="mt-2 text-muted">Loading…</div>
        </div>
      )}

      {!loading && error && <Alert variant="danger">{error}</Alert>}

      {!loading && !error && (
        <>
          {moveError && (
            <Alert variant="warning" dismissible onClose={() => setMoveError(null)}>
              {moveError}
            </Alert>
          )}

          {steps.length === 0 ? (
            // No interview phases configured for this position: no board to show.
            // Explain it and still list the candidates so none are hidden.
            <>
              <Alert variant="info">
                This position has no interview phases configured, so there is no board to
                manage yet.
              </Alert>
              {unknown.length > 0 && (
                <div className="candidate-list">
                  <h6 className="text-muted mb-3">Candidates in this position</h6>
                  {unknown.map((candidate) => (
                    <CandidateCardView key={candidate.id} candidate={candidate} />
                  ))}
                </div>
              )}
            </>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={collisionDetectionStrategy}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div className="kanban-board">
                {steps.map((step) => (
                  <KanbanColumn
                    key={step.id}
                    columnId={step.id}
                    title={step.name}
                    candidates={byColumn.get(step.id) ?? []}
                  />
                ))}
                {unknown.length > 0 && (
                  <KanbanColumn
                    columnId={UNKNOWN_COLUMN_ID}
                    title="Unknown phase"
                    candidates={unknown}
                    droppable={false}
                  />
                )}
              </div>
            </DndContext>
          )}
        </>
      )}
    </Container>
  );
};

export default PositionKanban;
