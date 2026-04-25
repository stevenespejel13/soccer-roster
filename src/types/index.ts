export type Position = 'GK' | 'DEF' | 'MID' | 'FWD';
export type PlayerStatus = 'playing' | 'bench';

// Persistent roster entry (saved to localStorage)
export interface RosterPlayer {
  id: string;
  name: string;
  number: number;
  defaultPosition: Position;
}

// Per-quarter record of what each player did
export interface QuarterRecord {
  quarter: number;
  played: boolean;
  wasGoalie: boolean;
}

// In-game player (created from RosterPlayer at game start)
export interface Player {
  id: string;
  name: string;
  number: number;
  position: Position;       // current game position (may differ from defaultPosition)
  status: PlayerStatus;
  isGoalie: boolean;
  playingSeconds: number;
  enteredAt: number | null;
  quarterHistory: QuarterRecord[];
}

export interface Substitution {
  quarter: number;
  quarterSecond: number;
  playerInId: string;
  playerOutId: string;
  playerInName: string;
  playerOutName: string;
}

export interface GameState {
  phase: 'setup' | 'game' | 'break' | 'final';
  teamName: string;
  opponentName: string;
  players: Player[];
  homeScore: number;
  awayScore: number;
  quarterSeconds: number;
  isRunning: boolean;
  substitutions: Substitution[];
  quarterLengthMinutes: number;
  currentQuarter: number;
  totalQuarters: number;
}
