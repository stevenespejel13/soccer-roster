import { useState } from 'react';
import type { Position, RosterPlayer } from '../types';

interface Props {
  players: RosterPlayer[];
  onAdd: (name: string, number: number, position: Position) => void;
  onUpdate: (id: string, updates: Partial<Omit<RosterPlayer, 'id'>>) => void;
  onRemove: (id: string) => void;
  onSetupGame: () => void;
}

const POSITIONS: Position[] = ['GK', 'DEF', 'MID', 'FWD'];

const POS_COLOR: Record<Position, string> = {
  GK: '#f59e0b',
  DEF: '#3b82f6',
  MID: '#10b981',
  FWD: '#ef4444',
};

export default function RosterManager({
  players,
  onAdd,
  onUpdate,
  onRemove,
  onSetupGame,
}: Props) {
  const [addName, setAddName] = useState('');
  const [addNumber, setAddNumber] = useState('');
  const [addPos, setAddPos] = useState<Position>('MID');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editNumber, setEditNumber] = useState('');
  const [editPos, setEditPos] = useState<Position>('MID');
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const num = parseInt(addNumber, 10);
    if (!addName.trim() || isNaN(num) || num < 1 || num > 99) return;
    onAdd(addName.trim(), num, addPos);
    setAddName('');
    setAddNumber('');
  }

  function startEdit(p: RosterPlayer) {
    setEditingId(p.id);
    setEditName(p.name);
    setEditNumber(String(p.number));
    setEditPos(p.defaultPosition);
    setConfirmRemoveId(null);
  }

  function saveEdit(id: string) {
    const num = parseInt(editNumber, 10);
    if (!editName.trim() || isNaN(num) || num < 1 || num > 99) return;
    onUpdate(id, { name: editName.trim(), number: num, defaultPosition: editPos });
    setEditingId(null);
  }

  const byPos = POSITIONS.map((pos) => ({
    pos,
    group: players.filter((p) => p.defaultPosition === pos),
  })).filter((g) => g.group.length > 0);

  return (
    <div className="roster-manager">
      <header className="app-header">
        <div className="header-title">
          <span className="soccer-icon">⚽</span>
          <h1>8U AYSO — Team Roster</h1>
        </div>
        <span className="header-meta">7 v 7 · 4 quarters</span>
      </header>

      <div className="rm-layout">
        {/* Add player */}
        <section className="card">
          <h2>Add Player</h2>
          <form onSubmit={handleAdd} className="add-player-form">
            <div className="form-group">
              <label>Name</label>
              <input
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="Player name"
                required
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Jersey #</label>
                <input
                  type="number"
                  value={addNumber}
                  onChange={(e) => setAddNumber(e.target.value)}
                  placeholder="1–99"
                  min={1}
                  max={99}
                  required
                />
              </div>
              <div className="form-group">
                <label>Position</label>
                <select
                  value={addPos}
                  onChange={(e) => setAddPos(e.target.value as Position)}
                >
                  {POSITIONS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>
            <button type="submit" className="btn btn-primary">
              Add to Roster
            </button>
          </form>
        </section>

        {/* Roster list */}
        <section className="card card-wide">
          <div className="roster-header">
            <h2>Roster ({players.length} players)</h2>
            <button
              className="btn btn-success"
              disabled={players.length === 0}
              onClick={onSetupGame}
            >
              Set Up Game →
            </button>
          </div>

          {players.length === 0 && (
            <p className="empty-state">
              No players yet — add some above to build your roster.
            </p>
          )}

          {byPos.map(({ pos, group }) => (
            <div key={pos} className="rm-position-group">
              <div
                className="rm-position-label"
                style={{ color: POS_COLOR[pos], borderColor: POS_COLOR[pos] }}
              >
                {pos}
              </div>
              <div className="player-list">
                {group.map((p) =>
                  editingId === p.id ? (
                    // ── Edit row ──
                    <div key={p.id} className="player-row editing">
                      <input
                        className="edit-input edit-name"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Name"
                      />
                      <input
                        className="edit-input edit-number"
                        type="number"
                        value={editNumber}
                        onChange={(e) => setEditNumber(e.target.value)}
                        min={1}
                        max={99}
                      />
                      <select
                        className="edit-select"
                        value={editPos}
                        onChange={(e) => setEditPos(e.target.value as Position)}
                      >
                        {POSITIONS.map((pos2) => (
                          <option key={pos2} value={pos2}>{pos2}</option>
                        ))}
                      </select>
                      <div className="player-actions">
                        <button
                          className="btn btn-sm btn-success"
                          onClick={() => saveEdit(p.id)}
                        >
                          Save
                        </button>
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => setEditingId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : confirmRemoveId === p.id ? (
                    // ── Confirm remove row ──
                    <div key={p.id} className="player-row confirm-remove">
                      <span className="player-name">Remove {p.name}?</span>
                      <div className="player-actions">
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => {
                            onRemove(p.id);
                            setConfirmRemoveId(null);
                          }}
                        >
                          Remove
                        </button>
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => setConfirmRemoveId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    // ── Normal row ──
                    <div key={p.id} className="player-row">
                      <span className="jersey">#{p.number}</span>
                      <span className="player-name">{p.name}</span>
                      <span
                        className="pos-tag"
                        style={{ background: POS_COLOR[p.defaultPosition] }}
                      >
                        {p.defaultPosition}
                      </span>
                      <div className="player-actions">
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => startEdit(p)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => setConfirmRemoveId(p.id)}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
