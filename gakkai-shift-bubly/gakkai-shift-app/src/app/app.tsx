import PeopleIcon from '@mui/icons-material/People';
import EventNoteIcon from '@mui/icons-material/EventNote';
import { BublyApp, BublyStoreProvider, BubbleRouteRegistry } from '@bublys-org/bubbles-ui';

// gakkai-shiftのルート登録（ライブラリimport時にslicesも自動注入される）
import { gakkaiShiftBubbleRoutes } from '@bublys-org/gakkai-shift-libs';

// gakkai-shiftのルートを登録
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
