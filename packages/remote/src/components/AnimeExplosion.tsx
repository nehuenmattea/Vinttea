export function AnimeExplosion() {
  return (
    <div className="anime-explosion-overlay" aria-hidden="true">
      <div className="anime-explosion-core">
        {/* Expanding shockwave rings */}
        <div className="shockwave-ring ring-1" />
        <div className="shockwave-ring ring-2" />
        <div className="shockwave-ring ring-3" />

        {/* Energy flash burst center */}
        <div className="energy-center-flash" />

        {/* Radiating energy spikes */}
        <div className="energy-spike-container">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="energy-spike"
              style={{ transform: `rotate(${i * 45}deg) translateY(-20px)` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
