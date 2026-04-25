import { useState } from 'react';
import { useRoster } from './hooks/useRoster';
import { useGameState } from './hooks/useGameState';
import RosterManager from './components/RosterManager';
import SetupView from './components/SetupView';
import GameView from './components/GameView';
import './App.css';

type AppView = 'roster' | 'game';

export default function App() {
  const [appView, setAppView] = useState<AppView>('roster');

  const roster = useRoster();
  const game = useGameState();

  function handleSetupGame() {
    game.initializeFromRoster(roster.players);
    setAppView('game');
  }

  function handleBackToRoster() {
    game.resetGame();
    setAppView('roster');
  }

  // ── Roster management screen ──
  if (appView === 'roster') {
    return (
      <RosterManager
        players={roster.players}
        onAdd={roster.addPlayer}
        onUpdate={roster.updatePlayer}
        onRemove={roster.removePlayer}
        onSetupGame={handleSetupGame}
      />
    );
  }

  // ── Game setup screen ──
  if (game.state.phase === 'setup') {
    return (
      <SetupView
        teamName={game.state.teamName}
        opponentName={game.state.opponentName}
        quarterLengthMinutes={game.state.quarterLengthMinutes}
        players={game.state.players}
        onSetTeamName={game.setTeamName}
        onSetOpponentName={game.setOpponentName}
        onSetQuarterLength={game.setQuarterLength}
        onToggleStarting={game.toggleStarting}
        onSetGoalie={game.setGoalie}
        onSetPosition={game.setPosition}
        onStartGame={game.startGame}
        onBackToRoster={handleBackToRoster}
      />
    );
  }

  // ── Live game screen (game / break / final) ──
  return (
    <GameView
      state={game.state}
      onToggleTimer={game.toggleTimer}
      onAdjustScore={game.adjustScore}
      onMakeSubstitution={game.makeSubstitution}
      onSetGoalie={game.setGoalie}
      onMovePlayer={game.movePlayer}
      onEndQuarter={game.endQuarter}
      onStartNextQuarter={game.startNextQuarter}
      onReset={handleBackToRoster}
    />
  );
}
