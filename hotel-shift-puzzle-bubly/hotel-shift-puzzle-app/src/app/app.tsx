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

// hotel-shift-puzzle-libs のslicesをimport（自動注入される）
import '@bublys-org/hotel-shift-puzzle-libs';

// ルート登録（app側で管理）
import { hotelShiftPuzzleBubbleRoutes } from '../registration/index.js';

BubbleRouteRegistry.registerRoutes(hotelShiftPuzzleBubbleRoutes);

// サイドバーのメニュー項目
const menuItems = [
  { label: '局員一覧', url: 'hotel-shift-puzzle/members', icon: <PeopleIcon /> },
  { label: 'タスク一覧', url: 'hotel-shift-puzzle/tasks', icon: <TaskIcon /> },
  { label: 'シフト表リスト', url: 'hotel-shift-puzzle/shift-plans', icon: <GridOnIcon /> },
];

export function App() {
  return (
    <BublyStoreProvider
      persistKey="hotel-shift-puzzle-standalone"
      initialBubbleUrls={['hotel-shift-puzzle/shift-plans', 'hotel-shift-puzzle/tasks']}
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
