import { useGameState } from './hooks/useGameState';
import SetupView from './components/SetupView';
import GameView from './components/GameView';
import './App.css';

export default function App() {
  const {
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
  } = useGameState();

  if (state.phase === 'setup') {
    return (
      <SetupView
        teamName={state.teamName}
        opponentName={state.opponentName}
        halfLengthMinutes={state.halfLengthMinutes}
        players={state.players}
        onSetTeamName={setTeamName}
        onSetOpponentName={setOpponentName}
        onSetHalfLength={setHalfLength}
        onAddPlayer={addPlayer}
        onRemovePlayer={removePlayer}
        onToggleStarting={toggleStarting}
        onStartGame={startGame}
      />
    );
  }

  return (
    <GameView
      state={state}
      onToggleTimer={toggleTimer}
      onAdjustScore={adjustScore}
      onMakeSubstitution={makeSubstitution}
      onReset={resetGame}
    />
  );
}
