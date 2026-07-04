import React from 'react';
import { Card } from 'react-bootstrap';
import { Candidate } from '../types/kanban';

type CandidateCardViewProps = {
  candidate: Candidate;
} & React.HTMLAttributes<HTMLDivElement>;

/**
 * Presentational candidate card (full name + average score, rounded to one
 * decimal). No drag behavior — shared by the draggable `CandidateCard` and by
 * read-only candidate lists (e.g. a position with no interview phases).
 */
const CandidateCardView = React.forwardRef<HTMLDivElement, CandidateCardViewProps>(
  ({ candidate, ...rest }, ref) => {
    const score = (candidate.averageScore ?? 0).toFixed(1);
    return (
      <Card
        ref={ref}
        className="mb-2 shadow-sm candidate-card"
        aria-label={`Candidate ${candidate.fullName}, average score ${score}`}
        {...rest}
      >
        <Card.Body className="p-2">
          <div className="fw-semibold">{candidate.fullName}</div>
          <small className="text-muted">Score: {score}</small>
        </Card.Body>
      </Card>
    );
  },
);

CandidateCardView.displayName = 'CandidateCardView';

export default CandidateCardView;
