/**
 * 宿泊のバブリを**単体で**開いたときの姿。
 *
 * OS の中に居るときと同じ泡・同じ一覧を、自分の海に出すだけ。
 */
import { useCallback, useMemo, useState } from 'react';
import HotelIcon from '@mui/icons-material/Hotel';
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
import { lodgingBubbleRoutes } from '@bublys-org/lodging-libs';

const menuItems: BublyMenuItem[] = [
  { label: '宿を探す', url: 'lodgings', icon: <HotelIcon /> },
];

const BACKDROP = 'hsl(265, 35%, 22%)';

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
  const [space, setSpace] = useState<BubbleSpaceApi | null>(null);
  const openUrl = useCallback((url: string) => { space?.openBubble(url, null); }, [space]);

  const bubbles = useMemo(
    () => ({ openBubble: (url: string) => space?.openBubble(url, null) ?? '' }),
    [space],
  );

  const sea = (
    <BubbleSea
      routes={lodgingBubbleRoutes}
      initialUrls={['lodgings']}
      onSpaceReady={setSpace}
      style={{ background: BACKDROP }}
    />
  );

  return (
    <BublyStoreProvider persistKey="lodging-standalone" initialBubbleUrls={['lodgings']}>
      <FocusedObjectProvider>
        <DomainRegistryProvider registry={DOMAIN}>
          <BubblesContext.Provider value={bubbles as never}>
            <BublyApp
              title="宿泊"
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
