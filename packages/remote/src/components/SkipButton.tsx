import { IconFastForward } from '../icons';

interface SkipButtonProps {
  isSkipVisible: boolean;
  skipText: string;
  activeAccent: string;
  onSkip: () => void;
}

export function SkipButton({ isSkipVisible, skipText, activeAccent, onSkip }: SkipButtonProps) {
  return (
    <div style={{ width: '100%' }}>
      <button
        className="skip-intro-button"
        onClick={onSkip}
        disabled={!isSkipVisible}
        style={{
          width: '100%',
          padding: '14px 16px',
          borderRadius: 14,
          border: isSkipVisible
            ? `1.5px solid ${activeAccent}`
            : '1px solid var(--card-border)',
          background: isSkipVisible
            ? `linear-gradient(135deg, ${activeAccent}22, ${activeAccent}44)`
            : '#161924',
          color: isSkipVisible ? '#ffffff' : '#6b7280',
          fontWeight: 700,
          fontSize: '0.95rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          cursor: isSkipVisible ? 'pointer' : 'default',
          opacity: isSkipVisible ? 1 : 0.4,
          transition: 'all 0.25s ease',
          boxShadow: isSkipVisible ? `0 0 18px ${activeAccent}44` : 'none',
        }}
      >
        <span className="skip-intro-content">
          <IconFastForward size={20} color={isSkipVisible ? activeAccent : '#6b7280'} />
          <span>{skipText}</span>
        </span>
        {isSkipVisible && (
          <span
            className="skip-available-badge"
            style={{
              fontSize: '0.65rem',
              padding: '2px 6px',
              borderRadius: 4,
              background: activeAccent,
              color: '#fff',
              fontWeight: 800,
            }}
          >
            DISPONIBLE
          </span>
        )}
      </button>
    </div>
  );
}
