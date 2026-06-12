import PeopleIcon from '@mui/icons-material/People';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ScheduleIcon from '@mui/icons-material/Schedule';
import {
  BublyApp,
  BublyStoreProvider,
  BubbleRouteRegistry,
  BUBBLE_ARRANGEMENT_DOMAIN,
  makeSnapshotCodec,
  type BublyMenuItem,
} from '@bublys-org/bubbles-ui';

// hotel-shift-puzzle-libs のslices等をimport（副作用で自動注入される）
import '@bublys-org/hotel-shift-puzzle-libs';

// ルート登録（app側で管理）
import { hotelShiftPuzzleBubbleRoutes } from '../registration/index.js';

BubbleRouteRegistry.registerRoutes(hotelShiftPuzzleBubbleRoutes);

// サイドバーのメニュー項目（ルートを追加したらここに対応エントリーを足す）
const menuItems: BublyMenuItem[] = [
  { label: 'スタッフ一覧', url: 'hotel-shift-puzzle/staffs', icon: <PeopleIcon /> },
  { label: '勤務帯', url: 'hotel-shift-puzzle/work-shifts', icon: <ScheduleIcon /> },
  { label: '勤務表', url: 'hotel-shift-puzzle/schedule', icon: <CalendarMonthIcon /> },
];

export function App() {
  return (
    <BublyStoreProvider
      persistKey="hotel-shift-puzzle-standalone"
      initialBubbleUrls={['hotel-shift-puzzle/schedule']}
      enableWorldLine
      domainRegistry={BUBBLE_ARRANGEMENT_DOMAIN}
      urlBinding={makeSnapshotCodec('universe')}
    >
      <BublyApp
        title="Hotel Shift Puzzle"
        subtitle="Standalone • Port 4005"
        menuItems={menuItems}
        backdropColor="hsl(20, 40%, 22%)"
      />
    </BublyStoreProvider>
  );
}

export default App;
