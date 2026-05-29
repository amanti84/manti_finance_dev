import type { FC } from 'react'
import type { InboxBadgeCount } from '../../types'

interface InboxBadgeProps {
  count: InboxBadgeCount
}

export const InboxBadge: FC<InboxBadgeProps> = ({ count }) => {
  if (count.total === 0) return null

  const isUrgent = count.requiresReview > 0

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <span
        className={isUrgent ? 'pulse' : ''}
        style={{
          backgroundColor: '#dc3545',
          color: 'white',
          borderRadius: '50%',
          padding: '2px 6px',
          fontSize: '0.7rem',
          marginLeft: '4px',
          minWidth: '18px',
          textAlign: 'center',
          display: 'inline-block',
        }}
        title={`${count.total} documenti pendenti (${count.requiresReview} da rivedere)`}
      >
        {count.total}
      </span>
      <style>{`
        .pulse {
          animation: pulse-red 2s infinite;
          box-shadow: 0 0 0 0 rgba(220, 53, 69, 0.7);
        }

        @keyframes pulse-red {
          0% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(220, 53, 69, 0.7);
          }
          70% {
            transform: scale(1);
            box-shadow: 0 0 0 10px rgba(220, 53, 69, 0);
          }
          100% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(220, 53, 69, 0);
          }
        }
      `}</style>
    </div>
  )
}
