import {
  BublyApp,
  BublyStoreProvider,
  BubbleRouteRegistry,
  BUBBLE_ARRANGEMENT_DOMAIN,
  makeSnapshotCodec,
} from '@bublys-org/bubbles-ui';

// gakkai-shift-libs のslicesをimport（自動注入される）
import '@bublys-org/gakkai-shift-libs';

// ルート登録（app側で管理）
import { gakkaiShiftBubbleRoutes } from '../registration/index.js';

/** 開けるものは**バブリが名乗る**（`bubly.ts`）── 単体でも OS の中でも同じ 1 つ */
import { menuItems } from "../bubly";

BubbleRouteRegistry.registerRoutes(gakkaiShiftBubbleRoutes);


export function App() {
  return (
    <BublyStoreProvider
      persistKey="gakkai-shift-standalone"
      initialBubbleUrls={['gakkai-shift/staffs', 'gakkai-shift/shift-plans']}
      enableWorldLine
      domainRegistry={BUBBLE_ARRANGEMENT_DOMAIN}
      urlBinding={makeSnapshotCodec('universe')}
    >
      <BublyApp
        title="学会シフトパズル"
        subtitle="Standalone • Port 4001"
        menuItems={menuItems}
        backdropColor="hsl(210, 35%, 22%)"
      />
    </BublyStoreProvider>
  );
}

export default App;
