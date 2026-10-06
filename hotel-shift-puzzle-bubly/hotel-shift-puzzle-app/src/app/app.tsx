import { BublyApp, BublyStoreProvider, BubbleRouteRegistry, BUBBLE_ARRANGEMENT_DOMAIN, makeSnapshotCodec, configureDepth } from '@bublys-org/bubbles-ui';

// hotel-shift-puzzle-libs のslices等をimport（副作用で自動注入される）
import { useSampleWhenEmpty } from '@bublys-org/hotel-shift-puzzle-libs';

// ルート登録（app側で管理）
import { hotelShiftPuzzleBubbleRoutes, scheduleUrl } from '../registration/index.js';
import { MID_MONTH_SCHEDULE_ID } from '@bublys-org/hotel-shift-puzzle-libs';

/** 開けるものは**バブリが名乗る**（`bubly.ts`）── 単体でも OS の中でも同じ 1 つ */
import { menuItems } from "../bubly";
import { useEffect } from 'react';
import { useAppDispatch, setLightweightMode } from '@bublys-org/state-management';

BubbleRouteRegistry.registerRoutes(hotelShiftPuzzleBubbleRoutes);

/**
 * ★ **奥へ行っても縮めない。** 勤務表は字が細かいので、縮むと読めなくなり、
 *   読めないから中身を省く（骨だけ）── が初めての人には「消えた」に見える。
 *   奥は重なり順だけで表す。縮めないので、骨だけにする処理もかからない（isTooSmallToRead）。
 */
configureDepth({ scaleDecayRate: 0 });

// サイドバーのメニュー項目（ルートを追加したらここに対応エントリーを足す）

/**
 * ★ **空で開かない。** 世界に何も無いときだけ、例データを入れてから見せる
 *   （`useSampleWhenEmpty` の註）。口を持たない部品なので、何も描かない。
 */
function SampleWhenEmpty() {
  useSampleWhenEmpty();
  return null;
}

/**
 * ★ **バブルは不透けで開く。** ガラスの透け・影・ぼかしは重いうえ、勤務表の文字が
 *   後ろのバブルと重なって読みにくい。軽量モード（単色・影なし）を初めから入れておく。
 *   `environment` は永続化しないので、開くたびにここで入れ直す。右下の「精」で戻せる。
 */
function LightweightByDefault() {
  const dispatch = useAppDispatch();
  useEffect(() => {
    dispatch(setLightweightMode(true));
  }, [dispatch]);
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
      <LightweightByDefault />
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
