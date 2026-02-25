import PeopleIcon from '@mui/icons-material/People';
import EventNoteIcon from '@mui/icons-material/EventNote';
import { BublyApp, BublyStoreProvider, BubbleRouteRegistry } from '@bublys-org/bubbles-ui';

// shift-puzzle-libs のslicesをimport（自動注入される）
import '@bublys-org/shift-puzzle-libs';

// ルート登録（app側で管理）
import { shiftPuzzleBubbleRoutes } from '../registration/index.js';

BubbleRouteRegistry.registerRoutes(shiftPuzzleBubbleRoutes);

// サイドバーのメニュー項目
const menuItems = [
  { label: 'スタッフ一覧', url: 'shift-puzzle/staffs', icon: <PeopleIcon /> },
  { label: 'シフト配置表', url: 'shift-puzzle/shift-plans', icon: <EventNoteIcon /> },
];

export function App() {
  return (
    <BublyStoreProvider
      persistKey="shift-puzzle-standalone"
      initialBubbleUrls={['shift-puzzle/staffs', 'shift-puzzle/shift-plans']}
    >
      <BublyApp
        title="シフトパズル"
        subtitle="Standalone • Port 4001"
        menuItems={menuItems}
      />
    </BublyStoreProvider>
  );
}

export default App;
