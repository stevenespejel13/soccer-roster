export type PlayerStatus = 'playing' | 'bench';

export interface QuarterRecord {
  quarter: number;
  played: boolean;
  wasGoalie: boolean;
}

export interface Player {
  id: string;
  name: string;
  number: number;
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
