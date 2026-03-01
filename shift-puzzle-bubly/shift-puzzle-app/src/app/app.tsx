import { BublyApp, BublyStoreProvider, BubbleRouteRegistry } from "@bublys-org/bubbles-ui";

// shift-puzzle-libs の slices を import（自動注入される）
import "@bublys-org/shift-puzzle-libs";

import { shiftPuzzleBubbleRoutes } from "../registration/index.js";

BubbleRouteRegistry.registerRoutes(shiftPuzzleBubbleRoutes);

const menuItems = [
  { label: "シフトパズル", url: "shift-puzzle/editor", icon: null },
];

export function App() {
  return (
    <BublyStoreProvider
      persistKey="shift-puzzle-standalone"
      initialBubbleUrls={["shift-puzzle/editor"]}
    >
      <BublyApp
        title="シフトパズル"
        subtitle="Standalone • Port 4003"
        menuItems={menuItems}
      />
    </BublyStoreProvider>
  );
}

export default App;
