import { useGameState } from './hooks/useGameState';
import SetupView from './components/SetupView';
import GameView from './components/GameView';
import './App.css';

export default function App() {
  const {
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
  } = useGameState();

  if (state.phase === 'setup') {
    return (
      <SetupView
        teamName={state.teamName}
        opponentName={state.opponentName}
        quarterLengthMinutes={state.quarterLengthMinutes}
        players={state.players}
        onSetTeamName={setTeamName}
        onSetOpponentName={setOpponentName}
        onSetQuarterLength={setQuarterLength}
        onAddPlayer={addPlayer}
        onRemovePlayer={removePlayer}
        onToggleStarting={toggleStarting}
        onSetGoalie={setGoalie}
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
      onSetGoalie={setGoalie}
      onEndQuarter={endQuarter}
      onStartNextQuarter={startNextQuarter}
      onReset={resetGame}
    />
  );
}
