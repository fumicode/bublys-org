/**
 * スポットのバブリを**単体で**開いたときの姿。
 *
 * OS の中に居るときと同じ泡・同じ一覧を、自分の海に出すだけ。違うのは
 * 「海をどこに置くか」だけで、中身（`map-libs`）も海（`BubbleSea`）もひとつ。
 */
import { useCallback, useMemo, useState } from 'react';
import PlaceIcon from '@mui/icons-material/Place';
import MapIcon from '@mui/icons-material/Map';
import {
  BUBBLE_ARRANGEMENT_DOMAIN,
  BublyApp,
  BublyStoreProvider,
  BubblesContext,
  FocusedObjectProvider,
  type BublyMenuItem,
} from '@bublys-org/bubbles-ui';
import { DomainRegistryProvider, type DomainRegistry } from '@bublys-org/domain-registry';
import { SEA_ARRANGEMENT_DOMAIN } from '@bublys-org/bubble-space-shell';
import { BubbleSea } from '@bublys-org/bubble-space-shell';
import type { BubbleSpaceApi } from '@bublys-org/bubble-layout-feature';
import { mapBubbleRoutes } from '@bublys-org/map-libs';

/** 開く口。**バブリの定義（`bubly.ts`）と同じものを指す** */
const menuItems: BublyMenuItem[] = [
  { label: 'スポット一覧', url: 'spots', icon: <PlaceIcon /> },
  { label: '地図', url: 'map', icon: <MapIcon /> },
];

const BACKDROP = 'hsl(150, 40%, 20%)';

/**
 * **この空間が知っているドメインの型。**
 *
 * ★ 海は岸の姿を世界線へ記録する口を持っている（`useSeaWorldLine`）ので、
 *   記録しない場でも内容アドレスの置き場（CAS）は要る ── 無いと
 *   `useCas must be used within a CasProvider` で真っ白になる（実測で踏んだ）。
 * ★ 型を書いておく。書かないと推論された型が lib の中のファイルを名指しして、
 *   画面から出した瞬間に型検査が通らなくなる（TS2742）。
 */
const DOMAIN: DomainRegistry = { ...BUBBLE_ARRANGEMENT_DOMAIN, ...SEA_ARRANGEMENT_DOMAIN };

export function App() {
  /** 海の口。器（サイドバー）は海の外に居るので、押されたものをここへ通す */
  const [space, setSpace] = useState<BubbleSpaceApi | null>(null);
  const openUrl = useCallback((url: string) => { space?.openBubble(url, null); }, [space]);

  /** 海の中の泡が使う口も、同じ海へ向ける */
  const bubbles = useMemo(
    () => ({ openBubble: (url: string) => space?.openBubble(url, null) ?? '' }),
    [space],
  );

  const sea = (
    <BubbleSea
      routes={mapBubbleRoutes}
      initialUrls={['spots']}
      onSpaceReady={setSpace}
      style={{ background: BACKDROP }}
    />
  );

  return (
    <BublyStoreProvider persistKey="map-standalone" initialBubbleUrls={['spots']}>
      <FocusedObjectProvider>
        <DomainRegistryProvider registry={DOMAIN}>
          <BubblesContext.Provider value={bubbles as never}>
            <BublyApp
              title="スポット"
              menuItems={menuItems}
              backdropColor={BACKDROP}
              sea={sea}
              onOpenUrl={openUrl}
            />
          </BubblesContext.Provider>
        </DomainRegistryProvider>
      </FocusedObjectProvider>
    </BublyStoreProvider>
  );
}

export default App;
