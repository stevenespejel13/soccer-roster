import { useState } from 'react';
import type { Position, Player } from '../types';

interface Props {
  teamName: string;
  opponentName: string;
  halfLengthMinutes: number;
  players: Player[];
  onSetTeamName: (n: string) => void;
  onSetOpponentName: (n: string) => void;
  onSetHalfLength: (m: number) => void;
  onAddPlayer: (name: string, number: number, position: Position) => void;
  onRemovePlayer: (id: string) => void;
  onToggleStarting: (id: string) => void;
  onStartGame: () => void;
}

const POSITIONS: Position[] = ['GK', 'DEF', 'MID', 'FWD'];

const POSITION_COLORS: Record<Position, string> = {
  GK: '#f59e0b',
  DEF: '#3b82f6',
  MID: '#10b981',
  FWD: '#ef4444',
};

export default function SetupView({
  teamName,
  opponentName,
  halfLengthMinutes,
  players,
  onSetTeamName,
  onSetOpponentName,
  onSetHalfLength,
  onAddPlayer,
  onRemovePlayer,
  onToggleStarting,
  onStartGame,
}: Props) {
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [position, setPosition] = useState<Position>('MID');

  const onField = players.filter((p) => p.status === 'playing').length;

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const num = parseInt(number, 10);
    if (!name.trim() || isNaN(num) || num < 1 || num > 99) return;
    onAddPlayer(name.trim(), num, position);
    setName('');
    setNumber('');
  }

  const canStart =
    teamName.trim() &&
    opponentName.trim() &&
    players.length >= 1 &&
    onField >= 1;

  const byPosition = POSITIONS.map((pos) => ({
    pos,
    players: players.filter((p) => p.position === pos),
  })).filter((g) => g.players.length > 0);

  return (
    <div className="setup-view">
      <header className="app-header">
        <div className="header-title">
          <span className="soccer-icon">⚽</span>
          <h1>Soccer Roster Manager</h1>
        </div>
      </header>

      <div className="setup-grid">
        {/* Game info */}
        <section className="card">
          <h2>Game Info</h2>
          <div className="form-group">
            <label>Your Team Name</label>
            <input
              value={teamName}
              onChange={(e) => onSetTeamName(e.target.value)}
              placeholder="e.g. Lightning FC"
            />
          </div>
          <div className="form-group">
            <label>Opponent Name</label>
            <input
              value={opponentName}
              onChange={(e) => onSetOpponentName(e.target.value)}
              placeholder="e.g. Thunder United"
            />
          </div>
          <div className="form-group">
            <label>Half Length (minutes)</label>
            <select
              value={halfLengthMinutes}
              onChange={(e) => onSetHalfLength(Number(e.target.value))}
            >
              {[15, 20, 25, 30, 35, 40, 45].map((m) => (
                <option key={m} value={m}>
                  {m} min
                </option>
              ))}
            </select>
          </div>
        </section>

        {/* Add player */}
        <section className="card">
          <h2>Add Player</h2>
          <form onSubmit={handleAdd} className="add-player-form">
            <div className="form-group">
              <label>Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Player name"
                required
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>#</label>
                <input
                  type="number"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  placeholder="1–99"
                  min={1}
                  max={99}
                  required
                />
              </div>
              <div className="form-group">
                <label>Position</label>
                <select
                  value={position}
                  onChange={(e) => setPosition(e.target.value as Position)}
                >
                  {POSITIONS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button type="submit" className="btn btn-primary">
              Add Player
            </button>
          </form>
        </section>

        {/* Roster */}
        <section className="card card-wide">
          <div className="roster-header">
            <h2>Roster</h2>
            <span className="lineup-count">
              Starting: <strong>{onField}</strong> / 11
            </span>
          </div>

          {players.length === 0 && (
            <p className="empty-state">No players added yet.</p>
          )}

          {byPosition.map(({ pos, players: grp }) => (
            <div key={pos} className="position-group">
              <div
                className="position-label"
                style={{ borderColor: POSITION_COLORS[pos], color: POSITION_COLORS[pos] }}
              >
                {pos}
              </div>
              <div className="player-list">
                {grp.map((p) => (
                  <div
                    key={p.id}
                    className={`player-row ${p.status === 'playing' ? 'starting' : ''}`}
                  >
                    <span className="jersey">{p.number}</span>
                    <span className="player-name">{p.name}</span>
                    <div className="player-actions">
                      <button
                        className={`btn btn-sm ${p.status === 'playing' ? 'btn-success' : 'btn-outline'}`}
                        onClick={() => onToggleStarting(p.id)}
                        title={p.status === 'playing' ? 'Remove from starting XI' : 'Add to starting XI'}
                      >
                        {p.status === 'playing' ? 'Starting' : 'Bench'}
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => onRemovePlayer(p.id)}
                        title="Remove player"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      </div>

      <div className="start-bar">
        {!canStart && (
          <p className="start-hint">
            {!teamName.trim() || !opponentName.trim()
              ? 'Enter both team names to continue.'
              : players.length === 0
              ? 'Add at least one player and set your starting lineup.'
              : onField === 0
              ? 'Select at least one starting player.'
              : ''}
          </p>
        )}
        <button
          className="btn btn-primary btn-large"
          disabled={!canStart}
          onClick={onStartGame}
        >
          Kick Off!
        </button>
      </div>
    </div>
  );
}
