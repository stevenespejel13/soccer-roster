export type Position = 'GK' | 'DEF' | 'MID' | 'FWD';
export type PlayerStatus = 'playing' | 'bench' | 'subbed-out';

export interface Player {
  id: string;
  name: string;
  number: number;
  position: Position;
  status: PlayerStatus;
  playingSeconds: number;
  enteredAt: number | null; // game clock seconds when they entered
}

export interface Substitution {
  gameSecond: number;
  playerInId: string;
  playerOutId: string;
  playerInName: string;
  playerOutName: string;
}

export interface GameState {
  phase: 'setup' | 'game';
  teamName: string;
  opponentName: string;
  players: Player[];
  homeScore: number;
  awayScore: number;
  gameSeconds: number;
  isRunning: boolean;
  substitutions: Substitution[];
  halfLengthMinutes: number;
}
