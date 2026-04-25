import type { Player, Position } from '../types';

interface Props {
  players: Player[];
  onSetGoalie: (id: string | null) => void;
  onSetPosition: (id: string, pos: Position) => void;
}

const POSITIONS: Position[] = ['GK', 'DEF', 'MID', 'FWD'];

// Y% from top of field (our team attacks upward → GK is at bottom)
const ZONE_Y: Record<Position, number> = {
  FWD: 14,
  MID: 38,
  DEF: 63,
  GK: 85,
};

const POS_COLOR: Record<Position, string> = {
  GK: '#f59e0b',
  DEF: '#3b82f6',
  MID: '#10b981',
  FWD: '#ef4444',
};

// Distribute N players evenly across the field width
function spreadX(count: number): number[] {
  if (count === 0) return [];
  if (count === 1) return [50];
  const margin = 12;
  const step = (100 - 2 * margin) / (count - 1);
  return Array.from({ length: count }, (_, i) => margin + i * step);
}

interface FieldPlayerProps {
  player: Player;
  x: number;
  y: number;
  onSetGoalie: (id: string | null) => void;
  onSetPosition: (id: string, pos: Position) => void;
}

function FieldPlayer({ player, x, y, onSetGoalie, onSetPosition }: FieldPlayerProps) {
  const firstName = player.name.split(' ')[0];

  function handleClick() {
    onSetGoalie(player.isGoalie ? null : player.id);
  }

  return (
    <div
      className={`field-player ${player.isGoalie ? 'field-player-gk' : ''}`}
      style={{ left: `${x}%`, top: `${y}%` }}
      title={`#${player.number} ${player.name} · ${player.position}${player.isGoalie ? ' (GK)' : ''} · tap to toggle GK`}
    >
      <button
        className="field-player-circle"
        style={{ background: POS_COLOR[player.position] }}
        onClick={handleClick}
        aria-label={`${player.name} – tap to toggle goalkeeper`}
      >
        <span className="field-player-number">{player.number}</span>
        {player.isGoalie && <span className="field-gk-dot" />}
      </button>
      <div className="field-player-name">{firstName}</div>
      {/* Mini position selector */}
      <div className="field-pos-selector">
        {POSITIONS.map((pos) => (
          <button
            key={pos}
            className={`field-pos-btn ${player.position === pos ? 'active' : ''}`}
            style={player.position === pos ? { background: POS_COLOR[pos] } : {}}
            onClick={(e) => {
              e.stopPropagation();
              onSetPosition(player.id, pos);
            }}
          >
            {pos}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function SoccerField({ players, onSetGoalie, onSetPosition }: Props) {
  const onField = players.filter((p) => p.status === 'playing');

  const groups = POSITIONS.reduce(
    (acc, pos) => {
      acc[pos] = onField.filter((p) => p.position === pos);
      return acc;
    },
    {} as Record<Position, Player[]>
  );

  const positioned = POSITIONS.flatMap((pos) => {
    const group = groups[pos];
    const xs = spreadX(group.length);
    return group.map((player, i) => ({ player, x: xs[i], y: ZONE_Y[pos] }));
  });

  return (
    <div className="field-wrapper">
      <div className="soccer-field">
        {/* ── Field markings ── */}
        <div className="field-outline" />
        <div className="field-center-line" />
        <div className="field-center-circle" />
        <div className="field-penalty-top" />
        <div className="field-penalty-bottom" />
        <div className="field-goal-top" />
        <div className="field-goal-bottom" />

        {/* ── Zone labels ── */}
        <div className="field-zone-label field-zone-attack">▲ Attack</div>
        <div className="field-zone-label field-zone-defend">▼ Defend</div>

        {/* ── Players ── */}
        {positioned.map(({ player, x, y }) => (
          <FieldPlayer
            key={player.id}
            player={player}
            x={x}
            y={y}
            onSetGoalie={onSetGoalie}
            onSetPosition={onSetPosition}
          />
        ))}

        {onField.length === 0 && (
          <div className="field-empty">No players on field</div>
        )}
      </div>
    </div>
  );
}
