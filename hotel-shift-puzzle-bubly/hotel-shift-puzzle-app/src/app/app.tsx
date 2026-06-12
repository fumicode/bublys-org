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
const menuItems: BublyMenuItem[] = [];

export function App() {
  return (
    <BublyStoreProvider
      persistKey="hotel-shift-puzzle-standalone"
      initialBubbleUrls={[]}
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
