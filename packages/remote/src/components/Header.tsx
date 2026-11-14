import type { BatteryState } from '@vinttea/shared';
import type { ServiceConfig, AnimeTheme } from '../types/theme';

interface HeaderProps {
  currentService: ServiceConfig;
  animeTheme: AnimeTheme | null;
  activeAccent: string;
  serverConnected: boolean;
  extensionConnected: boolean;
  battery?: BatteryState;
}

export function Header({
  currentService,
  animeTheme,
  activeAccent,
  serverConnected,
  extensionConnected,
  battery,
}: HeaderProps) {
  // Battery color & icon logic
  const renderBatteryPill = () => {
    if (!battery || !battery.hasBattery) return null;

    const percent = Math.max(0, Math.min(100, battery.percent));
    const isCharging = battery.charging;
    const isLow = percent <= 20;

    const batteryColor = isCharging
      ? '#38bdf8'
      : isLow
      ? '#ef4444'
      : percent <= 40
      ? '#f59e0b'
      : '#10b981';

    return (
      <div
        className="battery-pill"
        title={isCharging ? `Batería de PC: ${percent}% (Cargando)` : `Batería de PC: ${percent}%`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: '4px 10px',
          borderRadius: 9999,
          fontSize: '0.72rem',
          fontWeight: 700,
          background: 'var(--card)',
          border: `1px solid ${batteryColor}44`,
          color: batteryColor,
          boxShadow: isCharging ? `0 0 10px ${batteryColor}33` : 'none',
        }}
      >
        <span style={{ fontSize: '0.85rem' }}>{isCharging ? '⚡' : '🔋'}</span>
        <span>{percent}%</span>
      </div>
    );
  };

  return (
    <header
      className="remote-header"
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '4px 2px',
        gap: 8,
      }}
    >
      <div className="remote-brand" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="remote-logo" style={{ fontSize: '1.45rem', fontWeight: 900, letterSpacing: '-0.5px' }}>
          Vint<span style={{ color: activeAccent }}>tea</span>
        </span>
        <span
          className="service-badge"
          style={{
            padding: '3px 8px',
            borderRadius: 6,
            fontSize: '0.68rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            background: currentService.badgeBg,
            color: currentService.badgeColor,
            border: `1px solid ${currentService.badgeColor}33`,
          }}
        >
          {currentService.name}
        </span>
        {animeTheme && (
          <span
            className="anime-badge"
            style={{
              padding: '3px 8px',
              borderRadius: 6,
              fontSize: '0.68rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              background: `${animeTheme.accent}22`,
              color: animeTheme.accent,
              border: `1px solid ${animeTheme.accent}55`,
            }}
          >
            {animeTheme.badge}
          </span>
        )}
      </div>

      <div className="remote-header-actions" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {renderBatteryPill()}

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 12px',
            borderRadius: 9999,
            fontSize: '0.75rem',
            fontWeight: 600,
            background: 'var(--card)',
            border: '1px solid var(--card-border)',
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background:
                serverConnected && extensionConnected
                  ? 'var(--success)'
                  : serverConnected
                  ? 'var(--warning)'
                  : '#ef4444',
            }}
          />
          <span>
            {serverConnected && extensionConnected
              ? 'PC Conectada'
              : serverConnected
              ? 'Extensión Offline'
              : 'Desconectado'}
          </span>
        </div>
      </div>
    </header>
  );
}
