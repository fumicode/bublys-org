import { BublyApp, BublyStoreProvider, BubbleRouteRegistry } from "@bublys-org/bubbles-ui";
import { getCurrentStore } from "@bublys-org/state-management";

// shift-puzzle-libs の slices を import（自動注入される）
import "@bublys-org/shift-puzzle-libs";

import { shiftPuzzleBubbleRoutes } from "../registration/index.js";

BubbleRouteRegistry.registerRoutes(shiftPuzzleBubbleRoutes);

/** 現在の Redux 状態から配置理由一覧 URL を動的生成 */
function getReasonsUrl(): string {
  const store = getCurrentStore();
  if (store) {
    const state = store.getState() as {
      shiftPuzzleMain?: { currentEventId: string | null; currentShiftPlanId: string | null };
    };
    const eventId = state.shiftPuzzleMain?.currentEventId;
    const planId = state.shiftPuzzleMain?.currentShiftPlanId;
    if (eventId && planId) {
      return `shift-puzzle/events/${eventId}/shift-plans/${planId}/reasons`;
    }
  }
  return "shift-puzzle/reasons";
}

/** 現在の Redux 状態からメンバー管理 URL を動的生成 */
function getMembersUrl(): string {
  const store = getCurrentStore();
  if (store) {
    const state = store.getState() as {
      shiftPuzzleMain?: { currentEventId: string | null };
    };
    const eventId = state.shiftPuzzleMain?.currentEventId;
    if (eventId) return `shift-puzzle/events/${eventId}/members`;
  }
  return "shift-puzzle/members";
}

const menuItems = [
  { label: "シフトパズル", url: "shift-puzzle/editor", icon: null },
  { label: "メンバー管理", url: getMembersUrl, icon: null },
  { label: "配置理由一覧", url: getReasonsUrl, icon: null },
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
