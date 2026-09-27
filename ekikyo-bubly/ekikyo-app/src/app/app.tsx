import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import {
  BublyApp,
  BublyStoreProvider,
  BubbleRouteRegistry,
  BUBBLE_ARRANGEMENT_DOMAIN,
  makeSnapshotCodec,
} from '@bublys-org/bubbles-ui';

// ルート登録（app側で管理）
import { ekikyoBubbleRoutes } from '../registration/index.js';

/** 開けるものは**バブリが名乗る**（`bubly.ts`）── 単体でも OS の中でも同じ 1 つ */
import { menuItems } from "../bubly.js";

BubbleRouteRegistry.registerRoutes(ekikyoBubbleRoutes);


export function App() {
  return (
    <BublyStoreProvider
      persistKey="ekikyo-standalone"
      initialBubbleUrls={['ekikyo/kyuseis/五黄']}
      enableWorldLine
      domainRegistry={BUBBLE_ARRANGEMENT_DOMAIN}
      urlBinding={makeSnapshotCodec('universe')}
    >
      <BublyApp
        title="易経 - 九星盤"
        subtitle="Standalone • Port 4002"
        menuItems={menuItems}
        backdropColor="hsl(355, 50%, 22%)"
      />
    </BublyStoreProvider>
  );
}

export default App;
