import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameState, Player, Substitution } from '../types';

const TOTAL_QUARTERS = 4;
const DEFAULT_QUARTER_MINUTES = 10;
const MAX_FIELD_PLAYERS = 7;

function makeId() {
  return Math.random().toString(36).slice(2, 9);
}

const initialState: GameState = {
  phase: 'setup',
  teamName: '',
  opponentName: '',
  players: [],
  homeScore: 0,
  awayScore: 0,
  quarterSeconds: 0,
  isRunning: false,
  substitutions: [],
  quarterLengthMinutes: DEFAULT_QUARTER_MINUTES,
  currentQuarter: 1,
  totalQuarters: TOTAL_QUARTERS,
};

export function useGameState() {
  const [state, setState] = useState<GameState>(initialState);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (state.isRunning && state.phase === 'game') {
      timerRef.current = setInterval(() => {
        setState((prev) => ({
          ...prev,
          quarterSeconds: prev.quarterSeconds + 1,
          players: prev.players.map((p) =>
            p.status === 'playing'
              ? { ...p, playingSeconds: p.playingSeconds + 1 }
              : p
          ),
        }));
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state.isRunning, state.phase]);

  const setTeamName = useCallback((name: string) => {
    setState((prev) => ({ ...prev, teamName: name }));
  }, []);

  const setOpponentName = useCallback((name: string) => {
    setState((prev) => ({ ...prev, opponentName: name }));
  }, []);

  const setQuarterLength = useCallback((minutes: number) => {
    setState((prev) => ({ ...prev, quarterLengthMinutes: minutes }));
  }, []);

  const addPlayer = useCallback((name: string, number: number) => {
    const player: Player = {
      id: makeId(),
      name,
      number,
      status: 'bench',
      isGoalie: false,
      playingSeconds: 0,
      enteredAt: null,
      quarterHistory: [],
    };
    setState((prev) => ({ ...prev, players: [...prev.players, player] }));
  }, []);

  const removePlayer = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      players: prev.players.filter((p) => p.id !== id),
    }));
  }, []);

  const toggleStarting = useCallback((id: string) => {
    setState((prev) => {
      const onField = prev.players.filter((p) => p.status === 'playing').length;
      return {
        ...prev,
        players: prev.players.map((p) => {
          if (p.id !== id) return p;
          if (p.status === 'playing')
            return { ...p, status: 'bench' as const, isGoalie: false };
          if (onField < MAX_FIELD_PLAYERS)
            return { ...p, status: 'playing' as const };
          return p;
        }),
      };
    });
  }, []);

  // id=null clears all; id=string sets that player as goalie (must be on field)
  const setGoalie = useCallback((id: string | null) => {
    setState((prev) => ({
      ...prev,
      players: prev.players.map((p) => ({
        ...p,
        isGoalie: id !== null && p.id === id && p.status === 'playing',
      })),
    }));
  }, []);

  const startGame = useCallback(() => {
    setState((prev) => ({
      ...prev,
      phase: 'game',
      isRunning: true,
      quarterSeconds: 0,
      currentQuarter: 1,
      homeScore: 0,
      awayScore: 0,
      substitutions: [],
      players: prev.players.map((p) => ({
        ...p,
        playingSeconds: 0,
        quarterHistory: [],
        enteredAt: p.status === 'playing' ? 0 : null,
      })),
    }));
  }, []);

  const toggleTimer = useCallback(() => {
    setState((prev) => ({ ...prev, isRunning: !prev.isRunning }));
  }, []);

  const adjustScore = useCallback((team: 'home' | 'away', delta: number) => {
    setState((prev) => {
      const key = team === 'home' ? 'homeScore' : 'awayScore';
      return { ...prev, [key]: Math.max(0, prev[key] + delta) };
    });
  }, []);

  const makeSubstitution = useCallback(
    (playerOutId: string, playerInId: string) => {
      setState((prev) => {
        const playerOut = prev.players.find((p) => p.id === playerOutId);
        const playerIn = prev.players.find((p) => p.id === playerInId);
        if (!playerOut || !playerIn) return prev;

        const sub: Substitution = {
          quarter: prev.currentQuarter,
          quarterSecond: prev.quarterSeconds,
          playerOutId,
          playerInId,
          playerOutName: playerOut.name,
          playerInName: playerIn.name,
        };

        return {
          ...prev,
          players: prev.players.map((p) => {
            if (p.id === playerOutId)
              return { ...p, status: 'bench' as const, isGoalie: false };
            if (p.id === playerInId)
              return {
                ...p,
                status: 'playing' as const,
                enteredAt: prev.quarterSeconds,
              };
            return p;
          }),
          substitutions: [...prev.substitutions, sub],
        };
      });
    },
    []
  );

  const endQuarter = useCallback(() => {
    setState((prev) => {
      const q = prev.currentQuarter;
      const isFinal = q >= prev.totalQuarters;
      return {
        ...prev,
        isRunning: false,
        phase: isFinal ? 'final' : 'break',
        currentQuarter: isFinal ? q : q + 1,
        quarterSeconds: 0,
        players: prev.players.map((p) => ({
          ...p,
          quarterHistory: [
            ...p.quarterHistory,
            { quarter: q, played: p.status === 'playing', wasGoalie: p.isGoalie },
          ],
        })),
      };
    });
  }, []);

  const startNextQuarter = useCallback(() => {
    setState((prev) => ({
      ...prev,
      phase: 'game',
      isRunning: true,
      quarterSeconds: 0,
    }));
  }, []);

  const resetGame = useCallback(() => {
    setState(initialState);
  }, []);

  return {
    state,
    setTeamName,
    setOpponentName,
    setQuarterLength,
    addPlayer,
    removePlayer,
    toggleStarting,
    setGoalie,
    startGame,
    toggleTimer,
    adjustScore,
    makeSubstitution,
    endQuarter,
    startNextQuarter,
    resetGame,
  };
}
