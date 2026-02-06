import PeopleIcon from '@mui/icons-material/People';
import EventNoteIcon from '@mui/icons-material/EventNote';
import { BublyApp, BublyStoreProvider, BubbleRouteRegistry } from '@bublys-org/bubbles-ui';

// gakkai-shift-libs のslicesをimport（自動注入される）
import '@bublys-org/gakkai-shift-libs';

// ルート登録（app側で管理）
import { gakkaiShiftBubbleRoutes } from '../registration/index.js';

BubbleRouteRegistry.registerRoutes(gakkaiShiftBubbleRoutes);

// サイドバーのメニュー項目
const menuItems = [
  { label: 'スタッフ一覧', url: 'gakkai-shift/staffs', icon: <PeopleIcon /> },
  { label: 'シフト配置表', url: 'gakkai-shift/shift-plans', icon: <EventNoteIcon /> },
];

export function App() {
  return (
    <BublyStoreProvider
      persistKey="gakkai-shift-standalone"
      initialBubbleUrls={['gakkai-shift/staffs', 'gakkai-shift/shift-plans']}
    >
      <BublyApp
        title="学会シフト管理"
        subtitle="Standalone • Port 4001"
        menuItems={menuItems}
      />
    </BublyStoreProvider>
  );
}

export default App;
