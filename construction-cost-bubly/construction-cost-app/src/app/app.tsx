import {
  BublyApp,
  BublyStoreProvider,
  BubbleRouteRegistry,
  BUBBLE_ARRANGEMENT_DOMAIN,
  makeSnapshotCodec,
  type BublyMenuItem,
} from '@bublys-org/bubbles-ui';

// construction-cost-libs のslices等をimport（副作用で自動注入される）
import '@bublys-org/construction-cost-libs';

// ルート登録（app側で管理）
import { constructionCostBubbleRoutes } from '../registration/index.js';

BubbleRouteRegistry.registerRoutes(constructionCostBubbleRoutes);

// サイドバーのメニュー項目（ルートを追加したらここに対応エントリーを足す）
const menuItems: BublyMenuItem[] = [];

export function App() {
  return (
    <BublyStoreProvider
      persistKey="construction-cost-standalone"
      initialBubbleUrls={[]}
      enableWorldLine
      domainRegistry={BUBBLE_ARRANGEMENT_DOMAIN}
      urlBinding={makeSnapshotCodec('universe')}
    >
      <BublyApp
        title="Construction Cost"
        subtitle="Standalone • Port 4007"
        menuItems={menuItems}
        backdropColor="hsl(20, 40%, 22%)"
      />
    </BublyStoreProvider>
  );
}

export default App;
