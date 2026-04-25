import { useCallback, useEffect, useState } from 'react';
import type { Position, RosterPlayer } from '../types';

const STORAGE_KEY = 'ayso-8u-roster';

function makeId() {
  return Math.random().toString(36).slice(2, 9);
}

function load(): RosterPlayer[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as RosterPlayer[]) : [];
  } catch {
    return [];
  }
}

export function useRoster() {
  const [players, setPlayers] = useState<RosterPlayer[]>(load);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(players));
  }, [players]);

  const addPlayer = useCallback(
    (name: string, number: number, defaultPosition: Position) => {
      setPlayers((prev) => [
        ...prev,
        { id: makeId(), name, number, defaultPosition },
      ]);
    },
    []
  );

  const updatePlayer = useCallback(
    (id: string, updates: Partial<Omit<RosterPlayer, 'id'>>) => {
      setPlayers((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
      );
    },
    []
  );

  const removePlayer = useCallback((id: string) => {
    setPlayers((prev) => prev.filter((p) => p.id !== id));
  }, []);

  return { players, addPlayer, updatePlayer, removePlayer };
}
