import PeopleIcon from '@mui/icons-material/People';
import TaskIcon from '@mui/icons-material/Task';
import GridOnIcon from '@mui/icons-material/GridOn';
import {
  BublyApp,
  BublyStoreProvider,
  BubbleRouteRegistry,
  BUBBLE_ARRANGEMENT_DOMAIN,
  makeSnapshotCodec,
} from '@bublys-org/bubbles-ui';

// shift-puzzle-libs のslicesをimport（自動注入される）
import '@bublys-org/event-shift-puzzle-libs';

// ルート登録（app側で管理）
import { shiftPuzzleBubbleRoutes } from '../registration/index.js';

/** 開けるものは**バブリが名乗る**（`bubly.ts`）── 単体でも OS の中でも同じ 1 つ */
import { menuItems } from "../bubly.js";

BubbleRouteRegistry.registerRoutes(shiftPuzzleBubbleRoutes);


export function App() {
  return (
    <BublyStoreProvider
      persistKey="shift-puzzle-standalone"
      initialBubbleUrls={['shift-puzzle/shift-plans', 'shift-puzzle/tasks']}
      enableWorldLine
      domainRegistry={BUBBLE_ARRANGEMENT_DOMAIN}
      urlBinding={makeSnapshotCodec('universe')}
    >
      <BublyApp
        title="イベントシフトパズル"
        subtitle="Standalone • Port 4005"
        menuItems={menuItems}
        backdropColor="hsl(20, 40%, 22%)"
      />
    </BublyStoreProvider>
  );
}

export default App;
