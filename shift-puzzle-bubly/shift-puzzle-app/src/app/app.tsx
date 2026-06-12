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
import '@bublys-org/shift-puzzle-libs';

// ルート登録（app側で管理）
import { shiftPuzzleBubbleRoutes } from '../registration/index.js';

BubbleRouteRegistry.registerRoutes(shiftPuzzleBubbleRoutes);

// サイドバーのメニュー項目
const menuItems = [
  { label: '局員一覧', url: 'shift-puzzle/members', icon: <PeopleIcon /> },
  { label: 'タスク一覧', url: 'shift-puzzle/tasks', icon: <TaskIcon /> },
  { label: 'シフト表リスト', url: 'shift-puzzle/shift-plans', icon: <GridOnIcon /> },
];

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
        title="シフトパズル"
        subtitle="Standalone • Port 4005"
        menuItems={menuItems}
        backdropColor="hsl(20, 40%, 22%)"
      />
    </BublyStoreProvider>
  );
}

export default App;
