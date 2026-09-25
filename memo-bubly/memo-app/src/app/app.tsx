/**
 * メモのバブリを**単体で**開いたときの姿。
 *
 * OS の中に居るときと同じ泡・同じ一覧を、自分の海に出すだけ。
 *
 * ★ メモは 1 枚ごとに世界線を持つ（`memo:<id>` scope）ので、単体で開くときも
 *   世界線を立てる（`enableWorldLine`）。何を CAS に載せるかは `MEMO_DOMAIN` が言う。
 */
import { useCallback, useMemo, useState } from 'react';
import NoteIcon from '@mui/icons-material/Note';
import {
  BublyApp,
  BublyStoreProvider,
  BubblesContext,
  FocusedObjectProvider,
  BUBBLE_ARRANGEMENT_DOMAIN,
  makeSnapshotCodec,
  type BublyMenuItem,
} from '@bublys-org/bubbles-ui';
import { BubbleSea } from '@bublys-org/bubble-space-shell';
import type { BubbleSpaceApi } from '@bublys-org/bubble-layout-feature';
import { memoBubbleRoutes, MEMO_DOMAIN } from '@bublys-org/memo-libs';

/** 開く口。**バブリの定義（`bubly.ts`）と同じものを指す** */
const menuItems: BublyMenuItem[] = [
  { label: 'メモ一覧', url: 'memos', icon: <NoteIcon /> },
];

const BACKDROP = 'hsl(40, 55%, 26%)';

/** この海に載るもの ── 配置（世界線に乗せる）とメモ */
const DOMAIN = { ...BUBBLE_ARRANGEMENT_DOMAIN, ...MEMO_DOMAIN };

export function App() {
  /**
   * 海の口。**器（サイドバー）は海の外に居る**ので、押されたものをここへ通す
   * ── 通さないと、泡は見えない旧い海のほうに開く。
   */
  const [space, setSpace] = useState<BubbleSpaceApi | null>(null);
  const openUrl = useCallback((url: string) => { space?.openBubble(url, null); }, [space]);

  /** 海の中の泡が使う口（一覧の「＋新規」など）も、同じ海へ向ける */
  const bubbles = useMemo(
    () => ({ openBubble: (url: string) => space?.openBubble(url, null) ?? '' }),
    [space],
  );

  const sea = (
    <BubbleSea
      routes={memoBubbleRoutes}
      initialUrls={['memos']}
      onSpaceReady={setSpace}
      style={{ background: BACKDROP }}
    />
  );

  return (
    <BublyStoreProvider
      persistKey="memo-standalone"
      initialBubbleUrls={['memos']}
      enableWorldLine
      domainRegistry={DOMAIN}
      urlBinding={makeSnapshotCodec('universe')}
    >
      <FocusedObjectProvider>
        <BubblesContext.Provider value={bubbles as never}>
          <BublyApp
            title="メモ"
              menuItems={menuItems}
            backdropColor={BACKDROP}
            sea={sea}
            onOpenUrl={openUrl}
          />
        </BubblesContext.Provider>
      </FocusedObjectProvider>
    </BublyStoreProvider>
  );
}

export default App;
