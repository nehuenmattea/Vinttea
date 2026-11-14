interface DragonBallSphereProps {
  onTap?: () => void;
}

export function DragonBallSphere({ onTap }: DragonBallSphereProps) {
  return (
    <span
      className="dragon-ball-sphere"
      role="button"
      tabIndex={0}
      aria-label="Esfera del Dragón de 4 estrellas (Toca para activar)"
      title="Esfera del Dragón de 4 estrellas"
      onClick={onTap}
      style={{ cursor: onTap ? 'pointer' : 'default' }}
    >
      <svg className="dragon-ball-stars" viewBox="0 0 48 48" aria-hidden="true">
        <defs>
          <path id="dragon-ball-star" d="m0-4.8 1.4 3.1 3.4.4-2.5 2.2.7 3.3L0 2.5l-3 1.7.7-3.3-2.5-2.2 3.4-.4Z" />
        </defs>
        <g fill="#a51c1c" stroke="#781313" strokeWidth=".7" strokeLinejoin="round">
          <use href="#dragon-ball-star" transform="translate(24 14)" />
          <use href="#dragon-ball-star" transform="translate(14 24)" />
          <use href="#dragon-ball-star" transform="translate(34 24)" />
          <use href="#dragon-ball-star" transform="translate(24 34)" />
        </g>
      </svg>
      <span className="dragon-ball-gloss" aria-hidden="true" />
    </span>
  );
}
