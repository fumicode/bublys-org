import { BublyApp, BublyStoreProvider, BubbleRouteRegistry, BUBBLE_ARRANGEMENT_DOMAIN, makeSnapshotCodec } from '@bublys-org/bubbles-ui';

// hotel-shift-puzzle-libs のslices等をimport（副作用で自動注入される）
import { useSampleWhenEmpty } from '@bublys-org/hotel-shift-puzzle-libs';

// ルート登録（app側で管理）
import { hotelShiftPuzzleBubbleRoutes, scheduleUrl } from '../registration/index.js';
import { MID_MONTH_SCHEDULE_ID } from '@bublys-org/hotel-shift-puzzle-libs';

/** 開けるものは**バブリが名乗る**（`bubly.ts`）── 単体でも OS の中でも同じ 1 つ */
import { menuItems } from "../bubly";

BubbleRouteRegistry.registerRoutes(hotelShiftPuzzleBubbleRoutes);

// サイドバーのメニュー項目（ルートを追加したらここに対応エントリーを足す）

/**
 * ★ **空で開かない。** 世界に何も無いときだけ、例データを入れてから見せる
 *   （`useSampleWhenEmpty` の註）。口を持たない部品なので、何も描かない。
 */
function SampleWhenEmpty() {
  useSampleWhenEmpty();
  return null;
}

export function App() {
  return (
    <BublyStoreProvider
      persistKey="hotel-shift-puzzle-standalone"
      /**
       * ★ **開いた瞬間に「表」が見えている。** 一覧だけだと、初めて来た人には
       *   「押す物が並んでいるページ」でしかない ── 何ができるアプリか、1 回押すまで分からない。
       *   例データのうち**作成途中の 8 月**（人が触っている状態）を一緒に開く。
       *   id は例データが持っている固定の値（`MID_MONTH_SCHEDULE_ID`）。
       */
      initialBubbleUrls={['hotel-shift-puzzle/schedules', scheduleUrl(MID_MONTH_SCHEDULE_ID)]}
      enableWorldLine
      domainRegistry={BUBBLE_ARRANGEMENT_DOMAIN}
      urlBinding={makeSnapshotCodec('universe')}
    >
      <SampleWhenEmpty />
      <BublyApp
        title="シフトントン"
        subtitle="旅館のシフトを、試しながら作る"
        menuItems={menuItems}
        backdropColor="hsl(20, 40%, 22%)"
      />
    </BublyStoreProvider>
  );
}

export default App;
