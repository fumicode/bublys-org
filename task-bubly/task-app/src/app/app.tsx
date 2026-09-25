/**
 * タスクのバブリを**単体で**開いたときの姿。
 *
 * OS の中に居るときと同じ泡・同じ一覧を、自分の海に出すだけ。違うのは
 * 「海をどこに置くか」だけで、中身（`task-libs`）も海（`BubbleSea`）もひとつ。
 */
import { useCallback, useMemo, useState } from 'react';
import AssignmentIcon from '@mui/icons-material/Assignment';
import {
  BublyApp,
  BublyStoreProvider,
  BubblesContext,
  type BublyMenuItem,
} from '@bublys-org/bubbles-ui';
import { BubbleSea } from '@bublys-org/bubble-space-shell';
import type { BubbleSpaceApi } from '@bublys-org/bubble-layout-feature';
import { taskManagementBubbleRoutes } from '@bublys-org/task-libs';

/** 開く口。**バブリの定義（`bubly.ts`）と同じものを指す** */
const menuItems: BublyMenuItem[] = [
  { label: 'タスク一覧', url: 'task-management/tasks', icon: <AssignmentIcon /> },
];

const BACKDROP = 'hsl(140, 45%, 22%)';

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
      routes={taskManagementBubbleRoutes}
      initialUrls={['task-management/tasks']}
      onSpaceReady={setSpace}
      style={{ background: BACKDROP }}
    />
  );

  return (
    <BublyStoreProvider persistKey="task-standalone" initialBubbleUrls={['task-management/tasks']}>
      <BubblesContext.Provider value={bubbles as never}>
        <BublyApp
          title="タスク管理"
          subtitle="いま何処まで来ているか"
          menuItems={menuItems}
          backdropColor={BACKDROP}
          sea={sea}
          onOpenUrl={openUrl}
        />
      </BubblesContext.Provider>
    </BublyStoreProvider>
  );
}

export default App;
