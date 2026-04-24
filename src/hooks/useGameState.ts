import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameState, Player, Position, Substitution } from '../types';

const DEFAULT_HALF = 25;

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
  gameSeconds: 0,
  isRunning: false,
  substitutions: [],
  halfLengthMinutes: DEFAULT_HALF,
};

export function useGameState() {
  const [state, setState] = useState<GameState>(initialState);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Tick every second
  useEffect(() => {
    if (state.isRunning) {
      timerRef.current = setInterval(() => {
        setState((prev) => {
          const newSeconds = prev.gameSeconds + 1;
          // Accumulate playing time for on-field players
          const updatedPlayers = prev.players.map((p) =>
            p.status === 'playing'
              ? { ...p, playingSeconds: p.playingSeconds + 1 }
              : p
          );
          return { ...prev, gameSeconds: newSeconds, players: updatedPlayers };
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state.isRunning]);

  const setTeamName = useCallback((name: string) => {
    setState((prev) => ({ ...prev, teamName: name }));
  }, []);

  const setOpponentName = useCallback((name: string) => {
    setState((prev) => ({ ...prev, opponentName: name }));
  }, []);

  const setHalfLength = useCallback((minutes: number) => {
    setState((prev) => ({ ...prev, halfLengthMinutes: minutes }));
  }, []);

  const addPlayer = useCallback(
    (name: string, number: number, position: Position) => {
      const player: Player = {
        id: makeId(),
        name,
        number,
        position,
        status: 'bench',
        playingSeconds: 0,
        enteredAt: null,
      };
      setState((prev) => ({ ...prev, players: [...prev.players, player] }));
    },
    []
  );

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
          if (p.status === 'playing') return { ...p, status: 'bench' };
          if (onField < 11) return { ...p, status: 'playing' };
          return p; // already 11 on field
        }),
      };
    });
  }, []);

  const startGame = useCallback(() => {
    setState((prev) => ({
      ...prev,
      phase: 'game',
      isRunning: true,
      gameSeconds: 0,
      homeScore: 0,
      awayScore: 0,
      substitutions: [],
      // Mark entry time for starting players
      players: prev.players.map((p) =>
        p.status === 'playing' ? { ...p, enteredAt: 0 } : p
      ),
    }));
  }, []);

  const toggleTimer = useCallback(() => {
    setState((prev) => ({ ...prev, isRunning: !prev.isRunning }));
  }, []);

  const adjustScore = useCallback(
    (team: 'home' | 'away', delta: number) => {
      setState((prev) => {
        const key = team === 'home' ? 'homeScore' : 'awayScore';
        return { ...prev, [key]: Math.max(0, prev[key] + delta) };
      });
    },
    []
  );

  const makeSubstitution = useCallback(
    (playerOutId: string, playerInId: string) => {
      setState((prev) => {
        const playerOut = prev.players.find((p) => p.id === playerOutId);
        const playerIn = prev.players.find((p) => p.id === playerInId);
        if (!playerOut || !playerIn) return prev;

        const sub: Substitution = {
          gameSecond: prev.gameSeconds,
          playerOutId,
          playerInId,
          playerOutName: playerOut.name,
          playerInName: playerIn.name,
        };

        const updatedPlayers = prev.players.map((p) => {
          if (p.id === playerOutId)
            return { ...p, status: 'subbed-out' as const, enteredAt: null };
          if (p.id === playerInId)
            return {
              ...p,
              status: 'playing' as const,
              enteredAt: prev.gameSeconds,
            };
          return p;
        });

        return {
          ...prev,
          players: updatedPlayers,
          substitutions: [...prev.substitutions, sub],
        };
      });
    },
    []
  );

  const resetGame = useCallback(() => {
    setState(initialState);
  }, []);

  return {
    state,
    setTeamName,
    setOpponentName,
    setHalfLength,
    addPlayer,
    removePlayer,
    toggleStarting,
    startGame,
    toggleTimer,
    adjustScore,
    makeSubstitution,
    resetGame,
  };
}
