import { IconPower } from '../icons';

interface ShutdownBannerProps {
  secondsLeft?: number;
  onCancel: () => void;
}

export function ShutdownBanner({ secondsLeft, onCancel }: ShutdownBannerProps) {
  if (!secondsLeft || secondsLeft <= 0) return null;

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #dc2626, #991b1b)',
        color: '#ffffff',
        padding: '12px 16px',
        borderRadius: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 4px 20px rgba(220, 38, 38, 0.5)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: '0.9rem' }}>
        <span style={{ fontSize: '1.2rem' }}>⏳</span>
        <span>Apagando PC en {secondsLeft}s...</span>
      </div>
      <button
        onClick={onCancel}
        style={{
          background: '#ffffff',
          color: '#991b1b',
          border: 'none',
          padding: '6px 14px',
          borderRadius: 8,
          fontWeight: 800,
          fontSize: '0.8rem',
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}
      >
        Cancelar
      </button>
    </div>
  );
}

interface ShutdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (seconds: number) => void;
}

export function ShutdownModal({ isOpen, onClose, onConfirm }: ShutdownModalProps) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(6px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        style={{
          background: '#161924',
          border: '1px solid #2e354a',
          borderRadius: 22,
          padding: 24,
          maxWidth: 360,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          boxShadow: '0 10px 40px rgba(0,0,0,0.8)',
          textAlign: 'center',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <IconPower size={32} color="#ef4444" />
          </div>
        </div>
        <div>
          <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#fff' }}>¿Apagar la computadora?</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.4 }}>
            Puedes iniciar una cuenta regresiva de 30 segundos (con opción a cancelar desde aquí) o apagarla de inmediato.
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={() => {
              onConfirm(30);
              onClose();
            }}
            style={{
              background: '#ef4444',
              color: '#fff',
              border: 'none',
              padding: '14px',
              borderRadius: 12,
              fontWeight: 800,
              fontSize: '0.95rem',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)',
            }}
          >
            ⏱️ Apagar en 30s (Recomendado)
          </button>

          <button
            onClick={() => {
              onConfirm(0);
              onClose();
            }}
            style={{
              background: '#1e2436',
              color: '#f87171',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              padding: '12px',
              borderRadius: 12,
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
            }}
          >
            ⚡ Apagar de inmediato
          </button>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              color: 'var(--text-muted)',
              border: '1px solid var(--card-border)',
              padding: '10px',
              borderRadius: 12,
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            Volver
          </button>
        </div>
      </div>
    </div>
  );
}
