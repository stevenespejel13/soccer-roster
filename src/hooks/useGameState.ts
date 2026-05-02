import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameState, Position, RosterPlayer, Substitution } from '../types';
import { getPositionFromCoords, layoutGroup } from '../utils';

const TOTAL_QUARTERS = 4;
const DEFAULT_QUARTER_MINUTES = 10;
const MAX_FIELD_PLAYERS = 7;

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

  // Load roster players into setup phase (preserves game config)
  const initializeFromRoster = useCallback((rosterPlayers: RosterPlayer[]) => {
    setState((prev) => ({
      ...prev,
      phase: 'setup',
      isRunning: false,
      quarterSeconds: 0,
      currentQuarter: 1,
      homeScore: 0,
      awayScore: 0,
      substitutions: [],
      players: rosterPlayers.map((rp) => ({
        id: rp.id,
        name: rp.name,
        number: rp.number,
        position: rp.defaultPosition,
        status: 'bench' as const,
        isGoalie: false,
        playingSeconds: 0,
        enteredAt: null,
        quarterHistory: [],
        fieldX: 50,
        fieldY: 50,
      })),
    }));
  }, []);

  const setTeamName = useCallback((name: string) => {
    setState((prev) => ({ ...prev, teamName: name }));
  }, []);

  const setOpponentName = useCallback((name: string) => {
    setState((prev) => ({ ...prev, opponentName: name }));
  }, []);

  const setQuarterLength = useCallback((minutes: number) => {
    setState((prev) => ({ ...prev, quarterLengthMinutes: minutes }));
  }, []);

  const addToField = useCallback((id: string, x: number, y: number) => {
    setState((prev) => {
      const onFieldCount = prev.players.filter((p) => p.status === 'playing').length;
      if (onFieldCount >= MAX_FIELD_PLAYERS) return prev;
      const position = getPositionFromCoords(x, y);
      return {
        ...prev,
        players: prev.players.map((p) =>
          p.id === id
            ? { ...p, status: 'playing' as const, fieldX: x, fieldY: y, position, isGoalie: position === 'GK' }
            : p
        ),
      };
    });
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

  // id=null clears all; id=string sets that (on-field) player as goalie
  const setGoalie = useCallback((id: string | null) => {
    setState((prev) => ({
      ...prev,
      players: prev.players.map((p) => ({
        ...p,
        isGoalie: id !== null && p.id === id && p.status === 'playing',
      })),
    }));
  }, []);

  const setPosition = useCallback((id: string, position: Position) => {
    setState((prev) => ({
      ...prev,
      players: prev.players.map((p) =>
        p.id === id ? { ...p, position } : p
      ),
    }));
  }, []);

  const startGame = useCallback(() => {
    setState((prev) => {
      const onField = prev.players.filter((p) => p.status === 'playing');
      const coords = layoutGroup(onField.map((p) => ({ id: p.id, position: p.position })));
      return {
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
          fieldX: coords[p.id]?.x ?? p.fieldX,
          fieldY: coords[p.id]?.y ?? p.fieldY,
        })),
      };
    });
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
                position: playerOut.position,
                fieldX: playerOut.fieldX,
                fieldY: playerOut.fieldY,
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

  const movePlayer = useCallback((id: string, x: number, y: number) => {
    const position = getPositionFromCoords(x, y);
    setState((prev) => ({
      ...prev,
      players: prev.players.map((p) =>
        p.id === id
          ? {
              ...p,
              fieldX: x,
              fieldY: y,
              position,
              isGoalie: position === 'GK',
            }
          : p
      ),
    }));
  }, []);

  const resetGame = useCallback(() => {
    setState(initialState);
  }, []);

  return {
    state,
    initializeFromRoster,
    setTeamName,
    setOpponentName,
    setQuarterLength,
    toggleStarting,
    setGoalie,
    setPosition,
    startGame,
    toggleTimer,
    adjustScore,
    makeSubstitution,
    endQuarter,
    startNextQuarter,
    addToField,
    movePlayer,
    resetGame,
  };
}
