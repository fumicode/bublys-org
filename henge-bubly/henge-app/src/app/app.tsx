/**
 * 化のバブリを**単体で**開いたときの姿。
 *
 * ★ `enableWorldLine` を立てる。世界線（CAS）はここから供給される ──
 *   無いと `useCas must be used within a CasProvider` で真っ白になる。
 * ★ 住所は `/universe@<節>`（`makeSnapshotCodec("universe")`）。
 *   世界線の現在地をブラウザの url に書くための約束。
 */
import { useCallback, useMemo, useState } from 'react';
import TransformIcon from '@mui/icons-material/Transform';
import {
  BUBBLE_ARRANGEMENT_DOMAIN,
  BublyApp,
  BublyStoreProvider,
  BubblesContext,
  FocusedObjectProvider,
  makeSnapshotCodec,
  type BublyMenuItem,
} from '@bublys-org/bubbles-ui';
import type { DomainRegistry } from '@bublys-org/domain-registry';
import { SEA_ARRANGEMENT_DOMAIN, BubbleSea } from '@bublys-org/bubble-space-shell';
import type { BubbleSpaceApi } from '@bublys-org/bubble-layout-feature';
import { hengeBubbleRoutes, HengeGameProvider } from '@bublys-org/henge-libs';

const menuItems: BublyMenuItem[] = [
  { label: '化', url: 'henge/games', icon: <TransformIcon /> },
];

const BACKDROP = 'hsl(24, 18%, 14%)';

/** この空間が知っているドメインの型（配置そのものも世界線に載る） */
const DOMAIN: DomainRegistry = { ...BUBBLE_ARRANGEMENT_DOMAIN, ...SEA_ARRANGEMENT_DOMAIN };

const INITIAL_URLS = ['henge/games'];

export function App() {
  const [space, setSpace] = useState<BubbleSpaceApi | null>(null);
  const openUrl = useCallback((url: string) => { space?.openBubble(url, null); }, [space]);

  const bubbles = useMemo(
    () => ({ openBubble: (url: string) => space?.openBubble(url, null) ?? '' }),
    [space],
  );

  const sea = (
    <BubbleSea
      routes={hengeBubbleRoutes}
      initialUrls={INITIAL_URLS}
      onSpaceReady={setSpace}
      style={{ background: BACKDROP }}
    />
  );

  return (
    <BublyStoreProvider
      persistKey="henge-standalone"
      initialBubbleUrls={INITIAL_URLS}
      enableWorldLine
      domainRegistry={DOMAIN}
      urlBinding={makeSnapshotCodec('universe')}
    >
      <FocusedObjectProvider>
        <HengeGameProvider>
          <BubblesContext.Provider value={bubbles as never}>
            <BublyApp
              title="化"
              menuItems={menuItems}
              backdropColor={BACKDROP}
              sea={sea}
              onOpenUrl={openUrl}
            />
          </BubblesContext.Provider>
        </HengeGameProvider>
      </FocusedObjectProvider>
    </BublyStoreProvider>
  );
}

export default App;
