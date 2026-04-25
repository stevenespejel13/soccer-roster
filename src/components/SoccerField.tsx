import { useCallback, useRef, useState } from 'react';
import type { Player, Position } from '../types';
import { getPositionFromCoords } from '../utils';

interface Props {
  players: Player[];
  onSetGoalie: (id: string | null) => void;
  onMovePlayer: (id: string, x: number, y: number) => void;
  readonly?: boolean;
}

const POS_COLOR: Record<Position, string> = {
  GK: '#f59e0b',
  DEF: '#3b82f6',
  MID: '#10b981',
  FWD: '#ef4444',
};

const DRAG_THRESHOLD = 8; // px — below this is a tap

export default function SoccerField({ players, onSetGoalie, onMovePlayer, readonly }: Props) {
  const fieldRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<{ id: string; x: number; y: number } | null>(null);

  // Track pointer-down position to distinguish tap vs drag
  const downPos = useRef<{ px: number; py: number; id: string } | null>(null);
  const hasDragged = useRef(false);

  const toFieldPercent = useCallback((clientX: number, clientY: number) => {
    const rect = fieldRef.current?.getBoundingClientRect();
    if (!rect) return { x: 50, y: 50 };
    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
    return { x, y };
  }, []);

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (readonly) return;
    const target = e.target as HTMLElement;
    const playerEl = target.closest('[data-player-id]') as HTMLElement | null;
    if (!playerEl) return;
    const id = playerEl.dataset.playerId!;
    e.preventDefault();
    fieldRef.current?.setPointerCapture(e.pointerId);
    downPos.current = { px: e.clientX, py: e.clientY, id };
    hasDragged.current = false;
    const { x, y } = toFieldPercent(e.clientX, e.clientY);
    setDragging({ id, x, y });
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!downPos.current || !dragging) return;
    const dx = e.clientX - downPos.current.px;
    const dy = e.clientY - downPos.current.py;
    if (!hasDragged.current && Math.hypot(dx, dy) >= DRAG_THRESHOLD) {
      hasDragged.current = true;
    }
    if (hasDragged.current) {
      const { x, y } = toFieldPercent(e.clientX, e.clientY);
      setDragging({ id: downPos.current.id, x, y });
    }
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!downPos.current) return;
    const { id } = downPos.current;

    if (!hasDragged.current) {
      // It was a tap — toggle GK
      const player = players.find((p) => p.id === id);
      if (player) onSetGoalie(player.isGoalie ? null : id);
    } else {
      // Drag ended — commit position
      const { x, y } = toFieldPercent(e.clientX, e.clientY);
      onMovePlayer(id, x, y);
    }

    downPos.current = null;
    hasDragged.current = false;
    setDragging(null);
  }

  const onField = players.filter((p) => p.status === 'playing');

  // While dragging, show preview position label
  const dragPos = dragging
    ? getPositionFromCoords(dragging.x, dragging.y)
    : null;
  const dragPlayer = dragging ? players.find((p) => p.id === dragging.id) : null;

  return (
    <div className="field-wrapper">
      <div
        ref={fieldRef}
        className="soccer-field"
        style={{ touchAction: 'none' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
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

        {/* ── Zone overlays (visible during drag) ── */}
        {dragging && (
          <>
            <div className="field-zone-overlay" style={{ top: 0, height: '25%', background: `${POS_COLOR.FWD}22`, borderBottom: `1px dashed ${POS_COLOR.FWD}88` }}>
              <span style={{ color: POS_COLOR.FWD }}>FWD</span>
            </div>
            <div className="field-zone-overlay" style={{ top: '25%', height: '25%', background: `${POS_COLOR.MID}22`, borderBottom: `1px dashed ${POS_COLOR.MID}88` }}>
              <span style={{ color: POS_COLOR.MID }}>MID</span>
            </div>
            <div className="field-zone-overlay" style={{ top: '50%', height: '25%', background: `${POS_COLOR.DEF}22`, borderBottom: `1px dashed ${POS_COLOR.DEF}88` }}>
              <span style={{ color: POS_COLOR.DEF }}>DEF</span>
            </div>
            <div className="field-zone-overlay" style={{ top: '75%', height: '25%', background: `${POS_COLOR.DEF}22` }}>
              <span style={{ color: POS_COLOR.DEF }}>DEF / <span style={{ color: POS_COLOR.GK }}>GK (center)</span></span>
            </div>
          </>
        )}

        {/* ── Players ── */}
        {onField.map((player) => {
          const isDraggingThis = dragging?.id === player.id;
          const x = isDraggingThis ? dragging!.x : player.fieldX;
          const y = isDraggingThis ? dragging!.y : player.fieldY;
          const livePosColor = isDraggingThis && dragPos ? POS_COLOR[dragPos] : POS_COLOR[player.position];
          const firstName = player.name.split(' ')[0];

          return (
            <div
              key={player.id}
              data-player-id={player.id}
              className={`field-player ${player.isGoalie ? 'field-player-gk' : ''} ${isDraggingThis ? 'field-player-dragging' : ''}`}
              style={{
                left: `${x}%`,
                top: `${y}%`,
                transition: isDraggingThis ? 'none' : 'left 0.25s ease, top 0.25s ease',
              }}
            >
              <div
                className="field-player-circle"
                style={{ background: livePosColor }}
              >
                <span className="field-player-number">{player.number}</span>
                {player.isGoalie && <span className="field-gk-dot" />}
              </div>
              <div className="field-player-name">
                {firstName}
                {isDraggingThis && dragPos && (
                  <span className="field-drag-pos" style={{ color: POS_COLOR[dragPos] }}> {dragPos}</span>
                )}
              </div>
            </div>
          );
        })}

        {onField.length === 0 && (
          <div className="field-empty">No players on field</div>
        )}

        {/* ── Drag helper tooltip ── */}
        {dragging && dragPos && dragPlayer && (
          <div
            className="field-drag-tooltip"
            style={{
              left: `${dragging.x}%`,
              top: `${Math.max(dragging.y - 12, 2)}%`,
              background: POS_COLOR[dragPos],
            }}
          >
            {dragPos}
          </div>
        )}
      </div>

      {!readonly && (
        <p className="field-hint">Tap circle to toggle GK · Drag to reposition</p>
      )}
    </div>
  );
}
