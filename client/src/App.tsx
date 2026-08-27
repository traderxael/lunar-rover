/** Dirección visual: el juego es una única vista de misión a pantalla completa. */
import ErrorBoundary from "./components/ErrorBoundary";
import GameCanvas from "./components/GameCanvas";

function App() {
  return (
    <ErrorBoundary>
      <GameCanvas />
    </ErrorBoundary>
  );
}

export default App;
