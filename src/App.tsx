import { useCallback, useState } from "react";
import { GameScreen } from "./components/GameScreen";
import { Menu } from "./components/Menu";
import { Rules } from "./components/Rules";
import type { Mode } from "./game/types";

type Screen = { name: "menu" } | { name: "game"; mode: Mode; index: number };

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: "menu" });
  const [rules, setRules] = useState(false);

  const start = useCallback((mode: Mode) => {
    setScreen({ name: "game", mode, index: 0 });
  }, []);

  const openPuzzle = useCallback((index: number) => {
    setScreen({ name: "game", mode: "puzzle", index });
  }, []);

  if (screen.name === "menu") {
    return (
      <>
        <Menu onStart={start} onRules={() => setRules(true)} />
        {rules && <Rules onClose={() => setRules(false)} />}
      </>
    );
  }

  return (
    <GameScreen
      key={`${screen.mode}-${screen.index}`}
      mode={screen.mode}
      puzzleIndex={screen.index}
      onExit={() => setScreen({ name: "menu" })}
      onOpenPuzzle={openPuzzle}
    />
  );
}
