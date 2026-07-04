import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Candidate } from '../types/kanban';
import CandidateCard from './CandidateCard';

interface KanbanColumnProps {
  /** Numeric interview step id, or a sentinel string for the unknown-phase column. */
  columnId: number | string;
  title: string;
  candidates: Candidate[];
  /** When false, cards cannot be dropped into this column (e.g. the unknown-phase column). */
  droppable?: boolean;
}

/** A kanban column for one interview phase; a droppable target for candidate cards. */
const KanbanColumn: React.FC<KanbanColumnProps> = ({
  columnId,
  title,
  candidates,
  droppable = true,
}) => {
  const { setNodeRef, isOver } = useDroppable({ id: columnId, disabled: !droppable });

  return (
    <section className="kanban-column" aria-label={`Phase ${title}`}>
      <div className="kanban-column-header">
        <span>{title}</span>
        <span className="badge bg-secondary">{candidates.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={`kanban-column-body ${isOver ? 'kanban-column-over' : ''}`}
      >
        {candidates.length === 0 ? (
          <div className="kanban-empty text-muted">No candidates</div>
        ) : (
          candidates.map((candidate) => (
            <CandidateCard key={candidate.id} candidate={candidate} />
          ))
        )}
      </div>
    </section>
  );
};

export default KanbanColumn;
