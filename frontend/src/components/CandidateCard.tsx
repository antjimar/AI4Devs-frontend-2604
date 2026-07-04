import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Candidate } from '../types/kanban';
import CandidateCardView from './CandidateCardView';

interface CandidateCardProps {
  candidate: Candidate;
}

/** A draggable candidate card (wraps the presentational CandidateCardView). */
const CandidateCard: React.FC<CandidateCardProps> = ({ candidate }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: candidate.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    cursor: 'grab',
  };

  return (
    <CandidateCardView
      ref={setNodeRef}
      candidate={candidate}
      style={style}
      {...listeners}
      {...attributes}
    />
  );
};

export default CandidateCard;
