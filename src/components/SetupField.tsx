import { useRef, useState } from 'react';
import type { Player, Position } from '../types';
import { getPositionFromCoords } from '../utils';

interface Props {
  players: Player[];
  fieldFull: boolean;
  onSetGoalie: (id: string | null) => void;
  onMovePlayer: (id: string, x: number, y: number) => void;
  onAddToField: (id: string, x: number, y: number) => void;
  onRemoveFromField: (id: string) => void;
}

const POS_COLOR: Record<Position, string> = {
  GK: '#f59e0b',
  DEF: '#3b82f6',
  MID: '#10b981',
  FWD: '#ef4444',
};

// Default Y centre for each position zone
const ZONE_Y: Record<Position, number> = { FWD: 14, MID: 38, DEF: 63, GK: 85 };

const DRAG_THRESHOLD = 8;

interface PointerInfo {
  type: 'field' | 'bench';
  id: string;
  startX: number;
  startY: number;
  moved: boolean;
}

interface VisualDrag {
  type: 'field' | 'bench';
  id: string;
  clientX: number;
  clientY: number;
  /** Field-relative % — only meaningful for 'field' drags */
  fieldX: number;
  fieldY: number;
}

export default function SetupField({
  players,
  fieldFull,
  onSetGoalie,
  onMovePlayer,
  onAddToField,
  onRemoveFromField,
}: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);

  // Logical drag state — mutated without triggering renders
  const pointerRef = useRef<PointerInfo | null>(null);

  // Visual drag state — drives ghost and live position updates
  const [vd, setVd] = useState<VisualDrag | null>(null);

  const onField = players.filter((p) => p.status === 'playing');
  const bench = players.filter((p) => p.status === 'bench');

  function toFieldPercent(clientX: number, clientY: number) {
    const rect = fieldRef.current?.getBoundingClientRect();
    if (!rect) return { x: 50, y: 50 };
    return {
      x: Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)),
      y: Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100)),
    };
  }

  function isOverField(clientX: number, clientY: number) {
    const rect = fieldRef.current?.getBoundingClientRect();
    if (!rect) return false;
    return clientX >= rect.left && clientX <= rect.right &&
           clientY >= rect.top  && clientY <= rect.bottom;
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement;
    if (target.closest('.sf-remove-btn')) return;   // let remove btn handle its own click

    const benchEl = target.closest('[data-bench-id]') as HTMLElement | null;
    const fieldEl = target.closest('[data-sf-player]') as HTMLElement | null;

    if (benchEl && !fieldFull) {
      e.preventDefault();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      pointerRef.current = { type: 'bench', id: benchEl.dataset.benchId!, startX: e.clientX, startY: e.clientY, moved: false };
    } else if (fieldEl) {
      e.preventDefault();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      const { x, y } = toFieldPercent(e.clientX, e.clientY);
      pointerRef.current = { type: 'field', id: fieldEl.dataset.sfPlayer!, startX: e.clientX, startY: e.clientY, moved: false };
      // Immediately track visual so field player follows pointer right away
      setVd({ type: 'field', id: fieldEl.dataset.sfPlayer!, clientX: e.clientX, clientY: e.clientY, fieldX: x, fieldY: y });
    }
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const info = pointerRef.current;
    if (!info) return;

    const dx = e.clientX - info.startX;
    const dy = e.clientY - info.startY;

    if (Math.hypot(dx, dy) >= DRAG_THRESHOLD) {
      info.moved = true;
    }

    if (info.type === 'field') {
      const { x, y } = toFieldPercent(e.clientX, e.clientY);
      setVd({ type: 'field', id: info.id, clientX: e.clientX, clientY: e.clientY, fieldX: x, fieldY: y });
    } else if (info.moved) {
      // Only show bench ghost after threshold
      setVd({ type: 'bench', id: info.id, clientX: e.clientX, clientY: e.clientY, fieldX: 0, fieldY: 0 });
    }
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    const info = pointerRef.current;
    if (!info) return;
    pointerRef.current = null;
    setVd(null);

    if (info.type === 'bench') {
      if (!info.moved) {
        // Tap: add at zone centre
        const player = players.find((p) => p.id === info.id);
        if (player) onAddToField(info.id, 50, ZONE_Y[player.position]);
      } else if (isOverField(e.clientX, e.clientY)) {
        // Drop onto field
        const { x, y } = toFieldPercent(e.clientX, e.clientY);
        onAddToField(info.id, x, y);
      }
    } else {
      if (!info.moved) {
        // Tap: toggle GK
        const player = onField.find((p) => p.id === info.id);
        if (player) onSetGoalie(player.isGoalie ? null : info.id);
      } else if (isOverField(e.clientX, e.clientY)) {
        const { x, y } = toFieldPercent(e.clientX, e.clientY);
        onMovePlayer(info.id, x, y);
      } else {
        // Dragged off field → bench
        onRemoveFromField(info.id);
      }
    }
  }

  // Derive live display position for a field player
  function playerDisplayXY(player: Player) {
    if (vd?.type === 'field' && vd.id === player.id) {
      return { x: vd.fieldX, y: vd.fieldY };
    }
    return { x: player.fieldX, y: player.fieldY };
  }

  // Ghost player info
  const ghostPlayer = vd ? players.find((p) => p.id === vd.id) : null;
  const ghostOver = vd?.type === 'bench' ? isOverField(vd.clientX, vd.clientY) : false;
  const ghostPos = ghostPlayer && vd?.type === 'bench' && ghostOver
    ? getPositionFromCoords(
        ...Object.values(toFieldPercent(vd.clientX, vd.clientY)) as [number, number]
      )
    : ghostPlayer?.position;

  const isDraggingField = vd?.type === 'field' && pointerRef.current?.moved;
  const dragLivePos = isDraggingField ? getPositionFromCoords(vd!.fieldX, vd!.fieldY) : null;

  return (
    <div
      ref={wrapperRef}
      className="setup-field-container"
      style={{ touchAction: 'none' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* ── Soccer field ── */}
      <div ref={fieldRef} className="soccer-field">
        {/* Field markings */}
        <div className="field-outline" />
        <div className="field-center-line" />
        <div className="field-center-circle" />
        <div className="field-penalty-top" />
        <div className="field-penalty-bottom" />
        <div className="field-goal-top" />
        <div className="field-goal-bottom" />
        <div className="field-zone-label field-zone-attack">▲ Attack</div>
        <div className="field-zone-label field-zone-defend">▼ Defend</div>

        {/* Zone overlays during any drag */}
        {vd && (
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

        {/* On-field players */}
        {onField.map((player) => {
          const { x, y } = playerDisplayXY(player);
          const isBeingDragged = vd?.type === 'field' && vd.id === player.id;
          const liveColor = isBeingDragged && dragLivePos ? POS_COLOR[dragLivePos] : POS_COLOR[player.position];
          const firstName = player.name.split(' ')[0];

          return (
            <div
              key={player.id}
              data-sf-player={player.id}
              className={`field-player ${player.isGoalie ? 'field-player-gk' : ''} ${isBeingDragged ? 'field-player-dragging' : ''}`}
              style={{
                left: `${x}%`,
                top: `${y}%`,
                transition: isBeingDragged ? 'none' : 'left 0.2s ease, top 0.2s ease',
              }}
            >
              <button
                className="sf-remove-btn"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); onRemoveFromField(player.id); }}
                title="Send to bench"
                aria-label={`Remove ${player.name} from field`}
              >×</button>
              <div className="field-player-circle" style={{ background: liveColor }}>
                <span className="field-player-number">{player.number}</span>
                {player.isGoalie && <span className="field-gk-dot" />}
              </div>
              <div className="field-player-name">
                {firstName}
                {isBeingDragged && dragLivePos && (
                  <span style={{ color: POS_COLOR[dragLivePos] }}> {dragLivePos}</span>
                )}
              </div>
            </div>
          );
        })}

        {onField.length === 0 && (
          <div className="field-empty">Drag players from below onto the field</div>
        )}
      </div>

      {/* ── Bench strip ── */}
      <div className="sf-bench-strip">
        {bench.length === 0 ? (
          <p className="sf-bench-empty">All players are on the field</p>
        ) : (
          bench.map((p) => {
            const isDraggingThis = vd?.type === 'bench' && vd.id === p.id;
            return (
              <div
                key={p.id}
                data-bench-id={p.id}
                className={`sf-bench-chip ${fieldFull ? 'sf-bench-chip-full' : ''} ${isDraggingThis ? 'sf-bench-chip-dragging' : ''}`}
                title={fieldFull ? 'Field is full (7 max)' : 'Tap to add · Drag onto field to place'}
              >
                <span
                  className="sf-bench-circle"
                  style={{ background: POS_COLOR[p.position] }}
                >
                  {p.number}
                </span>
                <span className="sf-bench-name">{p.name.split(' ')[0]}</span>
              </div>
            );
          })
        )}
      </div>

      {/* ── Drag ghost (bench → field) ── */}
      {vd?.type === 'bench' && ghostPlayer && (
        <div
          className="sf-drag-ghost"
          style={{
            left: vd.clientX,
            top: vd.clientY,
            background: POS_COLOR[ghostPos ?? ghostPlayer.position],
          }}
        >
          <span className="field-player-number">{ghostPlayer.number}</span>
          {ghostOver && ghostPos && (
            <span className="sf-ghost-pos">{ghostPos}</span>
          )}
        </div>
      )}

      <p className="field-hint">
        Tap chip to add to field · Drag chip to place · Tap player circle to toggle GK · Drag off field to bench
      </p>
    </div>
  );
}
